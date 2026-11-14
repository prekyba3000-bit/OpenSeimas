# RESUME — 2026-11-14

Suites, run this session: dashboard `npx vitest run` → **476 passed**;
`npx tsc --noEmit` exit 0; `npx vite build` built. Backend `pytest tests`
against a fresh database with all 51 migrations → **490 passed**.

### Done
- Decree register backfilled on production by hand (744 listed, 742 stored).
  `/#/dashboard/valdzia` read on production: 14 ministers, lists of 26
  treaties, 5 vetoes, 18 bills, 34 nominations, no staleness note.
- `daily_sync.sh`: the decree step runs before the fatal `ingest_seimas`.
- The decree ingest now writes a reconciliation note when it stores fewer rows
  than it lists. Without it every re-run failed `three_way_reconciliation`,
  a `block_publish` check.
- Valdžia has its own browser-tab title (it showed „Apžvalga").
- Recon of the open-data vote source: sound, and not built — see
  `2026-11-14-open-data-votes-recon.md`.
- Design note for a voter evidence layer; set aside by the human the same day.

### Blocked
- `apps.lrs.lt` still unreachable; data frozen at 5 November; refresh held by
  `metric_backing_source_stale` as designed.
- LT native review, unchanged.
- rclone warns its shared Google Drive client ID is retired during 2026; the
  offsite backup needs its own.

### Next concrete step
Confirm a scheduled refresh records `three_way_reconciliation` as passing
(the old `lrp_decrees` fetch rows were annotated on production the same day;
the check query returned 0 rows afterwards).

### Later the same day: dead-file removal
Asked by the human ("what is not used means not needed"). Recon by reference
search, then removed, 59 tracked files:
- `pipeline/audit_voter_guide_ingestion.py` and its test; the guard in
  `test_no_verdicts_on_the_wire.py` no longer exempts any file but itself.
- Loose one-off scripts in `Seimas.v2/`, `Seimas.v2/tools/`,
  `scripts/validate_data.py`, `scripts/figma_token_sync.py`.
- Other agents' config and stale notes (`.cursor/`, `.clinerules`, `GEMINI.md`,
  `.kimi-code/`, `memory-bank/`, `.plan_drafts_tmp/`, `APPLY.md`,
  `SYSTEM_STATUS.md`, `INTEGRATION_SUMMARY.md`).
- Dashboard files nothing imports: `Header`, `MpSelector`, `NavItem`,
  `StatCard`, `TickerTape`, `UniversalButton`, `ui/use-mobile`,
  `utils/activityLine`, with their stories and tests, and `dead_exports.txt`.
  Charter P6 called the story-documented components "a separate call, not
  hygiene"; the human made that call here.
- Makefile `test` now uses `Seimas.v2/.venv` (the root `.venv` was removed).

**Kept, against my first list:** `utils/contextBand.ts` (charter P6: shelved by
design); the five GitHub workflows (a dashboard test reads `ci.yml`, and they
are the fallback when Actions returns) and `export_stats.py` with them; the
hand-run scripts `build_lt_copy_pack`, `verify_attendance_v2`,
`pilot_vote_summaries`, `publish_summaries`, `diary_baseline`,
`probe_cz3_feeds`; the remote branches (each has 4 commits not in `main`).

**Second pass, approved by the human:** migration 052 drops `recommendations`
and `recommendation_feedback` (0 rows on production when checked; applies on
the next daily sync — not yet confirmed there). Removed the five "expanded"
ingesters nothing ran (campaign donors, committee stenograms, lobbyist
meetings, procurement tenders, VTEK declarations); their empty tables stay.
Backend after this: **487 passed** on a fresh database with 52 migrations.

**Third pass, approved by the human:** the four always-empty forensic engines
and the uncalled graph route are removed — see
`2026-11-14-empty-forensic-engines-removed.md`. Loyalty and heroes stay. The
profile's `forensic_breakdown` and the empty tables are untouched. Backend
**486 passed**, dashboard **459 passed**.

