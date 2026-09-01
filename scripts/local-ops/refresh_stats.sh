#!/usr/bin/env bash
# Materialized view refresh (local stand-in for .github/workflows/refresh_db.yml).
# Scheduled by openseimas-refresh.timer (every 30 min, Persistent=false).
#
# No catch-up: the refresh recomputes from current table state, so a missed
# window is repaired by the next ordinary run — replaying skipped slots would
# do identical work N times.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

JOB=refresh
trap 'ops_trap_fail '"$JOB" ERR

ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { ops_fail "$JOB" "missing $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a
cd "$HOME/Documents/OpenSeimas/Seimas.v2"

# Publish gate: if a block_publish check is failing, do not refresh. The views
# keep serving the last-good data rather than materialising something a check
# has just called wrong. An unknown check counts as blocking — a check that
# could not run has not cleared anything.
# Exit codes are distinguished on purpose:
#   0 — clear, refresh
#   1 — a block_publish check failed: HOLD, keep serving last-good views
#   2 — the runner could not run at all (dq_checks not installed here yet):
#       warn and proceed. Treating "not installed" as "blocking" would have
#       frozen every matview refresh in production the moment this shipped,
#       including mp_attendance_v2, two days before attendance v2 takes effect.
if [ -f scripts/dq_check_runner.py ]; then
  # An `if` condition is the form exempt from both errexit and the ERR trap.
  # `set +e` alone is not: the trap still fired and killed the job, which would
  # have stopped every matview refresh rather than gating one publish.
  if .venv/bin/python scripts/dq_check_runner.py --gate; then
    gate_rc=0
  else
    gate_rc=$?
  fi
  case "$gate_rc" in
    0) ;;
    1) echo "[$(date -Is)] refresh HELD — blocking data-quality failure; last-good views stay served"
       exit 0 ;;
    *) echo "[$(date -Is)] dq gate unavailable (rc=$gate_rc) — refreshing anyway, checks not installed here" ;;
  esac
fi

.venv/bin/python - << 'EOF'
import os, psycopg2, datetime
conn = psycopg2.connect(os.environ["DB_DSN"])
conn.autocommit = True

# Record each refresh in source_fetches. /api/meta/freshness used to report
# core._refresh_state, an in-process dict in the API server — but refreshes
# happen here, in a separate local process that never touches that memory, so
# the endpoint published "refresh_count: 0" while this ran every 30 minutes.
# A freshness endpoint that reports its own uptime instead of the data's age is
# worse than none: it is confidently wrong about the one thing it exists to say.
def refreshed(cur, view, started, error=None):
    cur.execute(
        """
        INSERT INTO source_fetches
            (source_name, source_url, job_id, status, rows_affected,
             error, started_at, finished_at)
        VALUES (%s, NULL, 'refresh_stats.sh', %s, NULL, %s, %s, now())
        """,
        (f"matview:{view}", "error" if error else "ok", error, started),
    )

with conn.cursor() as cur:
    _t = datetime.datetime.now(datetime.timezone.utc)
    cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_stats_summary;")
    refreshed(cur, "mp_stats_summary", _t)
    cur.execute("SELECT to_regclass('public.mp_leaderboard_metrics')")
    if cur.fetchone()[0]:
        _t = datetime.datetime.now(datetime.timezone.utc)
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_leaderboard_metrics;")
        refreshed(cur, "mp_leaderboard_metrics", _t)
    # mp_attendance_v2 backs the attendance methodology that takes effect
    # 2026-08-26. It was built by migration 020 and nothing has refreshed it
    # since; it agreed with a live recompute only because the chamber has not
    # voted since 2026-07-14. From the autumn session it would freeze at 93
    # eligible days while every surface presented it as current.
    # CONCURRENTLY is safe here: idx_mp_attendance_v2_mp is the required
    # unique index.
    cur.execute("SELECT to_regclass('public.mp_attendance_v2')")
    if cur.fetchone()[0]:
        _t = datetime.datetime.now(datetime.timezone.utc)
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_attendance_v2;")
        refreshed(cur, "mp_attendance_v2", _t)

    # faction_alignment was created WITH NO DATA and populated by hand once the
    # surface showing the votes behind each figure existed. From here it keeps
    # up with the votes like any other view.
    cur.execute("SELECT to_regclass('public.faction_alignment')")
    if cur.fetchone()[0]:
        _t = datetime.datetime.now(datetime.timezone.utc)
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY faction_alignment;")
        refreshed(cur, "faction_alignment", _t)
conn.close()
print(f"[{datetime.datetime.now().isoformat()}] views refreshed")
EOF

mark_success "$JOB"
