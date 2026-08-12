#!/usr/bin/env bash
# Install the systemd *user* timers and retire the OpenSeimas cron lines.
#
# Why user timers instead of cron: this laptop powers off nightly, and cron has
# no concept of a missed run — the 03:30 backup simply never happened. systemd
# timers with Persistent=true record the last trigger and fire once after the
# next boot or resume, which is exactly "catch up what was missed, once".
#
# Only the OpenSeimas cron lines are removed; anything else in the crontab
# (e.g. the unrelated openclaw healthcheck) is left untouched.
#
#   ./install_timers.sh            install + enable
#   ./install_timers.sh --uninstall
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
UNITS=(uptime refresh backup sync offsite catchup)

if [ "${1:-}" = "--uninstall" ]; then
  for u in "${UNITS[@]}"; do
    systemctl --user disable --now "openseimas-$u.timer" 2>/dev/null || true
    rm -f "$UNIT_DIR/openseimas-$u.timer" "$UNIT_DIR/openseimas-$u.service"
  done
  systemctl --user daemon-reload
  echo "uninstalled OpenSeimas timers"
  exit 0
fi

mkdir -p "$UNIT_DIR"
install -m 644 "$HERE"/systemd/openseimas-*.service "$UNIT_DIR/"
install -m 644 "$HERE"/systemd/openseimas-*.timer   "$UNIT_DIR/"
systemctl --user daemon-reload

for u in "${UNITS[@]}"; do
  systemctl --user enable --now "openseimas-$u.timer"
done

# Linger keeps user units running when nobody is logged in, and starts them at
# boot rather than at first login.
if ! loginctl show-user "$USER" 2>/dev/null | grep -q 'Linger=yes'; then
  echo "NOTE: enable-linger is off. Run:  sudo loginctl enable-linger $USER"
fi

# --- retire the OpenSeimas cron lines ---------------------------------------
CRON_BACKUP="$HOME/.config/openseimas/crontab.pre-systemd.$(date +%Y%m%d-%H%M)"
if crontab -l 2>/dev/null | grep -q 'OpenSeimas/scripts/local-ops'; then
  crontab -l > "$CRON_BACKUP" 2>/dev/null || true
  crontab -l 2>/dev/null | grep -v 'OpenSeimas/scripts/local-ops' | crontab -
  echo "removed OpenSeimas cron lines (backup: $CRON_BACKUP)"
else
  echo "no OpenSeimas cron lines to remove"
fi

echo
systemctl --user list-timers 'openseimas-*' --no-pager
