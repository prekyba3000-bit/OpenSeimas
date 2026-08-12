#!/usr/bin/env bash
#
# Regenerate android/ from scratch: `cap add android`, generate icons/splash,
# then re-apply the hand-edits that Capacitor's generators don't produce. The
# committed android/ is normally the source of truth; this script exists so
# "delete android/, rebuild" is a real, tested path (see build-from-clean in the
# README) — not a landmine that silently drops the signing config or version.
#
# Run from the android-app directory.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

: "${ANDROID_HOME:?ANDROID_HOME must be set (e.g. \$HOME/Android/Sdk)}"

DIST="../dist"
if [[ ! -f "$DIST/index.html" ]]; then
  echo "bootstrap: $DIST/index.html missing — building the dashboard first so cap add has a webDir."
  ( cd .. && VITE_API_URL="${VITE_API_URL:-https://seimas-api.onrender.com}" npx vite build )
fi

echo "bootstrap: removing android/ and regenerating"
rm -rf android

echo "bootstrap: cap add android"
npx cap add android

echo "bootstrap: generating launcher icon + splash from assets/"
npx capacitor-assets generate --android

echo "bootstrap: re-applying hand-edits from patches/"
cp patches/version.properties            android/version.properties
cp patches/app-build.gradle              android/app/build.gradle
cp patches/ic_launcher.xml               android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
cp patches/ic_launcher_round.xml         android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml

echo "bootstrap: cap sync (copy web assets + link plugins)"
npx cap sync android

echo "bootstrap: done — android/ regenerated. Run ./build-apk.sh to produce a signed APK."
