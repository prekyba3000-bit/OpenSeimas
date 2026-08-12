# Atviras Seimas — Android app

A Capacitor wrapper around the dashboard (`Seimas.v2/dashboard`). The app **is**
the dashboard's production web build inside a native WebView — when the dashboard
gains a screen, the app gains it on the next build. There is no second UI
codebase.

- **appId:** `lt.openseimas.app`
- **App name:** „Atviras Seimas"
- **API:** `https://seimas-api.onrender.com` (baked in at build time via
  `VITE_API_URL`, same as the Vercel web build)
- **min / target SDK:** 24 / 36 · **JDK:** 21

## Build a signed APK (one command)

```bash
cd Seimas.v2/dashboard/android-app
./build-apk.sh
```

It runs: dashboard `vite build` (production API URL) → asserts the URL is in the
bundle → `cap sync` → `gradle assembleRelease` → verifies the signature → prints
the APK path, size and SHA-256. Rerunnable; fails loudly with the real Gradle
error.

Prerequisites:
- `ANDROID_HOME` set (this machine: `~/Android/Sdk`), JDK 21 on `PATH`.
- `~/.config/openseimas/android-signing.env` present (see below).

From the repo root the same thing is available as `npm run android:apk`.

## ⚠️ The release keystore is irreplaceable

Google Play (and Android's update mechanism) will only accept an update signed
with the **same** key as the installed app. **If the keystore or its password is
lost, this app can never be updated again** — a new key means a new package that
existing users must uninstall and reinstall.

- Keystore: `~/.config/openseimas/openseimas-release.keystore` (mode 600)
- Passwords: `~/.config/openseimas/android-signing.env` (mode 600)
- Certificate SHA-256:
  `6B:56:EF:B4:0B:52:5B:E9:1A:AC:9E:B3:D9:FA:2D:EA:B8:1C:B7:41:E7:BE:55:22:DC:4A:B1:9E:51:17:8E:B8`

**Both files belong in the off-machine backup set, alongside the database dumps.**
Neither is in git, and both are gitignored as a backstop. Gradle reads the
keystore path and passwords from the environment (`OPENSEIMAS_KEYSTORE_PATH`,
`OPENSEIMAS_KEYSTORE_PASSWORD`, `OPENSEIMAS_KEY_ALIAS`, `OPENSEIMAS_KEY_PASSWORD`);
nothing secret is written into the tree. When the env is absent, `assembleRelease`
produces an *unsigned* APK rather than leaking anything.

## Versioning

`android/version.properties` is the one place to bump:

```properties
versionName=0.1.0   # semver, shown to users
versionCode=1       # integer, must increase for every distributed build
```

## Layout & regeneration

`android/` is committed. The files Capacitor's generators don't produce
(version, signing, full-bleed adaptive-icon background) are kept in `patches/`
and re-applied by `bootstrap-android.sh`, so a from-scratch rebuild is a real,
tested path:

```bash
rm -rf android && ./bootstrap-android.sh && ./build-apk.sh
```

- `capacitor.config.ts` — appId, appName, `webDir: ../dist`, `androidScheme: https`.
- `assets/` — original source art + `generate-source-art.mjs`. Regenerate the
  launcher icon / splash with `npm run assets` (wraps `capacitor-assets`).
- `patches/` — hand-edits re-applied on bootstrap.

## What a Play Store release would additionally need

Sideloading this APK needs none of the below; they apply only to publishing on
Google Play:

- A Play Console account (one-time **US$25**).
- An **App Bundle** (`.aab`, `bundleRelease`) rather than an APK, and enrolment
  in Play App Signing.
- A hosted **privacy policy** URL and a completed Data Safety form.
- Store listing assets (feature graphic, screenshots) and content rating.
- Review, which can take days.
