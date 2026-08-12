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

body=$(curl -fsS -m 90 "$URL/health" 2>&1)
if echo "$body" | grep -q '"status":"ok"'; then
  echo "[$(date -Is)] health ok"
else
  echo "[$(date -Is)] HEALTH FAILED: $body"
  ops_fail "$JOB" "$body"
  exit 1
fi
curl -fsS -m 90 "$URL/api/meta/freshness" | head -c 200
echo

mark_success "$JOB"
