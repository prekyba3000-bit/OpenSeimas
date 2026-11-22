# Evaluation P0 fixes — search zeros, the loyalty "bonus", credential rotation

2026-11-22. Stage 0 of the plan that follows the whole-repository evaluation
(`.evaluation/20261118-235807/REPORT.md`, 5.2/D, "Ready with conditions").
Branch `fix/eval-p0`.

## Recon (§1.8)

- **CORA-01.** `MpsListView` answered a query of two or more characters by
  calling `/api/v2/heroes/search` and mapping each profile to a list row with
  `vote_count: 0, attendance: 0` (`mapMpProfileToSummary`). It then re-filtered
  those rows by name, so a faction query — which the placeholder invites —
  returned nothing. The list's own roster (`/api/mps?status=active`, already
  loaded, 140 rows) carries the resolved figures. Search also cost up to 1,401
  database statements per pause in typing (PERF-01).
- **CORB-07.** `hero_engine._build_forensic_breakdown(_fast)` builds
  `loyalty_bonus = {status: "warning", bonus: 10}` for 10–40 % disagreement with
  the faction (`100 − party_loyalty`). `public_breakdown` stripped only the
  `_composite_` keys and three named aggregates, so the sub-object, and a
  `penalty` in each engine, crossed the wire. The client mapped it into a
  „Sutapimas su frakcija" flag, and `forensicSeverity.test.ts` asserted it
  rendered as "medium". The verdict guard ran on an empty cursor, where the
  bonus is always 0.
- **SECF-02.** Recorded exposure 2026-08-11. `prod.env` unchanged since
  2026-08-12; backups still succeed with it. Rotation is the human's (§4.3).
- **Zod and the contract test.** `rawForensicBreakdownSchema` required
  `loyalty_bonus` and `penalty`, so removing them from the API first would fail
  every profile's parse. `wireContract.test.ts` fails when the client silently
  strips a key the fixtures carry, which shaped the two-step below.

## What changed

| Step | Change |
|---|---|
| Client (ships first) | Search filters the loaded roster through `utils/rosterSearch.filterRoster` (name or faction, diacritics folded via `frontPage.fold`). The server search call, its debounce, toast and error panel are gone from the list (`api.searchMps` stays for API users). The forensic mapper no longer reads `loyalty_bonus` or `penalty`; both stay *declared optional* in zod until the API stops sending them, so the contract test still sees every key. The loyalty flag is no longer built. The Storybook story lost the bonus and penalties. |
| API (ships second) | `public_breakdown` drops `loyalty_bonus` and strips `penalty`/`bonus` from every engine sub-object. The engine still computes them internally (removing the composite code is ARC-07, Stage 5). The hero fixtures were edited mechanically to that shape (50 deleted lines; refreshing them from production would need the production DSN, which agents no longer use). The nullability contract drops the removed path. Then the client's two optional declarations go. |
| Migration 054 | Corrections entries `members-search-showed-zeros` and `loyalty-bonus-verdict`; methodology `loyalty_bonus` v1 (retirement, effective at once — no figure changes, a verdict stops being shown). Idempotent; applied twice on a fresh database. |
| Ops | `scripts/local-ops/rotate_check.sh` and `docs/ops/credential-rotation.md`. The check proves the new DB password connects, Render's readiness reaches the DB, admin refuses no token (401), accepts the new token (422 on a deliberately invalid status, nothing written), and optionally that the old values are dead. It prints no secret. |

## Tests (added; none deleted)

- `views/MpsListView.search.test.tsx` — 4 tests. Each failed on the old view
  (zeros, unknown, accents, faction) and passes now. The first version passed
  on the old code because it asserted before the 300 ms debounce; it now waits.
- `utils/forensicSeverity.test.ts` — the assertion that pinned the loyalty
  flag as "medium" is inverted: no loyalty flag, no `penalty` on any flag.
- `tests/test_no_verdicts_on_the_wire.py` — the populated breakdown (loyalty
  None, 75, 95) and every committed hero fixture carry no `bonus`/`penalty`/
  `loyalty_bonus` and no `warning|flagged|critical` status. All four failed on
  the old engine.
- `tests/test_rotation_probe.py` — the probe's contract with exact codes
  (401/401/422/503) and a database spy that must never be called.
- Counts: backend **501** on a fresh database (493 + 4 verdict + 4 probe);
  dashboard **494** (490 + 4 search + 1 loyalty − 1 generated contract case
  for the removed path); `tsc` clean; `vite build` built. The pre-push hook
  itself could not run: the system Postgres it expects is stopped since the
  reboot, so the same steps ran against a throwaway container.

## Rendered audit (client step, against the production API)

Local dev server on `127.0.0.1:5173` reading `seimas-api.onrender.com`
(read-only public GETs), headless Chrome:

- Browse: 140 cards, 0 showing „0 %".
- „simonyte" → Ingrida Šimonytė, 2442 votes, 91 % — the same as browsing.
- „skvernel" → 1 card, 1612, 94 %. „nemuno" → 17 members of the faction,
  none at 0 %. Phone width 390 px, „gedvil" → 3 cards with their figures.
- Profile of Agnė Bilotaitė against the *old* API (which still sends the
  bonus): renders, no error screen, no bonus wording. This is the
  old-API/new-client combination the two-step relies on.
- Still visible and **not** in this batch: the four deleted engines listed as
  „Duomenų nėra" (CORF-04, Stage 1), and the hub's link that highlights the
  `loyalty` flag on a profile, which now highlights nothing (CORF-01 rework).

## Production check of the client step (2026-11-22)

`fb73613` served as `index-BQo2Kbz0.js` on both Vercel hosts. Same probes as
above against the live site: 140 cards and none at „0 %"; „simonyte" → 91 %;
„nemuno" → 17; phone „skvern" → 94 %; Bilotaitė's profile renders against the
API that still sends the bonus, with no bonus wording.

## Deploy order (wire change, §3)

1. Push the client commit. Vercel deploys; verify search and a profile.
2. Push the API commit (with migration 054 and the client clean-up). Render
   deploys; verify `/api/v2/heroes/{id}` has no `loyalty_bonus`/`penalty`, and
   the profile still renders. The corrections and methodology entries apply on
   the next daily sync.

## LT-COPY inventory (added this session)

All in `migrations/054_corrections_search_zeros_and_loyalty_bonus.sql`,
marked `LT-COPY: needs native review`:
- correction `members-search-showed-zeros` — description and resolution note;
- correction `loyalty-bonus-verdict` — description and resolution note;
- methodology `loyalty_bonus` v1 — title and body.
No new UI strings. Removed: „Ieškoma serveryje...", „Tinklas lėtas, ieškoma…".

## Open

- SECF-02 rotation: the human's step; the runbook and check are ready.
- The hero fixtures should be re-captured from production after the API
  deploy (`refresh_wire_fixtures --check` will show no drift if the edit was
  exact).
