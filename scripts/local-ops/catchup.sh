#!/usr/bin/env bash
# Boot / resume catch-up.
#
# This laptop powers off nightly, so the 03:30 backup and 06:00 sync land in
# hours the machine does not exist. systemd's Persistent=true already re-fires
# a missed timer once, and each job re-checks its own due state; this script is
# the reporting layer on top: it runs the catch-up-eligible jobs through their
# --if-due gate, records what was actually recovered, and tells you once.
#
# One run per missed job, never N replays: a job three days stale is still a
# single invocation, because "due" is a boolean, not a backlog count.
#
# Point-in-time jobs (uptime, refresh) are excluded by design — see lib/due.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

LOG="$OPS_LOG_DIR/ops-catchup.log"
exec >> "$LOG" 2>&1

echo "[$(date -Is)] catch-up start (boot/resume)"

recovered=()
failed=()

while IFS='|' read -r job interval catchup desc; do
  [ "$catchup" = "yes" ] || continue

  if ! is_due "$job" "$interval"; then
    echo "  $job: current (last success $(human_age "$(last_success "$job")") ago)"
    continue
  fi

  was="$(human_age "$(last_success "$job")")"
  echo "  $job: DUE (last success $was ago) — running catch-up"

  case "$job" in
    backup)  script="$HERE/db_backup.sh" ;;
    sync)    script="$HERE/daily_sync.sh" ;;
    offsite) script="$HERE/offsite_backup.sh" ;;
    *)       echo "    no script mapped for $job — skipping"; continue ;;
  esac

  if "$script" >> "$OPS_LOG_DIR/ops-$job.log" 2>&1; then
    echo "    $job recovered"
    recovered+=("$job (was $was stale)")
  else
    echo "    $job FAILED during catch-up"
    failed+=("$job")
  fi
done < <(ops_jobs)

# Report. Silence when there was nothing to recover — a quiet boot should be
# quiet. Failures already notified individually by the job itself; this is the
# summary of what the wake-up actually repaired.
if [ "${#recovered[@]}" -gt 0 ]; then
  body="$(printf '%s\n' "${recovered[@]}")"
  echo "[$(date -Is)] recovered ${#recovered[@]} job(s)"
  ops_notify normal "OpenSeimas: caught up ${#recovered[@]} missed job(s)" "$body" || true
fi
if [ "${#failed[@]}" -gt 0 ]; then
  echo "[$(date -Is)] ${#failed[@]} job(s) failed during catch-up: ${failed[*]}"
fi
if [ "${#recovered[@]}" -eq 0 ] && [ "${#failed[@]}" -eq 0 ]; then
  echo "[$(date -Is)] nothing missed — all catch-up jobs current"
fi

echo "[$(date -Is)] catch-up done"
