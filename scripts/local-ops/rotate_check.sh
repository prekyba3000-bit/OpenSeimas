#!/usr/bin/env bash
# Verify a credential rotation of the production DB password and SYNC_SECRET.
# Run it AFTER you have rotated both and updated Render and prod.env; it only
# reads and probes, and it never prints a secret.
#
# See docs/ops/credential-rotation.md for the order of operations.
#
#   ./rotate_check.sh
#
# Optional: put the OLD values in ~/.config/openseimas/rotation-old.env as
# OLD_DB_DSN=... and OLD_SYNC_SECRET=... to also prove the old ones are dead.
# The script deletes that file when it finishes, pass or fail.
set -uo pipefail

CONFIG_DIR="$HOME/.config/openseimas"
PROD_ENV="$CONFIG_DIR/prod.env"
OLD_ENV="$CONFIG_DIR/rotation-old.env"
API="${OPENSEIMAS_API:-https://seimas-api.onrender.com}"
# Probe target: the auth check runs before anything else in this route, and a
# status outside the allowed set is refused with 422 before the database is
# touched. So a valid token yields 422 and writes nothing.
PROBE="$API/api/admin/corrections/00000000-0000-0000-0000-000000000000/status"
PROBE_BODY='{"status":"__rotation_probe__"}'

fails=0
ok()   { echo "  ok    $*"; }
bad()  { echo "  FAIL  $*"; fails=$((fails + 1)); }

[ -f "$PROD_ENV" ] || { echo "No $PROD_ENV" >&2; exit 1; }
[ "$(stat -c %a "$PROD_ENV")" = "600" ] || bad "$PROD_ENV is not mode 600"
set -a; . "$PROD_ENV"; set +a
: "${DB_DSN:?DB_DSN missing from prod.env}" "${SYNC_SECRET:?SYNC_SECRET missing from prod.env}"

echo "prod.env last changed: $(date -d @"$(stat -c %Y "$PROD_ENV")" '+%F %T')"

echo "== 1. the new database password works from this laptop =="
if psql "$DB_DSN" -tAc 'SELECT 1' 2>/dev/null | grep -qx 1; then ok "DB_DSN in prod.env connects"; else bad "DB_DSN in prod.env does not connect"; fi

echo "== 2. Render uses a working database password (readiness reaches the DB) =="
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 90 "$API/health/ready")
[ "$code" = "200" ] && ok "/health/ready 200" || bad "/health/ready answered $code (Render DB_DSN not updated, or still waking)"

echo "== 3. admin routes refuse a missing token =="
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST -H 'Content-Type: application/json' -d "$PROBE_BODY" "$PROBE")
[ "$code" = "401" ] && ok "no token -> 401" || bad "no token -> $code (expected 401)"

echo "== 4. Render accepts the new SYNC_SECRET (422 = authorised, nothing written) =="
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SYNC_SECRET" -d "$PROBE_BODY" "$PROBE")
[ "$code" = "422" ] && ok "new token -> 422" || bad "new token -> $code (expected 422; Render SYNC_SECRET differs from prod.env?)"

if [ -f "$OLD_ENV" ]; then
  echo "== 5. the old credentials are dead =="
  # shellcheck disable=SC1090
  set -a; . "$OLD_ENV"; set +a
  if [ -n "${OLD_DB_DSN:-}" ]; then
    if psql "$OLD_DB_DSN" -tAc 'SELECT 1' >/dev/null 2>&1; then bad "OLD DB password still connects"; else ok "old DB password refused"; fi
  fi
  if [ -n "${OLD_SYNC_SECRET:-}" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $OLD_SYNC_SECRET" -d "$PROBE_BODY" "$PROBE")
    [ "$code" = "401" ] && ok "old token -> 401" || bad "old token -> $code (expected 401)"
  fi
  shred -u "$OLD_ENV" 2>/dev/null || rm -f "$OLD_ENV"
  echo "  removed $OLD_ENV"
else
  echo "== 5. skipped: no $OLD_ENV, so the old credentials were not tested =="
fi

echo
if [ "$fails" -eq 0 ]; then
  echo "All checks passed. Record the date in docs/ops/credential-rotation.md (no values)."
else
  echo "$fails check(s) failed."
  exit 1
fi
