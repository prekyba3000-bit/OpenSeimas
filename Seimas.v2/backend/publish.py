"""The one publish step (evaluation ARC-01).

Published views change here and nowhere else, and only after the data-quality
gate has cleared. Before this module there were six refreshers and the gate
guarded one: the API refreshed every 30 minutes in each worker, the MP and
amendment ingests refreshed mid-sync, an admin route refreshed on demand and a
dormant workflow would have too. So a block_publish failure held one path while
the other five published the figures it had just called wrong.

Callers: scripts/local-ops/refresh_stats.sh (every 30 minutes) and
POST /api/admin/refresh. tests/test_matview_refresh_paths.py fails if any other
production file issues a REFRESH.

    DB_DSN=... python -m backend.publish
"""
from __future__ import annotations

import datetime
import os
import sys
from typing import Optional

import psycopg2

from scripts import dq_check_runner

# Order matters: mp_leaderboard_metrics reads mp_stats_summary. Literal SQL on
# purpose, so the static refresh-path guard can read which views are published.
# CONCURRENTLY keeps reads unblocked; every view has the required unique index.
PUBLISH_STEPS = (
    ("mp_stats_summary", "REFRESH MATERIALIZED VIEW CONCURRENTLY mp_stats_summary"),
    ("mp_leaderboard_metrics", "REFRESH MATERIALIZED VIEW CONCURRENTLY mp_leaderboard_metrics"),
    ("mp_attendance_v2", "REFRESH MATERIALIZED VIEW CONCURRENTLY mp_attendance_v2"),
    # faction_alignment is counted from faction_alignment_votes (migration 059),
    # so the votes go first and the figure is computed from that same snapshot.
    ("faction_alignment_votes", "REFRESH MATERIALIZED VIEW CONCURRENTLY faction_alignment_votes"),
    ("faction_alignment", "REFRESH MATERIALIZED VIEW CONCURRENTLY faction_alignment"),
)


def _record(cur, view: str, job_id: str, started, error: Optional[str] = None) -> None:
    # /api/meta/freshness reads these rows; it reports what was published, when.
    cur.execute(
        """
        INSERT INTO source_fetches
            (source_name, source_url, job_id, status, rows_affected,
             error, started_at, finished_at)
        VALUES (%s, NULL, %s, %s, NULL, %s, %s, now())
        """,
        (f"matview:{view}", job_id, "error" if error else "ok", error, started),
    )


def publish(dsn: Optional[str] = None, job_id: str = "refresh_stats.sh") -> dict:
    """Run the gate, then refresh every published view. Never refreshes on HOLD.

    Gate outcomes (dq_check_runner exit codes):
      0 clear       -> refresh
      1 blocking    -> HOLD: refresh nothing, last-good views stay served
      2 unavailable -> refresh anyway: the dq_checks table is not installed in
                       this database. Treating "not installed" as blocking froze
                       nothing in production only because it was caught first.
    """
    dsn = dsn or os.environ.get("DB_DSN")
    if not dsn:
        return {"status": "error", "error": "DB_DSN not set"}

    gate = dq_check_runner.main(["--gate"], dsn=dsn)
    if gate == 1:
        return {"status": "held", "refreshed": []}

    refreshed = []
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            for view, sql in PUBLISH_STEPS:
                cur.execute("SELECT ispopulated FROM pg_matviews WHERE schemaname = 'public' "
                            "AND matviewname = %s", (view,))
                row = cur.fetchone()
                if row is None:
                    continue
                # A view created WITH NO DATA cannot be refreshed CONCURRENTLY; its
                # first fill is a plain refresh (it serves nothing to block yet).
                statement = sql if row[0] else sql.replace(" CONCURRENTLY", "")
                started = datetime.datetime.now(datetime.timezone.utc)
                try:
                    cur.execute(statement)
                except Exception as exc:
                    _record(cur, view, job_id, started, f"{type(exc).__name__}: {exc}"[:2000])
                    raise
                _record(cur, view, job_id, started)
                refreshed.append(view)
    finally:
        conn.close()
    return {"status": "published", "gate": "clear" if gate == 0 else "unavailable",
            "refreshed": refreshed}


if __name__ == "__main__":
    result = publish()
    stamp = datetime.datetime.now().isoformat(timespec="seconds")
    if result["status"] == "held":
        print(f"[{stamp}] publish HELD — blocking data-quality failure; last-good views stay served")
    elif result["status"] == "published":
        note = "" if result["gate"] == "clear" else " (dq gate unavailable — checks not installed here)"
        print(f"[{stamp}] published: {', '.join(result['refreshed'])}{note}")
    else:
        print(f"[{stamp}] publish failed: {result['error']}", file=sys.stderr)
        sys.exit(1)
