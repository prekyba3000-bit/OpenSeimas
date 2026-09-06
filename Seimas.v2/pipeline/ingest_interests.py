"""Fill `interests` from VRK's private-interest candidate declarations.

Source: `rezultatai.vrk.lt/.../KandidatasPrivInterDekl_rkndId-{vrk_candidate_id}.html`
— a legally required 2024 candidacy filing, distinct from VTEK's protected
ongoing register (see `docs/reviews/empty-tables-audit-2026-09-06.md`).
Verified live 2026-09-06, both domains' `robots.txt` disallow nothing on this
path.

Needs `politicians.vrk_candidate_id`, filled by `pipeline.link_vrk` — run that
first. 2 of 148 (Sinkevičius, Targamadzė) had no VRK id to run for this reason
either way, unrelated to this script.

## Page shape

Each declared relationship is one `<table class="tableKand">`: a one-cell
header row naming the TYPE ("Darbovietė", "Ryšys", "Ryšys sudarius sandorį"),
then key/value rows. A preceding `<h4 class="pid-table-title">` names whose
relationship it is — the declarant's own, or their spouse's/partner's — and
applies to every table until the next such heading.

`interest_type` and `description` are built to match what
`migrations/013_procurement_contracts.sql`'s `mp_supplier_links` view already
expects: `description` is `json.dumps({type: {...}}, ensure_ascii=True)`, and
the view finds its `mp_role` by searching for the JSON-escaped type name as a
substring. That view was built and has never had a row to show, because
`organization_code` has been NULL on every row of an empty table.

`organization_code` is NULL for entities with no Lithuanian legal-entity code
— mostly foreign employers — matching the column's own documented meaning
(migration 012), not a parsing failure.

`declarant_relation` ("self" or "spouse") is written both inside `description`
and, since migration 043, as its own column — a fact worth distinguishing at
all is a fact worth querying directly rather than only recoverable by parsing
JSON. `mp_supplier_links` surfaces it per row, because a contract linked
through an MP's own declared employer and one linked only through their
spouse's are different facts a reader needs to be able to tell apart; neither
is evidence of anything on its own, and this project does not compute one
into a "conflict of interest" score for either the member or their spouse —
the spouse is a private individual with no public role to hold to account.

    .venv/bin/python -m pipeline.ingest_interests           # write
    .venv/bin/python -m pipeline.ingest_interests --dry-run # report only
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import psycopg2
from bs4 import BeautifulSoup
from psycopg2.extras import RealDictCursor, execute_values

from utils import fetch_with_retry

DB_DSN = os.getenv("DB_DSN")
BASE_URL = (
    "https://rezultatai.vrk.lt/statiniai/puslapiai/rinkimai/1544/rnk1870/"
    "kandidatai/KandidatasPrivInterDekl_rkndId-{vrk_id}.html"
)

# Section headings that mean "these tables are the declarant's own", vs the
# one that means "these are the spouse's/partner's". Recorded in the parsed
# row (not in the schema, which has no such column) as declarant_relation.
_SPOUSE_HEADINGS = {"Sutuoktinio darbovietės", "Sutuoktinio ryšiai su juridiniais asmenimis"}

# Field names the source uses for an organisation's name/code, which differ
# between a "Darbovietė" table and a "Ryšys" table.
_NAME_KEYS = ("Pavadinimas", "Juridinio asmens pavadinimas")
_CODE_KEYS = ("Juridinio asmens kodas",)
_ROLE_KEYS = ("Pareigos", "Ryšio pobūdis", "Pareigų pobūdis")
_START_KEYS = ("Ryšio pradžios data",)


def parse_declaration(html: bytes) -> list[dict]:
    """Every declared relationship on one candidate's interest page."""
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    relation = "self"

    for el in soup.find_all(["h4", "table"]):
        if el.name == "h4":
            heading = el.get_text(strip=True)
            if heading:
                relation = "spouse" if heading in _SPOUSE_HEADINGS else "self"
            continue

        if "tableKand" not in (el.get("class") or []):
            continue
        trs = el.find_all("tr")
        if not trs:
            continue
        entry_type = trs[0].get_text(strip=True)
        if not entry_type:
            continue

        kv: dict[str, str] = {}
        for tr in trs[1:]:
            cells = tr.find_all("td")
            if len(cells) >= 2:
                kv[cells[0].get_text(strip=True)] = cells[1].get_text(strip=True)

        def first(keys):
            for k in keys:
                if kv.get(k):
                    return kv[k]
            return None

        rows.append(
            {
                "type": entry_type,
                "declarant_relation": relation,
                "org_name": first(_NAME_KEYS),
                "org_code": first(_CODE_KEYS),
                "role": first(_ROLE_KEYS),
                "start_date": first(_START_KEYS),
                "fields": kv,
            }
        )
    return rows


def fetch_declaration(vrk_id: str) -> list[dict]:
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

    total_rows = 0
    total_with_code = 0
    failures = []
    per_politician: dict[str, list[dict]] = {}

    for i, p in enumerate(politicians, 1):
        try:
            rows = fetch_declaration(p["vrk_candidate_id"])
        except Exception as exc:  # noqa: BLE001 — one bad fetch must not stop the run
            failures.append((p["display_name"], repr(exc)))
            continue
        per_politician[str(p["id"])] = rows
        total_rows += len(rows)
        total_with_code += sum(1 for r in rows if r["org_code"])
        if i % 25 == 0:
            print(f"  fetched {i}/{len(politicians)}...", flush=True)
        time.sleep(0.3)

    print(f"relationships found: {total_rows}")
    print(f"  with an organisation code: {total_with_code}")
    print(f"fetch failures: {len(failures)}")
    for name, err in failures[:10]:
        print(f"    {name}: {err}")

    if dry_run:
        print("\n--dry-run: nothing written")
        return 0

    to_insert = []
    for pid, rows in per_politician.items():
        for r in rows:
            payload = dict(r["fields"])
            payload["declarant_relation"] = r["declarant_relation"]
            description = json.dumps({r["type"]: payload}, ensure_ascii=True)
            to_insert.append(
                (
                    pid,
                    r["type"],
                    description,
                    r["org_name"],
                    r["org_code"],
                    r["org_name"],
                    r["declarant_relation"],
                )
            )

    # Full replace per run: declarations are a point-in-time filing, not an
    # append-only log, and the table has no natural key to upsert against.
    cur.execute(
        "DELETE FROM interests WHERE politician_id = ANY(%s::uuid[])",
        (list(per_politician.keys()),),
    )
    if to_insert:
        execute_values(
            cur,
            """
            INSERT INTO interests
                (politician_id, interest_type, description, organization_name,
                 organization_code, parsed_organization_name, declarant_relation)
            VALUES %s
            """,
            to_insert,
        )
    conn.commit()
    print(f"\nwrote {len(to_insert)} rows to interests")

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
