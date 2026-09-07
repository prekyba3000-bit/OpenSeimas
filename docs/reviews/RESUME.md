# RESUME — 2026-09-08

Branch `main`, pushed and deployed. Suites: **350 dashboard / 354 backend**
(+19 skipped). tsc 11, all vendored `ui/`.

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

**Next concrete step, in priority order:**

1. `/health` returns 200 with `"status": "degraded"` when the database is
   down, so Render's health check cannot see a broken service. The fix is to
   split liveness from readiness; the open question is whether to point
   Render's `healthCheckPath` at readiness, which on a free tier that already
   sleeps risks a restart loop during a Neon blip.
2. A `tsc --noEmit` gate in CI. All 11 errors are vendored `ui/` files the app
   never imports, so the gate needs those excluded or the files fixed first.
3. Node 20 → 24 in CI (Node 20 is EOL).

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
