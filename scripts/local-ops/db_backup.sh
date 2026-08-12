#!/usr/bin/env bash
# Nightly pg_dump of the production (Neon) DB to ~/backups/openseimas/,
# keeping the newest 30 dumps. Scheduled by openseimas-backup.timer (03:30,
# Persistent=true so a missed night is caught up once after boot/resume).
#
# Uses dockerized postgres:18 pg_dump because the system client is v14 and the
# server is PG 18 (pg_dump must be >= server version).
#
#   ./db_backup.sh            run now
#   ./db_backup.sh --if-due   run only if >=24h since last success (timer path)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

JOB=backup
INTERVAL=86400

if [ "${1:-}" = "--if-due" ] && ! is_due "$JOB" "$INTERVAL"; then
  echo "[$(date -Is)] backup skipped — last success $(human_age "$(last_success "$JOB")") ago"
  exit 0
fi
trap 'ops_trap_fail '"$JOB" ERR

ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { ops_fail "$JOB" "missing $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a

BACKUP_DIR="$HOME/backups/openseimas"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/seimas-$(date +%Y%m%d-%H%M).dump"

# --user keeps the dump owned by the invoking user; without it docker writes as
# root and the file resists rotation and offsite bundling.
docker run --rm --user "$(id -u):$(id -g)" -v "$BACKUP_DIR":/out postgres:18-alpine \
  pg_dump --format=custom --no-owner --file="/out/$(basename "$OUT")" "$DB_DSN"

[ -s "$OUT" ] || { ops_fail "$JOB" "backup empty: $OUT"; exit 1; }
echo "[$(date -Is)] backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

# Rotation: keep the newest 30
ls -t "$BACKUP_DIR"/seimas-*.dump 2>/dev/null | tail -n +31 | xargs -r rm --

mark_success "$JOB"
