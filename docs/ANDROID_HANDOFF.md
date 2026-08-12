# OpenSeimas Android — „Atviras Seimas" (final)

**Status: complete.** A release-signed APK builds from a clean tree with one
command, installs, and was walked through screen by screen on an emulator. The
dashboard changes are live on Vercel; the backend CORS change is live on Render.

Last updated 2026-08-12.

---

## 1. What this is

A Capacitor wrapper around the existing React dashboard (`Seimas.v2/dashboard`).
The app **is** the dashboard's production web build inside a native WebView —
one UI codebase, so a new dashboard screen ships in the app on the next build.
There is no second frontend.

| | |
|---|---|
| appId | `lt.openseimas.app` |
| App name | „Atviras Seimas" |
| Version | `0.1.0` (versionCode 1) — `android-app/android/version.properties` |
| min / target SDK | 24 / 36 · JDK 21 · Capacitor 8.5.0 |
| API | `https://seimas-api.onrender.com` (baked in at build time via `VITE_API_URL`) |

## 2. Build

```bash
npm run android:apk          # from repo root
# or: cd Seimas.v2/dashboard/android-app && ./build-apk.sh
```

Dashboard `vite build` → assert the prod API URL is in the bundle → `cap sync` →
`gradle assembleRelease` → `apksigner verify` → print path/size/sha256. Requires
`ANDROID_HOME`, JDK 21, and `~/.config/openseimas/android-signing.env`.

**Final APK** (from the clean-rebuild run):
`Seimas.v2/dashboard/android-app/android/app/build/outputs/apk/release/app-release.apk`
· 4.5 MB · sha256 `53825b4f771b9c3932d8b6994cdeeb51ce131aaff95fc0d057c30ba9daefdc4d`
· APK Signature Scheme v2, signer `CN=Atviras Seimas`.
(The hash changes per build — Gradle embeds timestamps. Signature and contents
are what matter.)

