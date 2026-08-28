#!/usr/bin/env bash
# Weekly off-machine backup. Scheduled by openseimas-offsite.timer (Mon 04:00,
# Persistent=true).
#
# WHY THIS EXISTS: until now the only copy of the database dump sat on the same
# disk it was protecting, and the two files that cannot be regenerated at all —
# the Android release keystore and the production credentials — had no backup
# whatsoever. Losing the keystore means losing the ability to ship an update to
# the installed app, permanently.
#
# WHAT GOES IN: newest DB dump + the whole of ~/.config/openseimas
# (openseimas-release.keystore, prod.env, android-signing.env).
#
# ENCRYPTION: the bundle is GPG symmetric (AES-256) *before* it leaves the
# machine, because it carries the signing key and production DB credentials.
# The passphrase lives in ~/.config/openseimas/offsite.env (600).
#
#   >>> THE PASSPHRASE MUST ALSO LIVE IN YOUR PASSWORD MANAGER. <<<
#   It is stored on the same laptop the backup exists to survive. If the disk
#   dies and the passphrase died with it, the archive is undecryptable and the
#   keystore is gone anyway — the exact outcome this job is meant to prevent.
#
#   ./offsite_backup.sh            run now
#   ./offsite_backup.sh --if-due   run only if >=7d since last success
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

JOB=offsite
INTERVAL=604800          # 7 days
REMOTE_KEEP=4            # remote copies to retain (>=4 per ops policy)
RCLONE_REMOTE="${OPENSEIMAS_RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${OPENSEIMAS_RCLONE_PATH:-OpenSeimas/backups}"

if [ "${1:-}" = "--if-due" ] && ! is_due "$JOB" "$INTERVAL"; then
  echo "[$(date -Is)] offsite skipped — last success $(human_age "$(last_success "$JOB")") ago"
  exit 0
fi
trap 'ops_trap_fail '"$JOB" ERR

BACKUP_DIR="$HOME/backups/openseimas"
STAGE_DIR="$BACKUP_DIR/offsite"
CONFIG_DIR="$HOME/.config/openseimas"
mkdir -p "$STAGE_DIR"
chmod 700 "$STAGE_DIR"

# --- passphrase -------------------------------------------------------------
PASS_FILE="$CONFIG_DIR/offsite.env"
if [ ! -f "$PASS_FILE" ]; then
  ops_fail "$JOB" "missing $PASS_FILE — run scripts/local-ops/offsite_setup.sh first"
  exit 1
fi
set -a; . "$PASS_FILE"; set +a
: "${OFFSITE_PASSPHRASE:?OFFSITE_PASSPHRASE not set in $PASS_FILE}"

# --- newest DB dump ---------------------------------------------------------
DUMP="$(ls -t "$BACKUP_DIR"/seimas-*.dump 2>/dev/null | head -1 || true)"
if [ -z "$DUMP" ]; then
  ops_fail "$JOB" "no DB dump found in $BACKUP_DIR — run db_backup.sh first"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M)"
ARCHIVE="$STAGE_DIR/openseimas-offsite-$STAMP.tar.gz.gpg"

# --- preconditions ----------------------------------------------------------
# Checked BEFORE building anything. Previously the bundle was written first and
# the upload leg checked afterwards, so an unconfigured remote still produced a
# 20MB encrypted archive on every run — and the local retention prune sat below
# the failure point and never ran. 204 bundles and 3.9GB accumulated that way.
if ! command -v rclone >/dev/null 2>&1; then
  ops_fail_once "$JOB" "no-rclone" "rclone not installed — offsite upload cannot run. Nothing was bundled."
  exit 0
fi

if ! rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
  # A standing configuration gap, not a transient fault. Exit 0 so the job is
  # not retried hourly, and say so once a day rather than every hour. The local
  # DB dumps in $BACKUP_DIR are unaffected and still running.
  ops_fail_once "$JOB" "no-remote" \
    "rclone remote '${RCLONE_REMOTE}:' not configured — no off-machine copy. Local DB dumps unaffected. Run scripts/local-ops/offsite_setup.sh"
  exit 0
