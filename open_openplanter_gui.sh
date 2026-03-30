#!/bin/bash
# Spawns a new graphical terminal running OpenPlanter (Textual UI).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
LAUNCH="$ROOT/launch_openplanter.sh"

run_in_terminal() {
  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --title="OpenPlanter" -- bash -lc "exec '$LAUNCH'; read -rp 'Press Enter to close…' _"
    return 0
  fi
  if command -v konsole >/dev/null 2>&1; then
    konsole -e bash -lc "exec '$LAUNCH'; read -rp 'Press Enter to close…' _" &
    return 0
  fi
  if command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -lc "exec '$LAUNCH'; read -rp 'Press Enter to close…' _" &
    return 0
  fi
  if command -v xterm >/dev/null 2>&1; then
    xterm -title OpenPlanter -e bash -lc "exec '$LAUNCH'; read -rp 'Press Enter to close…' _" &
    return 0
  fi
  return 1
}

if run_in_terminal; then
  exit 0
fi
echo "No GUI terminal found. Run manually:"
echo "  $LAUNCH"
exit 1
