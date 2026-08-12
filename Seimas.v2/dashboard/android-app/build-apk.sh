#!/usr/bin/env bash
#
# One command: dashboard production build -> cap sync -> signed release APK.
# Idempotent and rerunnable. Fails loudly with the real error visible.
#
#   ./build-apk.sh
#
# Requires:
#   - JDK 21 (JAVA_HOME or a `java` on PATH)
#   - ANDROID_HOME pointing at the SDK
#   - ~/.config/openseimas/android-signing.env (keystore + passwords, 600)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD="$(cd "$HERE/.." && pwd)"
API_URL="${VITE_API_URL:-https://seimas-api.onrender.com}"
SIGNING_ENV="${OPENSEIMAS_SIGNING_ENV:-$HOME/.config/openseimas/android-signing.env}"

step() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mbuild-apk failed:\033[0m %s\n' "$1" >&2; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────────────
step "Preflight"
: "${ANDROID_HOME:?ANDROID_HOME must be set (e.g. \$HOME/Android/Sdk)}"
command -v java >/dev/null 2>&1 || die "java not found on PATH"
JAVA_MAJOR="$(java -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1)"
[[ "${JAVA_MAJOR:-0}" -ge 17 ]] || die "JDK 17+ required (found ${JAVA_MAJOR:-unknown})"
[[ -f "$SIGNING_ENV" ]] || die "signing env not found at $SIGNING_ENV — see README (Release signing)"
# shellcheck disable=SC1090
source "$SIGNING_ENV"
: "${OPENSEIMAS_KEYSTORE_PATH:?signing env missing OPENSEIMAS_KEYSTORE_PATH}"
[[ -f "$OPENSEIMAS_KEYSTORE_PATH" ]] || die "keystore missing at $OPENSEIMAS_KEYSTORE_PATH"
echo "JDK $JAVA_MAJOR · ANDROID_HOME=$ANDROID_HOME · API_URL=$API_URL"

# If android/ was deleted, regenerate it first (committed normally; this keeps a
# clean checkout buildable).
if [[ ! -f "$HERE/android/gradlew" ]]; then
  step "android/ missing — bootstrapping"
  ( cd "$HERE" && ./bootstrap-android.sh )
fi

# ── Dashboard production build ───────────────────────────────────────────────
step "Building dashboard (VITE_API_URL=$API_URL)"
( cd "$DASHBOARD" && VITE_API_URL="$API_URL" npx vite build )

# The whole point of the app is that it talks to the production API. If the URL
# didn't make it into the bundle, stop now rather than ship a dead app.
step "Verifying production API URL is baked into the bundle"
grep -rq "$API_URL" "$DASHBOARD/dist/assets/" || die "API URL '$API_URL' not found in dist bundle"
echo "ok: $API_URL present in dist/assets"

# ── Sync + assemble ──────────────────────────────────────────────────────────
step "cap sync android"
( cd "$HERE" && npx cap sync android )

step "gradle assembleRelease"
( cd "$HERE/android" && ./gradlew assembleRelease )

# ── Verify signature ─────────────────────────────────────────────────────────
APK="$HERE/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]] || die "expected APK not found at $APK"

step "Verifying signature"
APKSIGNER="$(ls "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)"
[[ -n "$APKSIGNER" ]] || die "apksigner not found under $ANDROID_HOME/build-tools"
"$APKSIGNER" verify --print-certs "$APK" >/dev/null || die "APK signature verification failed"
echo "ok: signature verified"

# ── Report ───────────────────────────────────────────────────────────────────
SIZE="$(du -h "$APK" | cut -f1)"
SHA="$(sha256sum "$APK" | cut -d' ' -f1)"
step "Done"
printf 'APK:    %s\nSize:   %s\nSHA256: %s\n' "$APK" "$SIZE" "$SHA"
