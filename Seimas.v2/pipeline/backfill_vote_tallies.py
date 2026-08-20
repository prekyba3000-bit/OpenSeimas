"""Backfill vote tallies from the LRS protocol totals.

WHY THIS EXISTS
---------------
`ingest_votes_v2` fetched <BendriBalsavimoRezultatai> for every vote and read
exactly one attribute off it (`komentaras`). The other six — už, prieš,
susilaikė, balsavo, viso, balsavimo_laikas — were parsed and thrown away, on all
5,279 votes. The ingest now stores them, but only for votes it processes from
here on; this script recovers the history.

It re-fetches one XML document per vote, so it is the slow, polite kind of job:
rate-limited, resumable, and safe to run repeatedly.

WHAT IT DOES NOT DO
-------------------
It does not write `result_type`. The source publishes no pass/fail field, and
inferring one from `už > prieš` would be a guess wearing the clothes of a
record. See migration 022.

USAGE
-----
    python -m pipeline.backfill_vote_tallies --dry-run        # fetch 5, write nothing
    python -m pipeline.backfill_vote_tallies --limit 50       # small real batch
    python -m pipeline.backfill_vote_tallies                  # full run, resumable

Resumability: it selects only votes whose tallies are still NULL, so an
interrupted run continues where it stopped simply by being started again.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time

import psycopg2
from psycopg2 import extras

from pipeline.common import record_fetch
from pipeline.ingest_votes_v2 import BASE_URL, _parse_tallies, fetch_xml

log = logging.getLogger("pipeline.backfill_tallies")

# The LRS endpoint is a public service run for everyone; a backfill has no
# deadline and should not behave like a load test.
DELAY_SECONDS = 0.35
PROGRESS_EVERY = 25


def _connect():
    dsn = os.environ.get("DB_DSN")
    if not dsn:
        sys.exit("DB_DSN not set — source ~/.config/openseimas/prod.env")
    return psycopg2.connect(dsn)


def pending_votes(cur, limit=None):
    """Votes still missing tallies, newest first so early progress is visible."""
    cur.execute(
        f"""
        SELECT seimas_vote_id
        FROM votes
        WHERE votes_for IS NULL
        ORDER BY sitting_date DESC NULLS LAST
        {"LIMIT %s" if limit else ""}
        """,
        (limit,) if limit else (),
    )
    return [r[0] for r in cur.fetchall()]


def backfill(limit=None, dry_run=False, delay=DELAY_SECONDS):
    conn = _connect()
    cur = conn.cursor()

    todo = pending_votes(cur, limit)
    cur.execute("SELECT count(*) FROM votes")
    total_votes = cur.fetchone()[0]
    log.info("votes total=%s missing tallies=%s", total_votes, len(todo))
    if not todo:
        log.info("nothing to do — every vote already carries tallies")
        return 0

    if dry_run:
        todo = todo[:5]
        log.info("DRY RUN — fetching %s votes, writing nothing", len(todo))

    updated = skipped = failed = 0
    started = time.time()

    with record_fetch(conn, "lrs_vote_tallies_backfill", f"{BASE_URL}.ad_sp_balsavimo_rezultatai") as fetch:
        for i, vid in enumerate(todo, 1):
            try:
                xml = fetch_xml(f"{BASE_URL}.ad_sp_balsavimo_rezultatai?balsavimo_id={vid}")
                totals = xml.find(".//BendriBalsavimoRezultatai") if xml is not None else None
                t = _parse_tallies(totals)
            except Exception as exc:  # one bad document must not end the run
                failed += 1
                log.warning("vote %s fetch/parse failed: %s", vid, exc)
                time.sleep(delay)
                continue

            if t["votes_for"] is None:
                # The element was absent or carried no numbers. Recorded as
                # skipped rather than written as zeros.
                skipped += 1
            elif not dry_run:
                cur.execute(
                    """
                    UPDATE votes SET
                        votes_for = %s, votes_against = %s, votes_abstained = %s,
                        votes_participated = %s, seats_eligible = %s, voted_at = %s
                    WHERE seimas_vote_id = %s
                    """,
                    (t["votes_for"], t["votes_against"], t["votes_abstained"],
                     t["votes_participated"], t["seats_eligible"], t["voted_at"], vid),
                )
                updated += 1
            else:
                updated += 1  # counted, not written

            if i % PROGRESS_EVERY == 0:
                if not dry_run:
                    conn.commit()
                rate = i / max(time.time() - started, 1e-6)
                eta = (len(todo) - i) / rate if rate else 0
                log.info(
                    "%s/%s  updated=%s skipped=%s failed=%s  %.1f/s  eta %.0f min",
                    i, len(todo), updated, skipped, failed, rate, eta / 60,
                )
            time.sleep(delay)

        if not dry_run:
            conn.commit()
        fetch["rows"] = updated

    log.info(
        "done in %.1f min — updated=%s skipped(no tallies)=%s failed=%s",
        (time.time() - started) / 60, updated, skipped, failed,
    )
    conn.close()
    return updated


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, help="process at most N votes")
    ap.add_argument("--dry-run", action="store_true", help="fetch 5 votes, write nothing")
    ap.add_argument("--delay", type=float, default=DELAY_SECONDS, help="seconds between fetches")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        stream=sys.stdout,
    )
    backfill(limit=args.limit, dry_run=args.dry_run, delay=args.delay)


if __name__ == "__main__":
    main()
