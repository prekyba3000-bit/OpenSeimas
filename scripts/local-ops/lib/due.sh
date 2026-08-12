#!/usr/bin/env bash
# Due-tracking for the local ops jobs.
#
# The scheduler (systemd user timers with Persistent=true) already re-fires a
# missed job once after a boot or resume. This library is the second half of
# that contract: it lets a job answer "am I actually due?" for itself, so the
# same script is safe to run from the timer, from the boot catch-up, and by
# hand, without a double run — and so a job that already succeeded ten minutes
# ago doesn't repeat work just because the laptop woke up.
#
# State lives outside the repo (XDG), one file per job holding the epoch
# seconds of its last SUCCESS. A job that fails leaves the old stamp alone, so
# it stays due and will be retried.
#
#   source lib/due.sh
#   is_due backup 86400 || exit 0
#   ... work ...
#   mark_success backup

OPS_STATE_DIR="${OPS_STATE_DIR:-$HOME/.local/state/openseimas}"
OPS_LOG_DIR="${OPS_LOG_DIR:-$HOME/Documents/OpenSeimas/logs}"

# Both dirs are created here rather than assumed. A missing log dir is not
# hypothetical: the original crontab redirected into logs/, the directory did
# not exist, and every job died in the shell redirect before its script ran —
# silently, for as long as the ops layer had been installed.
mkdir -p "$OPS_STATE_DIR" "$OPS_LOG_DIR"

_stamp_file() { printf '%s/last-success-%s' "$OPS_STATE_DIR" "$1"; }

# last successful run as epoch seconds, or 0 if never
last_success() {
  local f; f="$(_stamp_file "$1")"
  [ -f "$f" ] && cat "$f" 2>/dev/null || echo 0
}

# is_due <job> <interval_seconds> — true when the interval has elapsed.
# Honours OPS_FORCE=1 for manual "run it now regardless".
is_due() {
  local job="$1" interval="$2" last now
  [ "${OPS_FORCE:-0}" = "1" ] && return 0
  last="$(last_success "$job")"
  now="$(date +%s)"
  [ "$(( now - last ))" -ge "$interval" ]
}

mark_success() { date +%s > "$(_stamp_file "$1")"; }

# How overdue a job is, in whole seconds (0 when not due).
overdue_by() {
  local job="$1" interval="$2" last now delta
  last="$(last_success "$job")"; now="$(date +%s)"
  delta=$(( now - last - interval ))
  [ "$delta" -gt 0 ] && echo "$delta" || echo 0
}

# Human-readable age, e.g. "2d 3h" / "14m" / "never".
human_age() {
  local ts="$1" now delta d h m
  [ "$ts" = "0" ] && { echo "never"; return; }
  now="$(date +%s)"; delta=$(( now - ts ))
  [ "$delta" -lt 0 ] && delta=0
  d=$(( delta / 86400 )); h=$(( (delta % 86400) / 3600 )); m=$(( (delta % 3600) / 60 ))
  if   [ "$d" -gt 0 ]; then printf '%dd %dh' "$d" "$h"
  elif [ "$h" -gt 0 ]; then printf '%dh %dm' "$h" "$m"
  else                      printf '%dm' "$m"
  fi
}

# Canonical job table: name | interval seconds | catch-up? | description.
# Point-in-time jobs (uptime, stats refresh) are deliberately catchup=no —
# replaying a health ping for a moment that has passed tells you nothing.
ops_jobs() {
  cat <<'JOBS'
uptime|900|no|Production /health ping
refresh|1800|no|Materialised view refresh
backup|86400|yes|pg_dump of production Neon
sync|86400|yes|Daily ingest + stats export
offsite|604800|yes|Encrypted off-machine backup
JOBS
}
