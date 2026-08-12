#!/usr/bin/env bash
# One-time setup for the off-machine backup.
#
# Generates the GPG passphrase (if absent) and prints exactly what you must do
# by hand: the rclone Google Drive OAuth flow, which needs a browser and cannot
# be automated.
#
#   ./offsite_setup.sh
set -euo pipefail
CONFIG_DIR="$HOME/.config/openseimas"
PASS_FILE="$CONFIG_DIR/offsite.env"
RCLONE_REMOTE="${OPENSEIMAS_RCLONE_REMOTE:-gdrive}"

mkdir -p "$CONFIG_DIR"; chmod 700 "$CONFIG_DIR"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }

# --- 1. passphrase ----------------------------------------------------------
if [ -f "$PASS_FILE" ] && grep -q '^OFFSITE_PASSPHRASE=' "$PASS_FILE"; then
  bold "1. Passphrase: already present at $PASS_FILE (unchanged)."
else
  umask 077
  PASS="$(openssl rand -base64 32 | tr -d '\n')"
  printf '# GPG symmetric passphrase for the off-machine backup bundle.\n# STORE A COPY IN YOUR PASSWORD MANAGER — see the warning below.\nOFFSITE_PASSPHRASE=%s\n' "$PASS" > "$PASS_FILE"
  chmod 600 "$PASS_FILE"
  bold "1. Passphrase generated -> $PASS_FILE (600)"
  echo
  printf '\033[1;31m%s\033[0m\n' "   ┌──────────────────────────────────────────────────────────────┐"
  printf '\033[1;31m%s\033[0m\n' "   │  COPY THIS INTO YOUR PASSWORD MANAGER NOW.                   │"
  printf '\033[1;31m%s\033[0m\n' "   │  It lives on the laptop the backup exists to survive. If the │"
  printf '\033[1;31m%s\033[0m\n' "   │  disk dies and this passphrase dies with it, the encrypted   │"
  printf '\033[1;31m%s\033[0m\n' "   │  archive — including the release keystore — is unreadable.   │"
  printf '\033[1;31m%s\033[0m\n' "   └──────────────────────────────────────────────────────────────┘"
  echo
  echo "   OFFSITE_PASSPHRASE=$PASS"
  echo
fi

# --- 2. rclone --------------------------------------------------------------
echo
if ! command -v rclone >/dev/null 2>&1; then
  bold "2. rclone: NOT INSTALLED"
  echo "   Install (no sudo):"
  echo "     curl -fsSL -o /tmp/rclone.zip https://downloads.rclone.org/rclone-current-linux-amd64.zip"
  echo "     unzip -oq /tmp/rclone.zip -d /tmp && install -m755 /tmp/rclone-*-linux-amd64/rclone ~/.local/bin/rclone"
elif rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
  bold "2. rclone remote '${RCLONE_REMOTE}:' is configured. Nothing to do."
  echo "   Remote contents:"
  rclone lsf "${RCLONE_REMOTE}:OpenSeimas/backups/" 2>/dev/null | sed 's/^/     /' || echo "     (empty or path not yet created)"
else
  bold "2. rclone is installed ($(rclone version | head -1)) but remote '${RCLONE_REMOTE}:' is NOT configured."
  echo
  echo "   THIS STEP NEEDS YOU — it opens a browser for Google's consent screen."
  echo
  echo "     \$ rclone config"
  echo "       n)  New remote"
  echo "       name> ${RCLONE_REMOTE}"
  echo "       Storage> drive                    (type the number for 'Google Drive')"
  echo "       client_id>        <press Enter — blank is fine>"
  echo "       client_secret>    <press Enter>"
  echo "       scope> 1                          (Full access; 3 = drive.file also works"
  echo "                                          and is tighter — it only sees files"
  echo "                                          rclone itself created)"
  echo "       service_account_file> <press Enter>"
  echo "       Edit advanced config? n"
  echo "       Use web browser to automatically authenticate? y"
  echo "         -> browser opens, pick your Google account, Allow"
  echo "       Configure this as a Shared Drive? n"
  echo "       y) Yes this is OK   ->  q) Quit config"
  echo
  echo "   Then verify and do the first run:"
  echo "     rclone lsd ${RCLONE_REMOTE}:"
  echo "     $(dirname "${BASH_SOURCE[0]}")/offsite_backup.sh"
fi

echo
bold "3. What gets backed up"
echo "   - newest ~/backups/openseimas/seimas-*.dump"
echo "   - all of ~/.config/openseimas/ (release keystore, prod.env, android-signing.env)"
echo "   tar -> gpg AES-256 -> ${RCLONE_REMOTE}:OpenSeimas/backups/  (remote keeps 4, local 4)"
echo
bold "4. Restore"
echo "   rclone copy ${RCLONE_REMOTE}:OpenSeimas/backups/<file>.tar.gz.gpg ."
echo "   gpg --decrypt --output bundle.tar.gz <file>.tar.gz.gpg    # asks for the passphrase"
echo "   tar -xzf bundle.tar.gz"
