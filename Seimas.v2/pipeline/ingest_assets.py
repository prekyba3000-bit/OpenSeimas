"""Fill `assets` from VRK's candidate asset/income declarations.

Same source family as `ingest_interests.py`:
`rezultatai.vrk.lt/.../KandidatasTurtoPajDekl_rkndId-{vrk_candidate_id}.html`.
Needs `politicians.vrk_candidate_id` — run `pipeline.link_vrk` first.

The previous version of this script targeted a table, `mp_assets`, that does
not exist in `schema.sql` (only `assets` does) — it would have failed on its
first INSERT if it had ever been run, and separately had nothing to iterate
over since `vrk_candidate_id` was never populated. Both are fixed upstream now.

## `total_value` is one figure, not a sum of everything on the page

The declaration reports five distinct categories plus two income figures:
registrable assets, securities, cash, loans GRANTED (money owed *to* the
declarant — an asset), loans RECEIVED (a liability), and declared income.
Summing them into one "total_value" would blend an asset with a liability and
invent a number that doesn't correspond to any figure the source actually
states — exactly the kind of computed total charter §1.1 forbids. `total_value`
is set to the declaration's own headline category, "I. Privalomas registruoti
turtas" (mandatory-registrable assets), and left NULL when that line is
genuinely absent rather than zero. Every category is preserved untouched in
`raw_json`, which the schema already documents as "the full raw line for
audit" — nothing here is more assumption than that column already asked for.

    .venv/bin/python -m pipeline.ingest_assets           # write
    .venv/bin/python -m pipeline.ingest_assets --dry-run # report only
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time

import psycopg2
from bs4 import BeautifulSoup
from psycopg2.extras import RealDictCursor, execute_values

from utils import fetch_with_retry

DB_DSN = os.getenv("DB_DSN")
BASE_URL = (
    "https://rezultatai.vrk.lt/statiniai/puslapiai/rinkimai/1544/rnk1870/"
    "kandidatai/KandidatasTurtoPajDekl_rkndId-{vrk_id}.html"
)

# The declaration's own category labels, verbatim, mapped to a stable key for
# raw_json. "I." is the one used for total_value; see module docstring.
_CATEGORIES = {
    "I. Privalomas registruoti turtas": "mandatory_assets",
    "II. Vertybiniai popieriai, meno kūriniai, juvelyriniai dirbiniai": "securities",
    "III. Piniginės lėšos": "cash",
    "IV. Suteiktos paskolos": "loans_granted",
    "V. Gautos paskolos": "loans_received",
}
_INCOME_LABEL = "Deklaruota apmokestinamųjų ir neapmokestinamųjų pajamų suma"


# Label and figure sit in the SAME <td>, concatenated with no separator:
# "I. Privalomas registruoti turtas280100 EUR". The figure is a run of
# digits (optionally with a decimal comma) immediately followed by " EUR"
# at the end of the cell.
_TRAILING_AMOUNT = re.compile(r"([\d\s]+(?:,\d+)?)\s*EUR\s*$")


def _amount_after_label(cell_text: str, label: str) -> float | None:
    if not cell_text.startswith(label):
        return None
    match = _TRAILING_AMOUNT.search(cell_text)
    if not match:
        return None
    cleaned = match.group(1).replace(" ", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_declaration(html: bytes) -> dict | None:
    """The declared year plus every category on the page, or None if empty."""
    soup = BeautifulSoup(html, "html.parser")
    raw: dict[str, float | None] = {}
    year = None

    for cell in soup.find_all("td"):
        text = cell.get_text(strip=True)
        for label, key in _CATEGORIES.items():
            amount = _amount_after_label(text, label)
            if amount is not None:
                raw[key] = amount
        income = _amount_after_label(text, _INCOME_LABEL)
        if income is not None:
            raw["declared_income_eur"] = income
        match = re.search(r"\((\d{4})\s*m\.\)", text)
        if match:
            year = int(match.group(1))

    if not raw:
        return None
    return {"year": year, "raw": raw, "total_value": raw.get("mandatory_assets")}


def fetch_declaration(vrk_id: str) -> dict | None:
    resp = fetch_with_retry(BASE_URL.format(vrk_id=vrk_id), timeout=30)
    return parse_declaration(resp.content)


def run(dry_run: bool = False) -> int:
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        "SELECT id, display_name, vrk_candidate_id FROM politicians "
        "WHERE vrk_candidate_id IS NOT NULL ORDER BY display_name"
    )
    politicians = cur.fetchall()
    print(f"politicians with a VRK id: {len(politicians)}")

    failures = []
    empty = []
    to_insert = []

    for i, p in enumerate(politicians, 1):
        try:
            parsed = fetch_declaration(p["vrk_candidate_id"])
        except Exception as exc:  # noqa: BLE001 — one bad fetch must not stop the run
            failures.append((p["display_name"], repr(exc)))
            continue
        if not parsed:
            empty.append(p["display_name"])
            continue
        source_url = BASE_URL.format(vrk_id=p["vrk_candidate_id"])
        to_insert.append(
            (
                str(p["id"]),
                parsed["year"] or 2023,
                parsed["total_value"],
                source_url,
                json.dumps(parsed["raw"], ensure_ascii=True),
            )
        )
        if i % 25 == 0:
            print(f"  fetched {i}/{len(politicians)}...", flush=True)
        time.sleep(0.3)

    print(f"declarations parsed: {len(to_insert)}")
    print(f"  with a mandatory-assets figure: {sum(1 for r in to_insert if r[2] is not None)}")
    print(f"no declaration content found: {len(empty)}")
    print(f"fetch failures: {len(failures)}")
    for name, err in failures[:10]:
        print(f"    {name}: {err}")

    if dry_run:
        print("\n--dry-run: nothing written")
        return 0

    politician_ids = [row[0] for row in to_insert]
    cur.execute(
        "DELETE FROM assets WHERE politician_id = ANY(%s::uuid[])", (politician_ids,)
    )
    if to_insert:
        execute_values(
            cur,
            """
            INSERT INTO assets
                (politician_id, year, total_value, source_url, raw_json)
            VALUES %s
            """,
            to_insert,
        )
    conn.commit()
    print(f"\nwrote {len(to_insert)} rows to assets")

    cur.close()
    conn.close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    return run(dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
