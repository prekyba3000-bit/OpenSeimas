"""Fill how each member was elected: single-mandate district, or party list.

This is what makes „Mano Seimo narys" possible — a reader in Telšiai can be
shown the member who actually won Telšiai, rather than a list of 141 strangers.

## Why this no longer reads the Rezultatai dataset

The previous version fetched
`atviriduomenys.vrk.lt/datasets/gov/vrk/Rezultatai` and aggregated per-polling-
station vote counts. Verified 2026-09-06: that dataset returns `{"_data":[]}` —
**registered and empty**, with or without any filter. Same pattern the source
map already recorded for `lrsk/balsavimai`: a schema published is not a dataset
delivered. Its sibling `Isrinkti` (elected members) is empty too. So the script
had never produced a row, which is why all 148 politicians had NULL
constituency data.

`Kandidatai` in the same catalogue *does* carry data and joins cleanly on
`rink_kandidato_id` = our `vrk_candidate_id`. It is not used here, and the
reason matters: its `apyg_nr` is the district a candidate **ran in**, not the
one they won. Saulius Skvernelis ran in Lazdynų (Nr. 9) and was elected off the
party list; filing him as "Lazdynų's member" would be a false statement about a
named person, and would also hide whoever actually won that seat.

## The source used instead

Each candidate's VRK page states the outcome in one line:

    Išrinktas vienmandatėje Kaišiadorių–Elektrėnų (Nr. 59) apygardoje II ture
    Išrinkta pagal sąrašą

The first names the district actually won. The second says the member holds no
district at all. A page with neither line is a member who did not enter through
the 2024 election — a replacement who took a vacated seat — and is left NULL
rather than guessed at.

## What is deliberately not written

`vote_share` stays NULL. The only source for vote counts was the empty
Rezultatai dataset, so there is no per-candidate figure to store. The previous
version would have written a member's own district vote share for
single-mandate winners and their **party's national list share** for everyone
else — two different facts in one column, rendered identically, which is the
exact defect migration 039 had to undo for `current_party`. A party's number is
not a person's number, and there is no honest way to put both under one name.

    .venv/bin/python -m pipeline.ingest_vrk_results           # write
    .venv/bin/python -m pipeline.ingest_vrk_results --dry-run # report only
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time

import psycopg2
from bs4 import BeautifulSoup
from psycopg2.extras import RealDictCursor, execute_values

from utils import fetch_with_retry

DB_DSN = os.getenv("DB_DSN")
ANKETA_URL = (
    "https://rezultatai.vrk.lt/statiniai/puslapiai/rinkimai/1544/rnk1870/"
    "kandidatai/KandidatasAnketa_rkndId-{vrk_id}.html"
)
# 2024 Seimas election, first round — the id this project already records.
VRK_ELECTION_ID = 2150

# „Išrinktas vienmandatėje <name> (Nr. <n>) apygardoje <round> ture".
# The name is non-greedy and may contain an en dash („Kaišiadorių–Elektrėnų")
# or a space („Panevėžio vakarinė"), so it is bounded by the bracketed number
# rather than by whitespace.
_DISTRICT = re.compile(
    r"I[šs]rinkt\w*\s+vienmandat[ėe]je\s+(.+?)\s*\(Nr\.\s*(\d+)\)\s*apygardoje",
    re.IGNORECASE,
)
_PARTY_LIST = re.compile(
    r"I[šs]rinkt\w*\s+pagal\s+s[ąa]ra[šs][ąa]", re.IGNORECASE
)


def parse_election_outcome(html: bytes) -> dict | None:
    """How this candidate entered the Seimas, or None if the page says nothing.

    None is not a parse failure — a member who took a vacated seat mid-term was
    never elected in 2024 and correctly has no outcome to record.
    """
    text = BeautifulSoup(html, "html.parser").get_text(" | ", strip=True)

    match = _DISTRICT.search(text)
    if match:
        return {
            "election_type": "single_mandate",
            "constituency_name": match.group(1).strip(),
            "constituency_number": int(match.group(2)),
        }
    if _PARTY_LIST.search(text):
        return {
            "election_type": "multimandate",
            "constituency_name": None,
            "constituency_number": None,
        }
    return None


def fetch_outcome(vrk_id: str) -> dict | None:
    resp = fetch_with_retry(ANKETA_URL.format(vrk_id=vrk_id), timeout=30)
    return parse_election_outcome(resp.content)


def run(dry_run: bool = False) -> int:
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    # Every linked member, not only the currently active ones: which district a
    # member won in 2024 is a fixed historical fact, and a former member who
    # held a seat is still the answer to "who represented this district".
    cur.execute(
        "SELECT id, display_name, vrk_candidate_id FROM politicians "
        "WHERE vrk_candidate_id IS NOT NULL ORDER BY display_name"
    )
    politicians = cur.fetchall()
    print(f"politicians with a VRK id: {len(politicians)}")

    to_write = []
    no_outcome = []
    failures = []

    for i, p in enumerate(politicians, 1):
        try:
            outcome = fetch_outcome(p["vrk_candidate_id"])
        except Exception as exc:  # noqa: BLE001 — one bad fetch must not stop the run
            failures.append((p["display_name"], repr(exc)))
            continue
        if outcome is None:
            no_outcome.append(p["display_name"])
            continue
        to_write.append(
            (
                str(p["id"]),
                outcome["election_type"],
                outcome["constituency_number"],
                outcome["constituency_name"],
                VRK_ELECTION_ID,
            )
        )
        if i % 25 == 0:
            print(f"  fetched {i}/{len(politicians)}...", flush=True)
        time.sleep(0.3)

    single = sum(1 for r in to_write if r[1] == "single_mandate")
    party = sum(1 for r in to_write if r[1] == "multimandate")
    print(f"single-mandate district winners: {single}")
    print(f"elected from a party list      : {party}")
    print(f"no 2024 outcome on the page    : {len(no_outcome)} {no_outcome[:6]}")
    print(f"fetch failures                 : {len(failures)}")
    for name, err in failures[:10]:
        print(f"    {name}: {err}")

    if dry_run:
        print("\n--dry-run: nothing written")
        return 0

    execute_values(
        cur,
        """
        UPDATE politicians AS p SET
            election_type = d.election_type,
            constituency_number = d.constituency_number,
            constituency_name = d.constituency_name,
            vrk_election_id = d.vrk_election_id
        FROM (VALUES %s) AS d(id, election_type, constituency_number,
                              constituency_name, vrk_election_id)
        WHERE p.id = d.id::uuid
        """,
        to_write,
        template="(%s, %s, %s::integer, %s, %s::integer)",
    )
    conn.commit()

    cur.execute(
        "SELECT count(constituency_number) AS districts, "
        "count(election_type) AS typed FROM politicians"
    )
    row = cur.fetchone()
    print(f"\nwrote {len(to_write)} outcomes")
    print(f"  politicians with a district : {row['districts']}")
    print(f"  politicians with a type     : {row['typed']}")

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
