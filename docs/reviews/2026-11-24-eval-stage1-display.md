# Evaluation Stage 1 — display integrity and unknown figures

2026-11-24. Stage 1 of the plan following the whole-repository evaluation
(`.evaluation/20261118-235807/REPORT.md`). Branch `fix/eval-stage1`.

## What changed

- **CORA-03 — no eligible sitting day means unknown.** `resolve_attendance`
  treats a missing `mp_attendance_v2` row as zero eligible days rather than
  falling back to v1's displayed zero. The bulk override includes every
  politician, so list, profile and leaderboard agree. Database tests insert a
  member with no eligible day and assert NULL on all three routes. The profile
  also suppresses all five comparison dials until a sitting day inside the
  member's mandate exists, with an explicit explanation.
- **CORF-01 — remove named-person ranking and verdict framing.** The hub's
  „Neįmanoma būti suktam" headline, under-60 list and ticker count are gone.
  Faction members sort alphabetically and no longer carry vote-for /
  vote-against attendance colours. Comparison uses „ir", not „VS"; monitoring
  and navigation use a table icon rather than a trophy.
- **CORF-02 / CORA-08 — monitoring shows every member.** The leaderboard
  request asks for 200, not the default 20. Rows without the sorted figure
  remain in a labelled unranked group with the correct cell count, including
  on phones. Null and placeholder factions render as no faction.
- **CORF-03 — dimension descriptions and units match the engine.** Experience
  and visibility drawers name every input, weight and current maximum.
  Legislative activity states its 60/40 weights. Experience, legislative
  activity and visibility display points „iš 100", not percent; attendance and
  faction agreement remain percentages.
- **CORF-04 — retired checks leave the surfaces.** Profiles no longer show
  four never-run engines as „Duomenų nėra". Methodology explains that they
  were removed and retains the old anchors.
- **CORA-02 — vote search tolerates no faction.** Null parties no longer throw;
  search folds Lithuanian diacritics as the members list does.
- **CORF-05 / unknown rendering.** A faction with no publishable attendance
  draws no bar. Attendance placeholders no longer acquire a percent sign on
  the seat map and other checked surfaces.
- **CORF-06 — remove unsupported static claims.** The map no longer promises
  real seating positions, the chamber roll-call count is not divided by the
  member count, and the sessions timeline labels both ends from its data.
- **Guard rewrite.** The backend complement guard recognises the general
  `100 - metric` shape instead of one exact spelling. Frontend surface guards
  cover the removed verdict forms and fallback-percent pattern.

Migration 055 adds corrections for the hub list, retired checks, monitoring
and dimension descriptions, plus methodology versions for visibility and
experience. CORA-03 has no corrections entry: the evaluation confirmed the
mechanism but found no member actually published at zero on 2026-11-22.

## Verification

- Fresh Postgres 18 container, bootstrap plus migrations 002–055:
  `55 applied, 0 already up-to-date`. A second run:
  `0 applied, 55 already up-to-date`.
- `DB_DSN=<fresh container> PYTHONPATH=. .venv/bin/python -m pytest tests -o addopts='' -q`
  → **514 passed in 5.52s**. This includes the six database-backed
  zero-eligible-day tests; an earlier run without `DB_DSN` skipped them and is
  not counted as verification.
- `npm run dashboard:typecheck` → exit 0.
- `npm run dashboard:test` → **63 test files passed; 519 tests passed**.
- `npm run dashboard:build` → Vite built 2,434 modules successfully.
- `git diff --check` → exit 0.

## Rendered audit

`node .evaluation/20261118-235807/stage1-browser.mjs` against the local Vite
server with deterministic API fixtures → `rendered audit passed`, 31 API
requests, `pageErrors: []`. Chromium at 1360 px and 390 px exercised:

- hub: neutral heading, no under-60 list or crookedness headline;
- factions: alphabetical members and no verdict colours;
- sessions: labels from the earliest and open latest session;
- vote detail: accented search and a member with null faction;
- monitoring: `limit=200`, aligned unranked rows and the unranked member still
  visible on a phone;
- newcomer profile: no numeric comparison dials, explanation present, retired
  checks absent, on desktop and phone;
- ordinary profile: point units visible;
- landing: no seating-position or per-member-vote claim.

Screenshots are in `.evaluation/20261118-235807/stage1-rendered/` and were
inspected after the run.

## LT-COPY inventory

All new Lithuanian UI strings and every new migration 055 correction and
methodology text are marked `LT-COPY: needs native review`. Native review
remains open.

## Release state

Locally verified, not yet shipped when this note was committed. Production
verification and the migration 055 daily-sync application are recorded in
`RESUME.md` when checked.
