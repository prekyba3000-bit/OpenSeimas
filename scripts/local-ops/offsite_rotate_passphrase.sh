#!/usr/bin/env bash
# Rotate the offsite GPG passphrase after it has been exposed.
#
# Order matters. The new bundle is uploaded and proven decryptable BEFORE any
# old copy is removed, so a rotation that fails halfway leaves you with a
# working backup under the old passphrase rather than none under either.
#
#   ./offsite_rotate_passphrase.sh          # dry run: says what it would do
#   ./offsite_rotate_passphrase.sh --commit # does it
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config/openseimas"
PASS_FILE="$CONFIG_DIR/offsite.env"
STATE_DIR="${OPS_STATE_DIR:-$HOME/.local/state/openseimas}"
ACK="$STATE_DIR/offsite-passphrase-stored"
REMOTE="${OPENSEIMAS_RCLONE_REMOTE:-gdrive}"
RPATH="${OPENSEIMAS_RCLONE_PATH:-OpenSeimas/backups}"
COMMIT="${1:-}"

[ -f "$PASS_FILE" ] || { echo "No $PASS_FILE" >&2; exit 1; }

if [ "$COMMIT" != "--commit" ]; then
  cat <<PLAN
Dry run. With --commit this would:

  1. Back up the current $PASS_FILE to $PASS_FILE.old-\$(date +%s)
  2. Generate a new 32-byte passphrase and write it to $PASS_FILE (600)
  3. Run offsite_backup.sh, producing a bundle under the NEW passphrase
  4. Download that bundle from ${REMOTE}: and prove it decrypts and lists
  5. Only then delete remote bundles that predate the rotation
  6. Clear $ACK, because the copy you stored is now the old passphrase

Nothing is deleted before step 4 succeeds.
Remote bundles now: $(rclone lsf ${REMOTE}:${RPATH}/ 2>/dev/null | wc -l)
PLAN
  exit 0
fi

echo "== 1. preserving the old passphrase =="
OLD_BACKUP="$PASS_FILE.old-$(date +%s)"
cp -a "$PASS_FILE" "$OLD_BACKUP"; chmod 600 "$OLD_BACKUP"
echo "   $OLD_BACKUP"

echo "== 2. generating a new passphrase =="
set -a; . "$PASS_FILE"; set +a
OLD_PASS="$OFFSITE_PASSPHRASE"
NEW_PASS="$(openssl rand -base64 32 | tr -d '\n')"
umask 077
printf '# GPG symmetric passphrase for the off-machine backup bundle.\n# STORE A COPY IN YOUR PASSWORD MANAGER.\nOFFSITE_PASSPHRASE=%s\n' "$NEW_PASS" > "$PASS_FILE"
chmod 600 "$PASS_FILE"
echo "   written (not printed here — use offsite_recovery_card.sh)"

echo "== 3. recording the cutover, then backing up under the new passphrase =="
CUTOVER="$(date +%Y%m%d-%H%M)"
"$HERE/offsite_backup.sh" >/dev/null 2>&1 || { echo "   backup FAILED — restoring old passphrase"; cp -a "$OLD_BACKUP" "$PASS_FILE"; exit 1; }
NEWEST="$(rclone lsf "${REMOTE}:${RPATH}/" --include 'openseimas-offsite-*.tar.gz.gpg' 2>/dev/null | sort | tail -1)"
echo "   uploaded: $NEWEST"

echo "== 4. proving the new remote copy restores =="
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
rclone copy "${REMOTE}:${RPATH}/$NEWEST" "$T/" 2>/dev/null
gpg --batch --yes --passphrase "$NEW_PASS" --decrypt "$T/$NEWEST" 2>/dev/null > "$T/b.tar.gz"
ENTRIES="$(tar -tzf "$T/b.tar.gz" 2>/dev/null | wc -l)"
if [ "$ENTRIES" -lt 3 ]; then
  echo "   VERIFY FAILED ($ENTRIES entries) — restoring old passphrase, deleting nothing"
  cp -a "$OLD_BACKUP" "$PASS_FILE"
  exit 1
fi
echo "   decrypts, $ENTRIES entries, keystore present: $(tar -tzf "$T/b.tar.gz" | grep -c keystore)"

echo "== 5. removing remote bundles under the old passphrase =="
for f in $(rclone lsf "${REMOTE}:${RPATH}/" --include 'openseimas-offsite-*.tar.gz.gpg' 2>/dev/null | sort); do
  [ "$f" = "$NEWEST" ] && continue
  rclone delete "${REMOTE}:${RPATH}/$f" && echo "   deleted $f"
done
rm -f "$HOME/backups/openseimas/offsite/"*.gpg
echo "   local staging cleared (all were encrypted with the old passphrase)"

echo "== 6. the stored copy is now stale =="
rm -f "$ACK"
echo "   cleared $ACK"
echo
echo "Rotation complete. The passphrase you pasted no longer opens anything."
echo "Next:  $HERE/offsite_recovery_card.sh        # store the NEW one"
echo "       $HERE/offsite_recovery_card.sh --stored"
echo "Old passphrase kept at $OLD_BACKUP — delete it once you are satisfied."
