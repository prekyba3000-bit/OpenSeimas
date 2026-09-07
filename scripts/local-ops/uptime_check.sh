#!/usr/bin/env bash
# Pings production /health and /api/meta/freshness.
# Scheduled by openseimas-uptime.timer (every 15 min, Persistent=false).
#
# Deliberately no catch-up: this is a point-in-time probe. Replaying a health
# check for a moment that has already passed tells you nothing about now, and
# a burst of stale "was it up at 03:15?" pings after a wake is pure noise.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

JOB=uptime
URL="https://seimas-api.onrender.com"

# Readiness, not liveness. /health is 200 whenever the process is up — that is
# what Render's health check needs, because restarting the service cannot fix a
# database outage. /health/ready returns 503 when the database is unreachable,
# so an HTTP failure here is a real one and `curl -f` is enough to catch it.
# This probe used to read `"status":"ok"` out of the /health body, which worked
# and depended on nobody ever changing that string.
body=$(curl -sS -m 90 -o /tmp/openseimas-ready.$$ -w '%{http_code}' "$URL/health/ready" 2>&1)
detail=$(cat /tmp/openseimas-ready.$$ 2>/dev/null); rm -f /tmp/openseimas-ready.$$
if [ "$body" = "200" ]; then
  echo "[$(date -Is)] health ok"
else
  echo "[$(date -Is)] HEALTH FAILED (HTTP $body): $detail"
  ops_fail "$JOB" "HTTP $body: $detail"
  exit 1
fi
curl -fsS -m 90 "$URL/api/meta/freshness" | head -c 200
echo

mark_success "$JOB"