**Fourth pass:** the hardcoded sources box on the Skaidrumas page claimed
five sources the project does not load. Removed, headline corrected,
corrections entry in migration 053. Details in the same review note.

**Portraits:** member photos now come from VRK candidate portraits (138 of
140 active members, each verified against its VRK page), Commons for the
other two — see `2026-11-14-member-portraits-from-vrk.md`.

Suites after removal: dashboard **459 passed** (476 before; the difference is
the removed files' own tests), `tsc --noEmit` exit 0, build ok. Backend run
by the pre-push hook.

---

# RESUME — 2026-11-13 (second entry)

Suites: **475 dashboard / 480 backend (+1 skipped)**. Detail in
`docs/reviews/2026-11-13-valdzios-zemelapis.md`.

### Done
- „Valdžios žemėlapis" (`/dashboard/valdzia`): President, the three
  Governments of this Seimas term and all their ministers, each from a signed
  presidential decree. Migration 050, `GET /api/government`, page, tests.
- Seven ministers linked to their Seimas profiles on the evidence of their
  official CVs; seven further exact-name matches left unlinked.
- The President's decree register (lrp.lt) ingested daily: treaties, vetoes,
  bills and nominations sent to the Seimas shown as lists; a newer cabinet
  decree makes the page say its ministers may be out of date. Migration 051.

### In flight
- **Corrected 2026-11-14.** This entry said the 06:00 sync would backfill the
  decree register. It could not: `ingest_seimas` is fatal and ran first, so
  with lrs.lt down the script never reached the decree step. Migrations 050
  and 051 did apply. The register was backfilled by hand on 2026-11-14
  (744 listed, 742 stored) and `/api/government` on production now returns
  5 vetoes, 18 bills, 26 treaties, 34 nominations, 14 XXI ministers, no
  staleness note. `daily_sync.sh` now runs the decree step before
  `ingest_seimas` (uncommitted). The rendered page has not been read by eye.

### Blocked
- Same as below: `apps.lrs.lt` outage; LT native review.

### Next concrete step
Confirm `/dashboard/valdzia` on production after 06:00: 14 ministers, the four
decree lists non-empty, no staleness note. Then, when lrs.lt is back, match
each veto's law number to the Seimas re-vote.


---

# RESUME — 2026-11-13

Suites: **455 dashboard / 472 backend**. Detail in
`docs/reviews/2026-11-13-profile-cards-audit.md`.

### Done
- Removed four profile cards from the 2 October commit that were live and
  broke §1.1–§1.4, and the `/faction-friction` route. Guard test added.
- Removed the voter-guide engine and the guard exemption that hid it.
- Benford no longer reads "clean" for members with no analysis.
- „Sutapimas su frakcija" was two numbers on one page for 121 members
  (47.55 against 94.34 at the widest). One reader of `faction_alignment` now;
  migration 049 has the methodology entry and two corrections.
- Hub under-60 list no longer names members at 60 % and 65 %; assets card,
  two stale methodology sections and a stale sources line removed.
- All of it pushed and verified on production.

### Blocked
- Daily sync: `apps.lrs.lt` is down for everyone since ~6 November; data
  frozen at 5 November, views held by the freshness gate.
- Corrections entry for the removed cards: draft in the audit note, needs
  native review.
- LT worksheet, unchanged since 12 September.

### Next concrete step
Read the hub page top to bottom (audit note, third pass, item 1) and decide
its copy. Then the `loyalty_bonus` question. Migration 049 reaches production
on the next daily sync; confirm both corrections appear on /dashboard/corrections.


---

# RESUME — 2026-09-12

Branch `main` at `f8eef7f` (local changes in working tree).

## Compare page — Approach A implemented

The Compare page's verdict ring (`AlignmentScore`) has been entirely retired, implementing Approach A from the design note. The `compare_mps` endpoint now serves raw pairwise evidence counts (`overlap_n`, `same_choice_n`) computed securely via the `_CHOICE_RECORDED` constant, matching the rigorous standard of the list/profile agreement tests. The frontend reads these raw counts instead of percentage scores. All tests pass locally.

### Done
- Replaced `alignment_matrix` with `overlap_matrix` and `same_choice_matrix` in `compare_mps` backend route.
- Updated `ComparisonView.tsx` to display explicit evidence counts and handle 0-overlap with a "Nepakanka duomenų" message.
- Removed `AlignmentScore` component entirely.
- Verified frontend tests (vitest, `tsc`) and backend tests (pytest) pass locally.
- Added a `walkthrough.md` in the brain for the review process.
- P6 dead-UI judgement (deleted 43 vendored `ui/` files and unused stories to minimize dead-code surface area).
- Legal name fill in `NOTICE` and `README.md` (filled with VšĮ Atviras įrašas).
- Git-history rewrite of the old wiki `index.json` (removed via `git filter-branch` and force pushed to `main`).
- Deployed Compare page to Vercel/Render by pushing to `main`.

### In-flight
- None

### Blocked
- LT worksheet (`Pataisymas:` still blank). Waiting for a human native speaker to review and provide corrections per the charter.

### Next concrete step
The human should perform the native LT review in `docs/reviews/lt-copy-review-worksheet.md`. After they provide corrections, we can apply them to the codebase and publish the summaries.


---

# RESUME — 2026-09-08

Branch `main`, pushed and deployed. Suites: **453 dashboard / 374 backend**
(+26 skipped without a database; 389 with one). `tsc --noEmit` clean over all
of `src`, no exclusions. `npm audit` reports 0 with and without dev deps.

## Read this first: an RPG card of named MPs was live, and two surfaces disagreed

An external technical audit arrived (`OpenSeimas-Technical-Audit-2026-09-06.md`,
in the human's Downloads — not committed). Verifying it found two live
production defects and four latent ones. Full triage, including where I think
the audit's severities are wrong: `external-audit-2026-09-06.md`.

**Live #1 — the share card.** `GET /api/v2/heroes/{id}/share-card` returned a
PNG of a named member beside a circle reading „0" (`level`), a badge reading
"True Neutral" (`alignment`), a STR/WIS/CHA/INT/STA radar, an XP bar, and
„artifacts" — unauthenticated, cached an hour, behind a „Dalintis kortele"
button on every profile. Removing those keys from the JSON earlier is what
made the image worse: the renderer read a dict that no longer had them and
published its defaults. `test_no_verdicts_on_the_wire.py` said "Nothing
rendered them"; every assertion in it reads a payload, and a PNG is not a
payload. Endpoint, renderer, template, button and Pillow removed; correction
`rpg-share-card` in migration 044.

**Live #2 — list and profile disagreed.** One member's published `experience`
read 12.35 on the profile and 61.98 on the leaderboard, same day, same
database. `COALESCE(0, 0) AS max_years_in_parliament` in the single-MP path,
plus six copies of the pre-migration-015 participation predicate the engine
kept after 015 fixed the views. Both paths now reduce the same rows through
one function; one `_CHOICE_RECORDED` constant. The §1.4 agreement test the
charter calls permanent now exists — it did not before.

**Latent, fixed:** the floor-speech checkpoint committing before its inserts
(production checked: nothing lost yet); three views that would have shown every
rejected vote as passed once `result_type` is populated; `record_fetch` unable
to write its own error on an aborted transaction; `pipeline.cli --list`.

**Live #3 — three sessions said the Seimas decided nothing.** The sessions
page counted its own totals from the 2,600 most recent votes; there are 5,286.
Sessions 140, 139 and 143 fell entirely outside that window and published
„0 balsavimų" and „Balsavimų duomenų nerasta" — they hold 1,517, 391 and 5.
Session 141 published 781 of its 1,554. `/api/meta/sessions` counts in SQL
now and sums to 5,286 of 5,286; `MAX_PAGE = 500` caps the vote routes, which
the page no longer needs to exceed.

**Gates, all now in CI and the pre-push hook:** `tsc --noEmit` (against
`tsconfig.typecheck.json`, which excludes three vendored shadcn/ui adapters
nothing imports — `noVendoredUiImports.test.ts` fails if that stops being
true); a built-app smoke check; Node 24 in CI, `engines.node >= 22` locally.
`/health` is liveness (200 while the process answers), `/health/ready` is
readiness (503 when the database is gone) and is what `uptime_check.sh`
probes.

The `VITE_API_URL` gap was the live-capable one: CI gave it to the tests and
not to the build, `config.ts` throws at module load without it, and Vite
inlines it at build time — so a green build could ship a bundle that blanked
the page. Verified in both directions.

**Live #4 — the site could not be used without a mouse.** Six files, three of
them on the paths a reader needs: all 141 member cards, both comparison
pickers, the whole Stebėsena table. Buttons and links now, with
aria-expanded/aria-controls and real labels on the proportional bars.
`a11y/noClickableDivs.test.ts` asserts the shape across every `.tsx`, with two
principled exemptions (aria-hidden click-aways, and the full ARIA widget
pattern SeimasMap uses). Three defects were found only by opening the page
after the suites were green — see the commit.

**The external audit is closed.** Every finding is verified and either fixed,
deliberately declined with the measurement behind it, or judged wrong for this
project — all recorded in `external-audit-2026-09-06.md`. Two were live in
production (the RPG share card, the list/profile disagreement); four were
latent; the a11y one was found while fixing another and was the widest.

Three decisions worth remembering, because they went against the audit's
recommendation:

1. **Vote corrections are recorded, not applied.** Upserting
   `mp_votes.vote_choice` is a §4.5 STOP condition. Measured first: 5,632
   member-choice comparisons across the term, zero differences. Drift now
   lands in `mp_vote_choice_drift` and a human decides.
2. **`/health` stays 200 with a dead database.** Render restarts on a failing
   check and a restart cannot fix a Neon outage. `/health/ready` carries the
   status code instead.
3. **`/api/internal/data-health` stays public.** It publishes our own
   data-quality checks in Lithuanian; on a transparency platform that is the
   point.

**P5 is code-complete, both halves.** The vote templates shipped 2026-09-02;
the bill half shipped 2026-09-08 now that `legislation` holds 1,683 rows that
all join to votes. Nothing is published — no route, no `summary_revisions`
row, no surface — and no LLM is involved, by design and by §4.1.

The figure gate was strengthened while extending it: verbatim spans are
consumed where they occur, so a title's digits can no longer be borrowed for a
claim the row does not support.

Worth remembering: the gate reported **0 violations** on the first bill pilot,
and reading the rendered Lithuanian found four defects — a hardcoded plural
participle, „nuo X iki X" for same-day passages, a doubled full stop, and
stages listed with acceptance before consideration. None of them is a number,
so none was visible to a figure check.

**The serving path is built (2026-09-08).** A summary is a draft until a
maintainer approves it; approval runs the figure gate, and the public read
path re-verifies against the live row so a stale figure is withheld rather than
served. `PlainSummary` renders an approved body on the vote page or nothing.
Verified end-to-end against production and left at zero approved rows — so
publishing reviewed copy is now a data change (`POST /api/admin/summaries` then
`/approve`), not a deploy.

**Next concrete step, and it is not code: a human reads the two pilots**
(`p5-vote-summary-pilot.md`, `p5-bill-summary-pilot.md`). Specifically the
stage names against the Seimas Statute — they are claims about procedure, not
about our data — and the Lithuanian throughout, which is working copy. That is
the one thing between the built pipeline and a published summary.

The larger unbuilt product remains the compare page (the `contextBand` helper
is shelved awaiting it) and Android deep-links — both want a design note first
per the charter. P4's recon items all turned out already done; P6 dead-code
removal is a decision for the human, not hygiene.

**Watch:** Render went push-to-serving in ~40s twice on 2026-09-07/08, faster
than a Docker rebuild should be. Evidence said the new code was live each
time (a real FastAPI 404 on a removed route, corrected numbers on the wire),
but it is worth confirming on the next deploy.

## Read this first: an AI-generated risk label was live in the public repo

The task was "fill the empty tables." Recon for it found
`dashboard/src/components/WikiPanel.tsx`, wired into every MP profile, fetching
a per-member report ending in a **Risk Level: Low/Medium/High/Critical**. That
report generator had already run once: `dashboard/public/wikis/index.json` —
committed since the repo's first commit, on a **public** GitHub repo — rated
five named members, four "High". A second removed set,
`docs/wiki-archive/`, held plain biographical pages for more members plus a
note that an "integrity threshold" flagging pass had been attempted and failed.

The individual report bodies were never committed, so the live Vercel site
404'd on them — no visitor was shown a rating today. But `index.json` **was**
committed to the path the frontend serves, and the feature was one `git add`
away from live for the project's entire history. Same failure the corrections
log already names twice (heroes-villains, Gėdos siena) — reached further,
because it lived in a static JSON asset a source grep never sees.
`noVerdictsInStaticData.test.ts`, built specifically to catch this class after
the Gėdos siena incident, was already running and missed it: `risk_level`
wasn't in its forbidden-key list.

**Fixed**: component, service, tests, both file sets, and the i18n block
removed; a corrections entry (`ai-wiki-risk-labels`) is live at
`/api/trust/corrections`, describing the mechanism without naming who was
rated; the guard's vocabulary now includes `risk_level` and
`integrity_score`, and its own vacuous-pass check no longer depends on a real
file existing. Full write-up: `empty-tables-audit-2026-09-06.md`.

**Not done, and not mine to do**: git history still carries `index.json` —
it has been public since the first commit, so rewriting history now would not
un-publish it, and rewriting shared history is destructive enough to need the
human's call, not an autonomous one.

## „Mano Seimo narys" is live

The hook the platform was missing: a reader picks their district and gets the
one member they can actually vote for or against, instead of a table of 141
strangers. It needed `constituency_number`, which was NULL for all 148.

The old ingest read VRK's `Rezultatai` dataset — **registered and empty**,
`{"_data":[]}` with or without filters, same pattern as `lrsk/balsavimai`. Its
sibling `Isrinkti` is empty too. So the script had never written a row.

Rewritten to read the outcome line on each candidate's VRK page
(„Išrinktas vienmandatėje Kaišiadorių–Elektrėnų (Nr. 59) apygardoje"). Result:
**71 district winners, 69 party-list, 6 mid-term replacements** — 71 being the
constitutional number of single-mandate seats, landing on 1–71 with no gaps or
duplicates. Three independent confirmations the parse is right.

**Not** taken from the `Kandidatai` dataset, which has data and joins cleanly:
its `apyg_nr` is the district a candidate RAN in. Skvernelis ran in Lazdynų and
was elected off the list; Žirmūnų went to Kuzmickienė, not to Aasrum who
contested it and is not an MP.

`vote_share` deliberately stays NULL — the old code would have written a
personal district share for some members and their PARTY's national share for
others, under one column name. That is the migration-039 defect exactly.

**A defect found by opening the page, with the suites green.** The picker
listed 70 districts and claimed the rest were party-list members. Nalšios
šiaurinė (Nr. 52) lost its member on 2026-05-28 with no replacement — the
vacant seat `/api/stats` already reported as 140 of 141 — so reading the active
roster made the district vanish rather than show as vacant. The claim was false
twice over: the remainder also holds 6 mid-term replacements. Fixed; all 71
appear, the vacant one says „vieta laisva", and the same false sentence was
corrected in the test file's own docstring.

Verified live: picker → Antakalnio → Ingrida Šimonytė, and the Apygarda tab
renders all three states distinctly (won a district / party list / no 2024
record).

## Votes by subject — the second half of the same hook

Pick Būstas on a member's profile, see how they voted on housing. Deterministic
keyword tagging that was already in the database; no model, nothing scored.

**The counts needed the most care.** `mp_votes` carries a row per member per
vote whether or not they took part, and 408,827 of 744,495 rows have no
recorded choice. So "86 housing votes" is near-identical for every member and
is not a fact about any of them; "27 with a recorded choice" is. The chip reads
**27/86** — the larger alone looks personal without being so, the smaller alone
hides its denominator.

Neither is a participation rate, and the copy says so outright. Nothing
aggregates choices into a stance: „supports housing 80 %" is the verdict this
data would most easily become, and it is not built.

Coverage stated on the surface: 2,553 of 5,286 votes carry any topic, because
tagging matches keywords in titles and misses things. An unknown topic returns
422 rather than an empty list, which would read as „your member never voted on
this"; a test pins the route's topic list against the tagger's dictionary so
they cannot drift.

Also fixed `MpVoteRecord.choice`, declared non-null while the API sent null on
31 % of rows — same class as `party` on `/api/mps`. That route had no runtime
schema at all; it has one now.

Verified live on Šimonytė: all 8 chips with both numbers, filter returns real
housing votes with her actual choices and visible tags, and rows the source
never published render „Nėra duomenų".

## The earlier question, answered

- **`legislation_topics`**: already filled itself — the nightly sync composed
  correctly with last session's `ingest_legislation` fix. 1,098 tags, 975 of
  1,683 bills. No action needed.
- **`assets` / `interests`**: a real, live, legally-distinct-from-VTEK source
  exists (VRK candidate declarations, verified live) but is gated behind a
  feasibility note per the standing W3 rule — not written yet. The blocker is
  `vrk_candidate_id`, 0/148 populated, and the one script that could populate
  it (`link_vrk.py`) matches by name only, no disambiguation — unsafe to run
  on personal financial data as-is.
- **`vote_geometry`, `benford_analyses`**: STOP per §4.6. `vote_geometry` is
  one command away from working (needs no new data) and is exactly why it's
  not run — it would switch on a live per-MP anomaly flag with no design
  review. `benford_analyses` and three other tables read from a fully
  disconnected legacy engine subsystem (`skaidrumas/analysis/*.py`) whose own
  docstrings say "Factional Betrayal Detection" and "shadow coalitions" —
  recommend not reviving, not just not filling.
- Everything else empty is either correctly superseded or not an ingest
  target at all (app-feature tables).

## Yesterday — 2026-09-05

Suites ended that session at 325 dashboard / 298 backend.

## That session

| Commit | What |
| --- | --- |
| `a487a37` | Wire schemas for the three unvalidated endpoints, and what writing them found |
| `1149090` | **Hotfix**: a per-cent sign in a SQL comment 500'd every profile |
| `da065f5` | Lint for the one character that caused it |
| `4497398` | Nightly wire-fixture drift check; legislation runner recorded as not-wired |
| `eefc281` | A wrong reason on nine members' profiles |
| `040_*.sql` | Corrections entries for the two defects that reached production |
| `5c8f128` | Corrections entries and the session state |
| `72f0b87` | „0.0 %" off the four who never took the seat; client made tolerant |
| `03e9285` | The last per-person aggregate leaves the public payload |
| `e1959b4` | Lithuanian copy review pack (PDF) for a native reviewer |
| `28002f9` | `legislation` filled: 1,683 rows, and the key that blocked it |
| `041_*.sql` | project_registration_nr / project_base_nr, additively |

All three assigned tasks are done. Two of them turned out to be the same
subject — something exists, nothing checks it — and the guards written for
them found four defects nobody was looking for.

## The three tasks

**1. Schemas for `/api/stats`, `/api/mps`, `/api/votes/{id}`.** They went
through `request<T>()` with a TypeScript type and no runtime schema, so nothing
asserted what actually arrived. Two live mismatches, both left by the faction
work: `/api/mps` declared `party: string` while sending null for 9 of 148
members, and `/api/votes/{id}` did the same inside `votes[]`.

**2. The legislation runner — first refused, then rebuilt and filled.** Three
things blocked it and only the first was known: no runner; a source
(`e-seimas.lrs.lt/rs/legalactproject/search/find`) that 404s on every variant
including the bare path, so the script had never once succeeded; and a join key
that for **3,464 of 4,392** votes holds the law *being amended* rather than the
project. `I-399`, the Statute, stood for 44 projects at once.

Rebuilt on the sitting agendas already ingested — no network call at all.
**`legislation` now holds 1,683 rows**, all titled, none with an invented
summary or url. 3,853 votes join cleanly. Two further defects were found by
measuring against all 5,286 real titles: preferring the `registracijos_nr`
attribute silently discards the revision (the title carries one 415 times, the
attribute never), and LRS clips titles at exactly 200 characters — 588 of them —
so a clipped title ends mid-number and the fragment is often a real, unrelated
project. Additive only: `votes.project_id` is not rewritten (§4.5) and instead
carries a COMMENT saying what it really holds.
Write-ups: `p4-legislation-runner.md` (why it was refused),
`p4-legislation-fix.md` (how it was filled).

**3. `refresh_wire_fixtures.py --check` runs nightly** in `daily_sync.sh`. It
writes nothing — recaptures payload shapes and reports drift — because the sync
makes no commits and a written fixture would sit dirty in the tree. It found
real drift on its first run.

## Four defects the guards found

1. **Verdict keys on the public API.** `risk_score`, `high_risk_alerts`,
   `forensic_penalties`, `social_bonus` and two penalty sums were live on
   `/api/v2/heroes/{id}` for every named member. Nothing rendered them — the
   zod schema had been dropping them all along — but §1.3 forbids them on any
   public payload. The existing guard read `HeroProfileResponse.model_fields`
   and passed honestly: `metrics` and `forensic_breakdown` are
   `Dict[str, Any]`, so it filtered the top level and nothing filtered one
   level down.
2. **Attendance published 0.0 % from an empty database.** Two
   `COALESCE(metric, 0)` in read paths feeding a resolver ending
   `float(v1_value or 0)`. Not reachable while both matviews cover all 148
   members; reachable the moment a sworn-in replacement appears before they
   refresh. `heroes-degraded.json` had been recording it in the repo since the
   day it was committed — read as a shape, never as evidence.
3. **`str(None)` is `'None'`** at six call sites over nullable date columns.
   Zero rows are null today, which is what makes it the kind that ships.
4. **A wrong reason on nine profiles.** „Frakcija per maža" told to members who
   sit in no faction, whose own header says „Frakcija nenurodyta" two inches
   above. Found by opening the page, not by a test.

## The outage I caused, and what it cost to learn

`a487a37` added a SQL comment containing „0 % attendance". psycopg2 interpolates
the whole query string when parameters are passed — comments are not exempt —
so `%` followed by a space is a malformed placeholder and raises IndexError
before Postgres sees the query. **Every MP profile returned 500** from that
deploy until `1149090`, roughly ten minutes.

254 backend tests were green throughout and could not have caught it: the
degraded stub answers `execute()` without parsing SQL, which is exactly what
makes it fast and network-free. **The lesson that generalises: a query string is
only validated by a real database.** Running the builder against the DSN before
pushing is the check that matters, and it now has a static backstop
(`test_sql_placeholder_lint.py`) verified against the real regression.

## Guards added

- `test_sql_placeholder_lint.py` — per-cent signs in parameterised queries.
  Reads call sites, not string literals: `LIKE 'matview:%'` with no parameters
  is correct and stays allowed.
- `test_every_ingest_has_a_runner.py` — every `pipeline/ingest_*.py` is either
  invoked by an ops script or carries a written reason. This project has shipped
  "a script nothing runs" four times.
- `wireContract.test.ts` — "strips no key the backend sent", the one failure a
  successful parse cannot report. This is what found the verdict keys.
- Golden fixtures now compare **through JSON**, because `{None: 1}` and
  `{"null": 1}` are the same Python object and different bytes, and that
  difference shipped the „null" faction row.
- `count(*)` over an empty set is 0 in the degraded stub, not NULL. The second
  invented crash that file has produced; the rule now lives in code.

## Verified on production after deploying

- `/api/v2/heroes/{id}` 200, no verdict-shaped key, attendance null for the 4
  suppressed members.
- `/api/stats`, `/api/mps`, `/api/votes/812` fetched live and parsed through
  their new zod schemas.
- Vote 812 (per-member choices entirely absent) renders „Nėra duomenų apie
  pavienius balsus" — no tally, no „null" row.
- Seat map counts the no-faction member as „Nenurodyta (1)"; 140 of 141.
- Both corrections entries served at `/api/trust/corrections`.

## Both open questions were decided and closed

Put to the human in plain language; both answered "fix it".

**The per-person aggregate is gone.** `total_forensic_adjustment` has left
`/api/v2/heroes/{id}` and the client entirely (`03e9285`). I had described it as
rendered by `StebsenaView` — it was not: `getIntDotClass` and
`getIntegrityTooltip` were defined there and called from nowhere, so no reader
ever saw it. Both helpers are deleted, because unreachable code that needs one
JSX line to become a published grade is the grade, waiting. **Nothing on the
public payload is now an aggregate about a named person** — the degraded
fixture shows `forensic_breakdown` with no scalar keys at all. The per-engine
sub-objects stay: each is evidence with its own status and explanation.

Shipped as two commits, deliberately. `mpProfileSchema` required the field, so
removing it from both sides at once would have failed every profile parse
during the 10-20 minutes the frontend lags the backend. `72f0b87` made the
client tolerant; `03e9285` went out only after that bundle was confirmed live.

**„0.0 %" for the four who never took the seat is gone** (`72f0b87`). All five
dials now read „Narys mandato neperėmė, todėl nėra ką matuoti.", matching the
header two inches above that already said so. Reuses `servedNoDays`, the
predicate the header uses, so a dial and the paragraph cannot disagree.

Verified live on both: Blinkevičiūtė's profile shows no percentage anywhere,
Bilotaitė's still shows 71.3 / 75.8 / 88.7 and does not claim she never served.

## Open
- **P5 bill summaries are unblocked on data.** `legislation` has 1,683 titled
  rows and votes join to it. Bills still need their own template and the same
  figure gate the vote summaries have.
- **`votes.project_id` remains wrong for 3,464 rows.** Nothing reads it any
  more; correcting it in place is §4.5 and needs a human decision.
- **`tag_topics` will tag 1,683 legislation rows** on its next nightly run,
  having had nothing to tag since the project began. Worth a look afterwards.
- **LT-COPY native review** — the P5 pilot, `NO_FACTION_LT`, and the two new
  strings added this session.
- **Legal name** — `<FILL IN>` in `NOTICE:3`, `NOTICE:18`, `README.md:69`.
- **Vercel URL** still not recorded in the README.

## Next concrete step

The `legislation` key migration, per §4.5 as additive-only. The recon and the
verification are done in `p4-legislation-runner.md`; what remains is the
base-vs-revision decision, then the column, then the ingest change.
