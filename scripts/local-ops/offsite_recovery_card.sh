#!/usr/bin/env bash
# Print the one thing the encrypted backup cannot survive losing, plus the exact
# steps to restore from it.
#
# The passphrase lives at ~/.config/openseimas/offsite.env — on the laptop the
# backup exists to survive. If that disk dies and the passphrase dies with it,
# every uploaded archive, release keystore included, is permanently unreadable.
# The upload succeeding does not fix that; it makes it worse, because the backup
# then looks safe.
#
# Run this, copy the block into a password manager, then:
#     ./offsite_recovery_card.sh --stored
# which records that a second copy exists and stops the reminder.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"

CONFIG_DIR="$HOME/.config/openseimas"
PASS_FILE="$CONFIG_DIR/offsite.env"
REMOTE="${OPENSEIMAS_RCLONE_REMOTE:-gdrive}"
RPATH="${OPENSEIMAS_RCLONE_PATH:-OpenSeimas/backups}"
ACK="${OPS_STATE_DIR:-$HOME/.local/state/openseimas}/offsite-passphrase-stored"

if [ "${1:-}" = "--stored" ]; then
  date +%s > "$ACK"
  echo "Recorded: a second copy of the passphrase exists off this machine."
  echo "If that stops being true, delete $ACK"
  exit 0
fi

[ -f "$PASS_FILE" ] || { echo "No $PASS_FILE — run offsite_setup.sh first." >&2; exit 1; }
# shellcheck disable=SC1090
set -a; . "$PASS_FILE"; set +a

cat <<CARD

  ┌─ OpenSeimas offsite recovery card ──────────────────────────────────┐
  │ Store this in a password manager. Not on this laptop.               │
  └─────────────────────────────────────────────────────────────────────┘

  Passphrase (GPG symmetric, AES-256):

      ${OFFSITE_PASSPHRASE}

  Restore, from any machine with rclone + gpg:

      rclone copy ${REMOTE}:${RPATH}/<file>.tar.gz.gpg .
      gpg --decrypt --output bundle.tar.gz <file>.tar.gz.gpg
      tar -xzf bundle.tar.gz

  The archive contains the newest database dump and all of
  ~/.config/openseimas — including openseimas-release.keystore, which
  cannot be regenerated. Losing the passphrase loses the keystore.

  Note: restoring also needs an rclone remote pointed at the same Drive
  account. That is re-creatable from the account itself; the passphrase
  is not re-creatable from anything.

  Once stored:   $(basename "${BASH_SOURCE[0]}") --stored

CARD
