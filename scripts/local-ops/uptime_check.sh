#!/usr/bin/env bash
# Local stand-in for .github/workflows/uptime_check.yml — pings production
# /health and /api/meta/freshness. Cron: */15 * * * *.
# Logs always; fires a desktop notification on failure (best effort under cron).
set -uo pipefail
URL="https://seimas-api.onrender.com"

body=$(curl -fsS -m 90 "$URL/health" 2>&1)
if echo "$body" | grep -q '"status":"ok"'; then
  echo "[$(date -Is)] health ok"
else
  echo "[$(date -Is)] HEALTH FAILED: $body"
  DISPLAY=:0 DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus" \
    notify-send -u critical "OpenSeimas API unhealthy" "$body" 2>/dev/null || true
  exit 1
fi
curl -fsS -m 90 "$URL/api/meta/freshness" | head -c 200
echo
