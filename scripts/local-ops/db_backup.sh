#!/usr/bin/env bash
# Local stand-in for .github/workflows/db_backup.yml — nightly pg_dump of the
# production (Neon) DB to ~/backups/openseimas/, keeping the newest 30 dumps.
# Cron: 30 3 * * *. Uses dockerized postgres:18 pg_dump because the system
# client is v14 and the server is PG 18 (pg_dump must be >= server version).
set -euo pipefail
ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a

BACKUP_DIR="$HOME/backups/openseimas"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/seimas-$(date +%Y%m%d-%H%M).dump"

docker run --rm -v "$BACKUP_DIR":/out postgres:18-alpine \
  pg_dump --format=custom --no-owner --file="/out/$(basename "$OUT")" "$DB_DSN"

[ -s "$OUT" ] || { echo "[$(date -Is)] BACKUP EMPTY: $OUT" >&2; exit 1; }
echo "[$(date -Is)] backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

# Rotation: keep the newest 30
ls -t "$BACKUP_DIR"/seimas-*.dump 2>/dev/null | tail -n +31 | xargs -r rm --
