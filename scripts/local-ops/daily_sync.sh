#!/usr/bin/env bash
# Local stand-in for .github/workflows/daily_sync.yml while GitHub Actions is
# unavailable. Scheduled by openseimas-sync.timer (06:00 Europe/Vilnius,
# Persistent=true so a missed day is caught up once after boot/resume).
#
# Idempotent by construction, so a catch-up run is safe: apply_migrations is
# guarded, ingest_seimas upserts (its only DELETE is a scoped replace of the
# committee rows it is about to re-insert), ingest_votes_v2 is all ON CONFLICT,
# and export_stats overwrites one JSON file.
#
# Reads DB_DSN from ~/.config/openseimas/prod.env — never store the DSN in-repo.
#
#   ./daily_sync.sh            run now
#   ./daily_sync.sh --if-due   run only if >=24h since last success (timer path)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

JOB=sync
INTERVAL=86400

if [ "${1:-}" = "--if-due" ] && ! is_due "$JOB" "$INTERVAL"; then
  echo "[$(date -Is)] daily sync skipped — last success $(human_age "$(last_success "$JOB")") ago"
  exit 0
fi
trap 'ops_trap_fail '"$JOB" ERR

ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { ops_fail "$JOB" "missing $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a
REPO="$HOME/Documents/OpenSeimas"
cd "$REPO/Seimas.v2"

echo "[$(date -Is)] daily sync start"
.venv/bin/python apply_migrations.py
.venv/bin/python -m pipeline.ingest_seimas
.venv/bin/python -m pipeline.ingest_votes_v2
.venv/bin/python -m pipeline.cli tag_topics || echo "[$(date -Is)] tag_topics failed (non-fatal, same as workflow)"
.venv/bin/python export_stats.py

# Mirror the workflow's data commit; --no-verify skips the pre-push quality gate
# because this push is data-only (the gate is for code pushes).
cd "$REPO"
if ! git diff --quiet Seimas.v2/dashboard/public/data/absenteeism.json; then
  git add Seimas.v2/dashboard/public/data/absenteeism.json
  git commit -m "data: daily sync (local cron) [skip ci]"
  git pull --rebase origin main && git push --no-verify origin main \
    || echo "[$(date -Is)] push failed — data commit left local"
fi
echo "[$(date -Is)] daily sync done"

mark_success "$JOB"
