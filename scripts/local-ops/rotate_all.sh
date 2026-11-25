#!/usr/bin/env bash
# One-command credential rotation (SECF-02) plus the summary credentials
# (SECA-05). Run it yourself, in your own terminal — NOT through an agent
# chat ("!" prefix), because chat output is where the old credentials leaked.
#
#   scripts/local-ops/rotate_all.sh
#
# It asks for two temporary API keys (typing is hidden), keeps them only in
# memory, and never prints a secret. What it does, in order:
#   1. checks both keys and finds the Neon database and the Render service
#      (changes nothing; asks you to type yes before going on)
#   2. pauses the local timers, saves the old values for the "old ones are dead" check
#   3. Neon: resets the database password, waits until the new one works
#   4. writes prod.env and summary-approver.env (mode 600)
#   5. Render: sets DB_DSN, SYNC_SECRET, SUMMARY_DRAFT_SECRET,
#      SUMMARY_APPROVE_SECRET, SUMMARY_APPROVER_NAME, and redeploys
#   6. waits for the new deploy, runs rotate_check.sh, restarts the timers
# See docs/ops/credential-rotation.md for the manual version.
set -uo pipefail

CONFIG_DIR="${OPENSEIMAS_CONFIG_DIR:-$HOME/.config/openseimas}"
PROD_ENV="$CONFIG_DIR/prod.env"
APPROVER_ENV="$CONFIG_DIR/summary-approver.env"
OLD_ENV="$CONFIG_DIR/rotation-old.env"
API="${OPENSEIMAS_API:-https://seimas-api.onrender.com}"
RENDER_SERVICE="seimas-api"
APPROVER_NAME="OpenSeimas maintainer"   # public label, same default as render.yaml
NEON="${NEON_API_BASE:-https://console.neon.tech/api/v2}"     # override only for tests
RENDER="${RENDER_API_BASE:-https://api.render.com/v1}"     # override only for tests
HERE="$(cd "$(dirname "$0")" && pwd)"
PROBE="$API/api/admin/corrections/00000000-0000-0000-0000-000000000000/status"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mSTOPPED: %s\033[0m\n' "$*" >&2; exit 1; }

# Authenticated API call without putting the key on the command line.
# usage: api neon|render METHOD PATH [JSON_BODY]   -> body on stdout
# On HTTP >= 400 it prints the service's error message (never a secret) and fails.
api() {
  local which=$1 method=$2 path=$3 body=${4:-} base key out code
  if [ "$which" = neon ]; then base=$NEON key=$NEON_API_KEY; else base=$RENDER key=$RENDER_API_KEY; fi
  local args=(-sS --max-time 60 -X "$method" -w '\n%{http_code}')
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' --data-binary @-)
  out=$(printf '%s' "$body" | curl "${args[@]}" \
    -H @<(printf 'Authorization: Bearer %s\nAccept: application/json\n' "$key") "$base$path") || return 1
  code=${out##*$'\n'}; out=${out%$'\n'*}
  if [ "$code" -ge 400 ] 2>/dev/null || ! [ "$code" -ge 200 ] 2>/dev/null; then
    printf '  (%s answered %s: %s)\n' "$which" "$code" "$(printf '%s' "$out" | head -c 300)" >&2
    return 1
  fi
  printf '%s' "$out"
}

[ -f "$PROD_ENV" ] || die "no $PROD_ENV"
set -a; . "$PROD_ENV"; set +a
[ -n "${DB_DSN:-}" ] || die "DB_DSN missing from prod.env"
OLD_DSN=$DB_DSN

# Role, endpoint and database come from the current connection string (none are secret).
read -r ROLE ENDPOINT DBNAME < <(OLD_DSN="$OLD_DSN" python3 -I -c '
import os, urllib.parse as u
p = u.urlsplit(os.environ["OLD_DSN"])
ep = p.hostname.split(".")[0]
ep = ep[:-len("-pooler")] if ep.endswith("-pooler") else ep
print(u.unquote(p.username), ep, p.path.lstrip("/") or "-")')
[ -n "${ROLE:-}" ] && [ -n "${ENDPOINT:-}" ] || die "could not read the current DB_DSN"

say "Step 1 of 6 — two temporary keys (what you type stays hidden)"
read -rsp "  Paste the Neon API key, then press Enter: " NEON_API_KEY; echo
read -rsp "  Paste the Render API key, then press Enter: " RENDER_API_KEY; echo
[ -n "$NEON_API_KEY" ] && [ -n "$RENDER_API_KEY" ] || die "a key was empty"

# A personal Neon key must name the organization the projects live in, so ask
# for the user's organizations first, then list each one's projects.
api neon GET "/users/me/organizations" > /dev/null || die "Neon did not accept that key"
projects=$( { api neon GET "/projects?limit=400" 2>/dev/null
              for org in $(api neon GET "/users/me/organizations" | jq -r '.organizations[].id'); do
                api neon GET "/projects?limit=400&org_id=$org"
              done; } | jq -s '[.[].projects[]] | unique_by(.id)')
PROJECT="" BRANCH="" PROJECT_NAME=""
for pid in $(jq -r '.[].id' <<<"$projects"); do
  b=$(api neon GET "/projects/$pid/endpoints" | jq -r --arg e "$ENDPOINT" '.endpoints[] | select(.id==$e) | .branch_id' | head -1)
  if [ -n "$b" ]; then PROJECT=$pid BRANCH=$b; PROJECT_NAME=$(jq -r --arg p "$pid" '.[] | select(.id==$p) | .name' <<<"$projects"); break; fi
done
[ -n "$PROJECT" ] || die "the Neon key works, but none of its projects owns endpoint $ENDPOINT. Make the key in the Neon account that owns the database."

services=$(api render GET "/services?name=$RENDER_SERVICE&limit=20") || die "Render did not accept that key"
SERVICE=$(jq -r --arg n "$RENDER_SERVICE" '.[].service | select(.name==$n) | .id' <<<"$services" | head -1)
[ -n "$SERVICE" ] || die "the Render key works, but it sees no service called $RENDER_SERVICE"

echo "  Found Neon project \"$PROJECT_NAME\", database user \"$ROLE\"."
echo "  Found Render service \"$RENDER_SERVICE\"."
echo
echo "  Nothing has changed yet. From here the site is down for about 5 minutes."
read -rp "  Type yes to go ahead: " answer
answer=$(printf %s "$answer" | tr -d "[:space:]" | tr "[:upper:]" "[:lower:]")
[ "$answer" = yes ] || die "you did not type yes — nothing was changed"

say "Step 2 of 6 — pausing the timers, keeping the old values for the final check"
# Start by name: a glob only matches loaded units, and a stopped timer is unloaded.
TIMERS=$(systemctl --user list-unit-files 'openseimas-*.timer' --no-legend | awk '{print $1}')
trap 'systemctl --user start $TIMERS || echo "  WARNING: restart the timers: systemctl --user start $TIMERS"' EXIT
systemctl --user stop $TIMERS 2>/dev/null
( umask 077; printf "OLD_DB_DSN='%s'\nOLD_SYNC_SECRET='%s'\n" "$OLD_DSN" "${SYNC_SECRET:-}" > "$OLD_ENV" )

say "Step 3 of 6 — Neon: new database password"
NEW_PW=$(api neon POST "/projects/$PROJECT/branches/$BRANCH/roles/$ROLE/reset_password" | jq -r '.role.password') \
  || die "Neon refused the reset. Nothing else changed; your old password still works."
[ -n "$NEW_PW" ] && [ "$NEW_PW" != null ] || die "Neon gave no new password. Nothing else changed."
NEW_DSN=$(OLD_DSN="$OLD_DSN" NEW_PW="$NEW_PW" python3 -I -c '
import os, urllib.parse as u
p = u.urlsplit(os.environ["OLD_DSN"])
host = p.hostname + (f":{p.port}" if p.port else "")
user = u.quote(u.unquote(p.username), safe="")
pw = u.quote(os.environ["NEW_PW"], safe="")
print(u.urlunsplit(p._replace(netloc=f"{user}:{pw}@{host}")))')
unset NEW_PW
for i in $(seq 1 30); do
  psql "$NEW_DSN" -tAc 'SELECT 1' 2>/dev/null | grep -qx 1 && break
  [ "$i" = 30 ] && die "the new database password did not start working within 2.5 minutes. Run this script again."
  sleep 5
done
echo "  New password works."

NEW_SYNC=$(openssl rand -hex 32)
NEW_DRAFT=$(openssl rand -hex 32)
NEW_APPROVE=$(openssl rand -hex 32)

say "Step 4 of 6 — saving the new values on this laptop"
NEW_DSN="$NEW_DSN" NEW_SYNC="$NEW_SYNC" NEW_DRAFT="$NEW_DRAFT" PROD_ENV="$PROD_ENV" python3 -I -c '
import os, re
path = os.environ["PROD_ENV"]
new = {"DB_DSN": os.environ["NEW_DSN"], "SYNC_SECRET": os.environ["NEW_SYNC"],
       "SUMMARY_DRAFT_SECRET": os.environ["NEW_DRAFT"]}
out, seen = [], set()
for line in open(path).read().splitlines():
    m = re.match(r"\s*(export\s+)?([A-Za-z_][A-Za-z0-9_]*)=", line)
    if m and m.group(2) in new:
        k = m.group(2); seen.add(k); line = f"{k}=\x27{new[k]}\x27"
    out.append(line)
out += [f"{k}=\x27{v}\x27" for k, v in new.items() if k not in seen]
tmp = path + ".tmp"
fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f: f.write("\n".join(out) + "\n")
os.replace(tmp, path)' || die "could not write prod.env. Run this script again; it starts from the new password."
( umask 077; printf "SUMMARY_APPROVE_SECRET='%s'\nSUMMARY_APPROVER_NAME='%s'\n" "$NEW_APPROVE" "$APPROVER_NAME" > "$APPROVER_ENV" )
chmod 600 "$PROD_ENV" "$APPROVER_ENV"
echo "  Saved prod.env and summary-approver.env."

say "Step 5 of 6 — Render: new settings and a redeploy"
setvar() { api render PUT "/services/$SERVICE/env-vars/$1" "$(jq -nc --arg v "$2" '{value:$v}')" >/dev/null \
             || die "Render refused $1. Run this script again; the laptop already has the new values."; echo "  set $1"; }
setvar DB_DSN "$NEW_DSN"
setvar SYNC_SECRET "$NEW_SYNC"
setvar SUMMARY_DRAFT_SECRET "$NEW_DRAFT"
setvar SUMMARY_APPROVE_SECRET "$NEW_APPROVE"
setvar SUMMARY_APPROVER_NAME "$APPROVER_NAME"
unset NEW_DSN NEW_DRAFT NEW_APPROVE
api render POST "/services/$SERVICE/deploys" '{}' >/dev/null || die "Render did not start a redeploy. Open the Render dashboard and press Manual Deploy."
echo "  Redeploy started."

say "Step 6 of 6 — waiting for the new deploy (usually 3–8 minutes)"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 -X POST -H 'Content-Type: application/json' \
    -H @<(printf 'Authorization: Bearer %s\n' "$NEW_SYNC") -d '{"status":"__rotation_probe__"}' "$PROBE")
  [ "$code" = 422 ] && break
  [ "$i" = 60 ] && die "the new deploy did not come up within 15 minutes. Open the Render dashboard, look at Events, then run scripts/local-ops/rotate_check.sh."
  printf '.'; sleep 15
done
unset NEW_SYNC NEON_API_KEY RENDER_API_KEY
echo " live."

"$HERE/rotate_check.sh" || die "a final check failed (see above)."
if gh secret list 2>/dev/null | grep -q '^DB_DSN\b'; then
  gh secret delete DB_DSN >/dev/null 2>&1 && echo "  removed the old DB_DSN secret from GitHub"
fi

trap - EXIT
systemctl --user start $TIMERS || die "could not restart the timers: run  systemctl --user start $TIMERS"
running=$(systemctl --user list-timers 'openseimas-*' --no-legend | wc -l)
[ "$running" -eq "$(wc -w <<<"$TIMERS")" ] || die "only $running timers are running; run  systemctl --user start $TIMERS"
say "Done. Every check passed and all $running timers are running again."
echo "  Last thing: delete the two API keys you made (Neon: Account settings → API keys;"
echo "  Render: Account Settings → API Keys). Then tell Claude: \"rotated and configured\"."
