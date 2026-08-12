#!/usr/bin/env bash
# Simulation gate for the catch-up logic.
#
# Proves the property that matters after a laptop has been shut for days:
# ONE catch-up run per missed job, not one per missed occurrence.
#
# Runs entirely in a throwaway state dir with stub job scripts, so it never
# touches production, the real stamps, or the network.
#
#   ./test_catchup.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export OPS_STATE_DIR="$TMP/state"
export OPS_LOG_DIR="$TMP/logs"
mkdir -p "$OPS_STATE_DIR" "$OPS_LOG_DIR" "$TMP/bin/lib"

# Stub the three catch-up jobs: record each invocation, succeed.
cp "$HERE/lib/due.sh" "$HERE/lib/notify.sh" "$TMP/bin/lib/"
cp "$HERE/catchup.sh" "$TMP/bin/"
for s in db_backup daily_sync offsite_backup; do
  cat > "$TMP/bin/$s.sh" <<EOF
#!/usr/bin/env bash
. "$TMP/bin/lib/due.sh"
echo "\$(date -Is) INVOKED $s \$*" >> "$TMP/invocations"
case "$s" in
  db_backup)      mark_success backup ;;
  daily_sync)     mark_success sync ;;
  offsite_backup) mark_success offsite ;;
esac
EOF
  chmod +x "$TMP/bin/$s.sh"
done

pass=0; fail=0
check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then printf '  \033[32mPASS\033[0m %s (%s)\n' "$1" "$3"; pass=$((pass+1))
  else printf '  \033[31mFAIL\033[0m %s — expected %s, got %s\n' "$1" "$2" "$3"; fail=$((fail+1)); fi
}

TWO_DAYS_AGO=$(( $(date +%s) - 172800 ))
FIVE_MIN_AGO=$(( $(date +%s) - 300 ))

echo "── Scenario: laptop was off for 2 days ─────────────────────────────────"
# backup + sync last succeeded 2 days ago; offsite 2 days ago but its interval
# is 7 days, so it must NOT be considered missed.
echo "$TWO_DAYS_AGO" > "$OPS_STATE_DIR/last-success-backup"
echo "$TWO_DAYS_AGO" > "$OPS_STATE_DIR/last-success-sync"
echo "$TWO_DAYS_AGO" > "$OPS_STATE_DIR/last-success-offsite"

"$TMP/bin/catchup.sh"
n_backup=$(grep -c "INVOKED db_backup" "$TMP/invocations" 2>/dev/null || true)
n_sync=$(  grep -c "INVOKED daily_sync" "$TMP/invocations" 2>/dev/null || true)
n_offsite=$(grep -c "INVOKED offsite_backup" "$TMP/invocations" 2>/dev/null || true)

check "backup ran exactly once (2 missed days, not 2 runs)" 1 "$n_backup"
check "sync ran exactly once   (2 missed days, not 2 runs)" 1 "$n_sync"
check "offsite did NOT run     (7d interval, only 2d stale)" 0 "$n_offsite"

echo
echo "── Scenario: catch-up runs again immediately (e.g. hourly sweep) ───────"
"$TMP/bin/catchup.sh"
n_backup2=$(grep -c "INVOKED db_backup" "$TMP/invocations" 2>/dev/null || true)
n_sync2=$(  grep -c "INVOKED daily_sync" "$TMP/invocations" 2>/dev/null || true)
check "backup not repeated (still 1 total)" 1 "$n_backup2"
check "sync not repeated   (still 1 total)" 1 "$n_sync2"

echo
echo "── Scenario: a job that just succeeded is not due ──────────────────────"
echo "$FIVE_MIN_AGO" > "$OPS_STATE_DIR/last-success-backup"
. "$HERE/lib/due.sh"
if is_due backup 86400; then check "fresh backup is not due" "not-due" "due"
else check "fresh backup is not due" "not-due" "not-due"; fi

echo
echo "── Scenario: 8-day-old offsite IS due ──────────────────────────────────"
echo "$(( $(date +%s) - 691200 ))" > "$OPS_STATE_DIR/last-success-offsite"
if is_due offsite 604800; then check "8d-old offsite is due" "due" "due"
else check "8d-old offsite is due" "due" "not-due"; fi

echo
echo "── Scenario: never-run job is due ──────────────────────────────────────"
rm -f "$OPS_STATE_DIR/last-success-sync"
if is_due sync 86400; then check "never-run sync is due" "due" "due"
else check "never-run sync is due" "due" "not-due"; fi

echo
echo "── Catch-up log from run 1 ─────────────────────────────────────────────"
sed 's/^/  /' "$OPS_LOG_DIR/ops-catchup.log"

echo
printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