fi

# An encrypted backup whose passphrase exists only on the machine being backed
# up is not a backup. Nothing can verify a password manager from here, so this
# tracks acknowledgement instead of guessing — weekly, because it is a standing
# risk rather than news.
ACK_FILE="${OPS_STATE_DIR:-$HOME/.local/state/openseimas}/offsite-passphrase-stored"
if [ ! -f "$ACK_FILE" ]; then
  OPS_NOTIFY_QUIET_SECS=604800 ops_fail_once "$JOB" "passphrase-unstored" \
    "Backup passphrase exists only on this laptop — the archive is unreadable if this disk dies. Run scripts/local-ops/offsite_recovery_card.sh"
fi

echo "[$(date -Is)] offsite bundle: $(basename "$DUMP") + $CONFIG_DIR"

# Stream tar -> gpg so the *plaintext* bundle never touches disk. The keystore
# is already on this disk, but writing a second unencrypted copy of it into a
# backup staging dir would be a gratuitous extra exposure.
# recovery-card.txt is excluded: it is a transient plaintext copy of the
# passphrase, meant to live only between generating it and storing it in a
# password manager. offsite.env already carries the same value, so including
# the card adds an extra plaintext copy and no recoverability.
tar -czf - \
      --exclude='openseimas/recovery-card.txt' \
      --exclude='openseimas/offsite.env.old-*' \
      -C "$BACKUP_DIR" "$(basename "$DUMP")" \
      -C "$HOME/.config" "openseimas" \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase-fd 3 --output "$ARCHIVE" 3<<<"$OFFSITE_PASSPHRASE"

chmod 600 "$ARCHIVE"
[ -s "$ARCHIVE" ] || { ops_fail "$JOB" "encrypted archive empty: $ARCHIVE"; exit 1; }

# Prune local staging here, not after the upload. Retention that lives below a
# failure point is retention that never runs when it is most needed.
ls -t "$STAGE_DIR"/openseimas-offsite-*.tar.gz.gpg 2>/dev/null | tail -n +5 | xargs -r rm --

# Prove it decrypts before trusting it. An unverified backup is a guess.
if ! gpg --batch --quiet --decrypt --passphrase-fd 3 3<<<"$OFFSITE_PASSPHRASE" \
        "$ARCHIVE" 2>/dev/null | tar -tzf - >/dev/null 2>&1; then
  ops_fail "$JOB" "archive failed decrypt+list verification: $ARCHIVE"
  exit 1
fi
echo "[$(date -Is)] archive verified: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# --- upload -----------------------------------------------------------------

rclone copy "$ARCHIVE" "${RCLONE_REMOTE}:${RCLONE_PATH}/" --no-traverse
echo "[$(date -Is)] uploaded to ${RCLONE_REMOTE}:${RCLONE_PATH}/$(basename "$ARCHIVE")"

# --- retention --------------------------------------------------------------
# Remote: keep newest $REMOTE_KEEP.
mapfile -t remote_old < <(
  rclone lsf "${RCLONE_REMOTE}:${RCLONE_PATH}/" --include 'openseimas-offsite-*.tar.gz.gpg' 2>/dev/null \
    | sort -r | tail -n +$((REMOTE_KEEP + 1))
)
for f in "${remote_old[@]:-}"; do
  [ -n "$f" ] || continue
  rclone delete "${RCLONE_REMOTE}:${RCLONE_PATH}/$f" && echo "  pruned remote $f"
done



remote_count=$(rclone lsf "${RCLONE_REMOTE}:${RCLONE_PATH}/" --include 'openseimas-offsite-*.tar.gz.gpg' 2>/dev/null | wc -l)
echo "[$(date -Is)] offsite ok — remote copies: $remote_count"

mark_success "$JOB"