### Reproducibility — verified
`rm -rf android/` then the one command regenerates the native project from
`patches/` and produces a fresh signed APK. After the rebuild, **0 tracked files
differ** from the committed tree. Tested twice; the first run exposed a real bug
(Capacitor's stock `.gitignore` silently dropped the keystore-ignore rules),
which is fixed and now covered by `patches/android-gitignore`.

## 3. Credentials — one place each

**Production secrets** live only in `~/.config/openseimas/prod.env` (mode 600):

```bash
source ~/.config/openseimas/prod.env    # exports DB_DSN, SYNC_SECRET
```

- `DB_DSN` — Neon production database.
- `SYNC_SECRET` — Bearer token for `POST /api/admin/*`.

The repo `.env` no longer carries a `SYNC_SECRET`; it previously held a
`change…` placeholder that silently failed against production and cost a
debugging cycle. A backup of the pre-edit file is at `.env.bak-android-handoff`
(gitignored, 600). **Convention: production credentials come from
`~/.config/openseimas/prod.env`, never from the repo.**

### ⚠️ The release keystore is irreplaceable
Android only accepts an update signed with the same key. **Lose it and this app
can never be updated** — a new key means a new package users must uninstall and
reinstall.

- Keystore: `~/.config/openseimas/openseimas-release.keystore` (600)
- Passwords: `~/.config/openseimas/android-signing.env` (600)
- Cert SHA-256:
  `6B:56:EF:B4:0B:52:5B:E9:1A:AC:9E:B3:D9:FA:2D:EA:B8:1C:B7:41:E7:BE:55:22:DC:4A:B1:9E:51:17:8E:B8`

**Both files belong in the off-machine backup set, alongside the DB dumps.**
Neither is in git; `*.keystore`, `*.jks` and `android-signing.env` are gitignored
at two levels as a backstop.

## 4. What shipped (commits, all pushed)

| Commit | What |
|---|---|
| `e6ebbf8` | **CORS** — added `https://localhost` (the Capacitor WebView origin) to `ALLOWED_ORIGINS`. Without it every API call from the app failed preflight. |
| `b772fe4` | **Mobile fit** — sidebar no longer opens over content; Stebėsena card layout below `md` (was a 900px table); seat-map tap-to-reveal (`useTapReveal`, tested); ≥44px targets; self-hosted Inter (no Google Fonts request). |
| `2cfb5b9` | **Cold start + offline** — 70s budget for the first request of a session (Render sleeps 15–50s), 8s once warm; „Jungiama prie serverio…"; offline vs. server-unreachable screens with retry. No API caching, so nothing stale can render as current. |
| `52d6cb2` | **The app** — Capacitor project, original icon + splash, native shell, signing, `build-apk.sh`, `bootstrap-android.sh`. |
| `bb29e6b` | **Invariant fix** — the profile header no longer publishes a suppressed metric (below). |
| `7854880` | **Polish** — status bar no longer overlaps the app header; Android 12+ splash is dark, not the default white. |
| `5055836` | **Reproducibility** — keystore ignore rules survive a regeneration. |

Dashboard tests: **72 passing (14 files)**, up from 52 at the start.

### The IntegrityBar invariant leak
The metrics grid hid Skaidrumo indeksas while the header `IntegrityBar` read
`forensicBreakdown.finalIntegrityScore` directly and rendered
**„Skaidrumo indeksas 100.0"** — the baseline the engine returns for everyone
when the forensic tables are empty. Two surfaces on the same page disagreed, and
the one at the top showed a perfect score.

`IntegrityBar` now takes `number | null` and renders the shared
`DIMENSION_UNAVAILABLE_LT` note (no number, no progress bar) when the metric is
hidden; `MpProfileView` feeds it `readMpDimension(profile, "integrity")` — the
same rule the grid uses, so it resurrects on its own once the forensic ingests
land. Covered by `IntegrityBar.test.tsx` (asserts the suppressed value can never
render). Verified on Bilotaitė's profile **in production and in the app**.

## 5. Verification evidence

Screenshots in `docs/screenshots/android/` (real emulator captures, Pixel 6 API 34):

| File | Shows |
|---|---|
| `20-app-drawer-icon.png` | Launcher icon (blue circle, dark "A") in the app drawer |
| `21-splash-dark.png` | Dark splash (was the platform default white) |
| `02-landing.png` | Landing page; status bar no longer overlaps the header |
| `01-dashboard.png` | Dashboard, live data — 140 MPs, 5,277 votes, seat map |
| `03-nav-drawer.png` | Mobile nav drawer (DUOMENYS / SKAIDRUMAS) |
| `04-mp-list.png` | MP list, 140 members |
| `05-search.png` | Search "Bilotait" → 1 member |
| `06-profile-header.png` | **Invariant fix**: header shows the unavailable note, not 100.0 |
| `07-profile-metrics.png` | RODIKLIAI: Dalyvavimas 71.0, Partijos lojalumas 77.3, Patirtis 12.4, Teisėkūros aktyvumas 10.2, Viešumas 4.6, **Skaidrumo indeksas hidden** |
| `08-mp-replies-empty.png` | MP right-of-reply empty state |
| `09-stebesena.png` | Stebėsena mobile card layout, no horizontal scroll, „Kol kas nerodoma: Skaidrumo indeksas" |
| `10-methodology.png`, `11-methodology-v2-banner.png` | Methodology + the v2 14-day advance-notice banner |
| `12`–`14-corrections-*.png` | Correction form, filled, and the success state after a real submission |
| `15-corrections-log.png` | Public log with the app's correction marked **Išspręsta** |
| `16`, `17-command-palette*.png` | Command palette + live search (works on touch) |
| `18-offline-airplane.png` | Airplane mode → „Nėra interneto ryšio" + retry |
| `19-offline-retry-recovered.png` | Retry after reconnect → full data restored |
| `23-sources.png` | Duomenų šaltiniai |
| `30-coldstart-connecting.png` | „Jungiama prie serverio…" first-load state |
| `logcat-walkthrough.txt` | **0 fatal exceptions, 0 tombstones, 0 ANRs** |

The summary-history empty state („Ši santrauka kol kas redaguota nebuvo.") is
verified on the shared codebase at `#/dashboard/istorija/mp/<id>` — see §6.

### The corrections loop, end to end
A correction submitted **through the app** (`Testas-Android-app`, id
`bd52aba7-fd32-4c98-8234-38539d95d0ae`) was triaged via
`POST /api/admin/corrections/{id}/status` → `resolved` with the note
„Patikrinta — pirmasis pataisymas, pateiktas per Android programėlę", and now
appears in the public log inside the app. **Maintainer queue: 0 open.**

## 6. Known limitations / follow-ups

- **Hash deep links don't route.** `am start -d "https://localhost/#/..."`
  delivers the intent but Capacitor loads its own start URL, so the app always
  opens at `/`. Fine for normal use (everything is reachable via the drawer and
  the command palette) but it means no external deep-linking, and it's why the
  summary-history empty state was captured on the web rather than on device.
  Would need `@capacitor/app` `appUrlOpen` handling.
- **Cold start not tested against a genuinely sleeping Render.** The connecting
  state was captured with a warm backend (the >3s came from WebView init). The
  70s budget is unit-tested but the real sleep path is unproven.
- **Emulator is slow.** Software GPU + WebView causes SystemUI ANRs and ~20s
  first paint. This is the host environment, not the app — the walkthrough
  logcat shows zero app ANRs.
- **No offline caching**, deliberately: the honest error screen beats risking a
  stale figure read as current. Revisit only with a visible age indicator.

## 7. What a Play Store release would additionally need

Sideloading needs none of this:
- Play Console account (one-time **US$25**).
- An **App Bundle** (`.aab`, `bundleRelease`) and enrolment in Play App Signing.
- A hosted **privacy policy** URL + completed Data Safety form.
- Store listing assets (feature graphic, screenshots), content rating.
- Review, which can take days.
