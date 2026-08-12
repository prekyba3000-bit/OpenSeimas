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

.venv/bin/python - << 'EOF'
import os, psycopg2, datetime
conn = psycopg2.connect(os.environ["DB_DSN"])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_stats_summary;")
    cur.execute("SELECT to_regclass('public.mp_leaderboard_metrics')")
    if cur.fetchone()[0]:
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_leaderboard_metrics;")
conn.close()
print(f"[{datetime.datetime.now().isoformat()}] views refreshed")
EOF

mark_success "$JOB"
