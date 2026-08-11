#!/usr/bin/env bash
# Local stand-in for .github/workflows/refresh_db.yml (materialized view refresh).
# Cron: */30 * * * * — same cadence as the workflow.
set -euo pipefail
ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
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
