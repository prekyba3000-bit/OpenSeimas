#!/usr/bin/env bash
# Local stand-in for .github/workflows/daily_sync.yml while GitHub Actions is
# unavailable. Cron: 0 6 * * * (Europe/Vilnius, same 06:00 slot as the workflow).
# Reads DB_DSN from ~/.config/openseimas/prod.env — never store the DSN in-repo.
set -euo pipefail
ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
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
