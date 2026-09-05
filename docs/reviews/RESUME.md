# RESUME — 2026-09-05

Branch `main`, everything pushed. Pre-push gate green on every commit.
Suites: **325 dashboard / 298 backend** (+19 skipped). tsc 11, all vendored `ui/`.

## This session

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
