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

# One publish step (evaluation ARC-01): backend.publish runs the data-quality
# gate and refreshes the published views only if it clears. On a blocking
# failure it refreshes nothing and the last-good views stay served. The same
# function serves POST /api/admin/refresh; nothing else refreshes a view.
.venv/bin/python -m backend.publish

mark_success "$JOB"
