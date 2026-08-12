#!/usr/bin/env bash
# One-glance ops status: what ran, what is overdue, where the backups are.
#
#   ./status.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; DIM=$'\033[2m'; BLD=$'\033[1m'; OFF=$'\033[0m'
BACKUP_DIR="$HOME/backups/openseimas"
STAGE_DIR="$BACKUP_DIR/offsite"
RCLONE_REMOTE="${OPENSEIMAS_RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${OPENSEIMAS_RCLONE_PATH:-OpenSeimas/backups}"

printf '%sOpenSeimas ops%s   %s\n\n' "$BLD" "$OFF" "$(date '+%Y-%m-%d %H:%M %Z')"

# ── jobs ────────────────────────────────────────────────────────────────────
printf '%-9s %-14s %-14s %-10s %s\n' "JOB" "LAST SUCCESS" "NEXT DUE" "CATCH-UP" "STATE"
printf '%s\n' "$DIM────────────────────────────────────────────────────────────────────────$OFF"

overdue_total=0
while IFS='|' read -r job interval catchup desc; do
  last="$(last_success "$job")"
  if [ "$last" = "0" ]; then
    last_txt="never"; next_txt="now"; state="${YEL}never run${OFF}"; overdue_total=$((overdue_total+1))
  else
    last_txt="$(human_age "$last") ago"
    next_epoch=$(( last + interval ))
    now="$(date +%s)"
    if [ "$now" -ge "$next_epoch" ]; then
      next_txt="now"
      od="$(overdue_by "$job" "$interval")"
      # A point-in-time job being "due" is normal between ticks, not a problem.
      if [ "$catchup" = "yes" ]; then
        state="${RED}OVERDUE by $(human_age $(( now - od )) )${OFF}"; overdue_total=$((overdue_total+1))
      else
        state="${DIM}due next tick${OFF}"
      fi
    else
      next_txt="in $(human_age $(( now - (next_epoch - now) )) )"
      state="${GRN}ok${OFF}"
    fi
  fi
  printf '%-9s %-14s %-14s %-10s %b\n' "$job" "$last_txt" "$next_txt" "$catchup" "$state"
done < <(ops_jobs)

# ── timers ──────────────────────────────────────────────────────────────────
printf '\n%sTimers%s\n' "$BLD" "$OFF"
if systemctl --user list-timers 'openseimas-*' --all >/dev/null 2>&1; then
  systemctl --user list-timers 'openseimas-*' --all --no-pager 2>/dev/null \
    | sed -n '2,$p' | grep -v '^$' | grep -v 'timers listed' | sed 's/^/  /' || echo "  (none active)"
else
  echo "  (systemd --user unavailable)"
fi

# ── local backups ───────────────────────────────────────────────────────────
printf '\n%sLocal DB dumps%s  %s\n' "$BLD" "$OFF" "$DIM$BACKUP_DIR$OFF"
newest="$(ls -t "$BACKUP_DIR"/seimas-*.dump 2>/dev/null | head -1 || true)"
count="$(ls "$BACKUP_DIR"/seimas-*.dump 2>/dev/null | wc -l)"
if [ -n "$newest" ]; then
  age_s=$(( $(date +%s) - $(stat -c %Y "$newest") ))
  warn=""; [ "$age_s" -gt 172800 ] && warn=" ${YEL}(>2d old)${OFF}"
  printf '  newest: %s  %s  %s%b\n' "$(basename "$newest")" "$(du -h "$newest" | cut -f1)" \
    "$(human_age "$(stat -c %Y "$newest")") ago" "$warn"
  printf '  count : %s  (retention 30)   total %s\n' "$count" "$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
else
  printf '  %sno dumps yet%s\n' "$RED" "$OFF"
fi

# ── offsite ─────────────────────────────────────────────────────────────────
printf '\n%sOff-machine backup%s\n' "$BLD" "$OFF"
local_bundle="$(ls -t "$STAGE_DIR"/openseimas-offsite-*.tar.gz.gpg 2>/dev/null | head -1 || true)"
if [ -n "$local_bundle" ]; then
  b_age=$(( $(date +%s) - $(stat -c %Y "$local_bundle") ))
  warn=""; [ "$b_age" -gt 691200 ] && warn=" ${YEL}(>8d old)${OFF}"
  printf '  local  : %s  %s  %s%b\n' "$(basename "$local_bundle")" \
    "$(du -h "$local_bundle" | cut -f1)" "$(human_age "$(stat -c %Y "$local_bundle")") ago" "$warn"
else
  printf '  local  : %snone yet%s\n' "$YEL" "$OFF"
fi
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
  rc="$(rclone lsf "${RCLONE_REMOTE}:${RCLONE_PATH}/" --include 'openseimas-offsite-*.tar.gz.gpg' 2>/dev/null | wc -l)"
  rnew="$(rclone lsf "${RCLONE_REMOTE}:${RCLONE_PATH}/" --include 'openseimas-offsite-*.tar.gz.gpg' 2>/dev/null | sort -r | head -1)"
  printf '  remote : %s:%s  %s copies  newest %s\n' "$RCLONE_REMOTE" "$RCLONE_PATH" "$rc" "${rnew:-none}"
  [ "$rc" -lt 1 ] && printf '           %sremote is empty%s\n' "$YEL" "$OFF"
else
  printf '  remote : %sNOT CONFIGURED%s — run scripts/local-ops/offsite_setup.sh\n' "$RED" "$OFF"
  printf '           %sthe keystore has no off-machine copy%s\n' "$RED" "$OFF"
fi

# ── failures ────────────────────────────────────────────────────────────────
FAIL_LOG="$OPS_LOG_DIR/ops-failures.log"
printf '\n%sRecent failures%s\n' "$BLD" "$OFF"
if [ -s "$FAIL_LOG" ]; then
  tail -5 "$FAIL_LOG" | sed "s/^/  $RED/;s/\$/$OFF/"
  printf '  %s(%s total — %s)%s\n' "$DIM" "$(wc -l < "$FAIL_LOG")" "$FAIL_LOG" "$OFF"
else
  printf '  %snone%s\n' "$GRN" "$OFF"
fi

printf '\n'
[ "$overdue_total" -gt 0 ] && printf '%s%s job(s) overdue%s\n' "$YEL" "$overdue_total" "$OFF" || printf '%sall scheduled work current%s\n' "$GRN" "$OFF"
