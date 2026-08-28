#!/usr/bin/env bash
# Desktop notification + failure recording for the ops jobs.
#
# Noise on failure, silence on success — and a *skip* is not a failure. A job
# that decided it wasn't due says nothing at all.
#
# notify-send is preferred but libnotify-bin is not installed on this machine,
# so the working path is gdbus, which is present by default and talks to the
# same org.freedesktop.Notifications interface. If libnotify-bin is installed
# later this upgrades to notify-send automatically, no edit needed.
#
# Every failure is also appended to logs/ops-failures.log, which status.sh
# surfaces — a notification nobody was sitting in front of must not be the only
# record.

OPS_LOG_DIR="${OPS_LOG_DIR:-$HOME/Documents/OpenSeimas/logs}"
OPS_FAILURE_LOG="$OPS_LOG_DIR/ops-failures.log"
mkdir -p "$OPS_LOG_DIR"

# ops_notify <urgency: low|normal|critical> <summary> <body>
ops_notify() {
  local urgency="$1" summary="$2" body="$3"
  export DISPLAY="${DISPLAY:-:0}"
  export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$(id -u)/bus}"

  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u "$urgency" "$summary" "$body" 2>/dev/null && return 0
  fi
  if command -v gdbus >/dev/null 2>&1; then
    # Expiry 0 = until dismissed for critical, 10s otherwise.
    local expiry=10000; [ "$urgency" = "critical" ] && expiry=0
    gdbus call --session \
      --dest org.freedesktop.Notifications \
      --object-path /org/freedesktop/Notifications \
      --method org.freedesktop.Notifications.Notify \
      "OpenSeimas" 0 "dialog-warning" "$summary" "$body" "[]" "{}" "$expiry" \
      >/dev/null 2>&1 && return 0
  fi
  return 1
}

# ops_fail <job> <message> — record and shout. Use only for real failures.
ops_fail() {
  local job="$1" msg="$2"
  printf '[%s] %s: %s\n' "$(date -Is)" "$job" "$msg" >> "$OPS_FAILURE_LOG"
  ops_notify critical "OpenSeimas: $job failed" "$msg" || true
}

# Trap helper: call as `trap 'ops_trap_fail <job>' ERR` under `set -e`.
ops_trap_fail() {
  local job="$1" code=$?
  ops_fail "$job" "exited $code (see $OPS_LOG_DIR/ops-$job.log)"
  exit "$code"
}

# A failure with a standing cause — an unconfigured remote, a missing
# credential — is the same news every hour. Log every occurrence, but notify at
# most once per OPS_NOTIFY_QUIET_SECS so the desktop popup still means
# "something changed" rather than "the clock ticked".
OPS_NOTIFY_QUIET_SECS="${OPS_NOTIFY_QUIET_SECS:-86400}"

ops_fail_once() {
  local job="$1" key="$2" message="$3"
  local state_dir="${OPS_STATE_DIR:-$HOME/.local/state/openseimas}"
  mkdir -p "$state_dir"
  local stamp="$state_dir/last-notified-${job}-${key}"
  local now last
  now="$(date +%s)"
  last="$( [ -f "$stamp" ] && cat "$stamp" 2>/dev/null || echo 0 )"

  printf '[%s] %s: %s\n' "$(date -Is)" "$job" "$message" >> "$OPS_FAILURE_LOG"

  if [ "$(( now - last ))" -ge "$OPS_NOTIFY_QUIET_SECS" ]; then
    printf '%s' "$now" > "$stamp"
    ops_notify critical "OpenSeimas: $job failed" "$message"
  fi
}
