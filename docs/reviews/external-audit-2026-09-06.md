# External technical audit, 2026-09-06 — verification and triage

The audit arrived as a document, not as a set of facts. This note records what
I checked against the running system, what I fixed, what I could not
reproduce, and where I think its severities are wrong for this project.
Charter §1.9: anything I did not produce gets verified against the primary
source before it backs anything.

Two of its findings were real defects on a live public surface. One of those
it under-described.

## Verified and fixed

### The share card — the most serious thing in the audit (its R2, one clause)

The audit says `share_card_renderer.py:123–226` "still renders level,
alignment, RPG axes, and XP after these fields were removed from profile
output, so defaults can become public claims."

It was worse than that sentence. I fetched the endpoint from production and
looked at the image. A real member's photograph and name, beside:

* a circle containing **0** — the `level`, defaulted because the field is
  gone from the payload
* a badge reading **"True Neutral"** — the `alignment`, same default
* a five-axis radar labelled **STR / WIS / CHA / INT / STA**
* **"XP: 0 / 1"**
* **"No artifacts unlocked" · COMMON**
* the member's name with the Lithuanian diacritics rendered as boxes, and
  every label in English on a Lithuanian surface

Unauthenticated, `Cache-Control: public, max-age=3600`, and reachable from a
„Dalintis kortele" button on every profile page. This is §1.3 in its plainest
form — a label about a named person — sitting on top of §1.1, because 0 and
"True Neutral" are fabricated defaults standing in for data that does not
exist.

`tests/test_no_verdicts_on_the_wire.py` contained the sentence "Nothing
rendered them". That was true of the JSON, which is all any assertion in that
file reads. A PNG is a public surface too.

Removed: the route, `share_card_renderer.py`, `share_card_template.html`, the
profile button, and Pillow — nothing else in the tree imports it, which also
closes the audit's Pillow advisory without an upgrade. Correction published as
migration 044. Commit `b05197f`.

### List and profile published different numbers (its R2, main clause)

Measured in production, one member, same day: `experience` **12.35 on the
profile, 61.98 on the leaderboard**. Charter §1.4 calls the list/profile
agreement test permanent. There was no such test.

Two causes, both a definition that exists twice:

1. `_fetch_metric_maxima` carried `COALESCE(0, 0) AS max_years_in_parliament`
   — a literal zero. `_normalize(x, 0)` returns 0.0, so the seniority half of
   `experience` silently vanished from the profile while the leaderboard's
   real maximum kept it. The cohorts differed too (all politicians vs active
   ones); the other maxima agreed only because no former member holds one.
2. Six copies of `COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'` — the
   predicate migration 015 exists to have removed. LRS emits
   `kaip_balsavo=""` for an absent member, so an empty string passes "is not
   the word absent". 015 fixed the two materialized views and left the
   engine's six copies, so the view and the engine disagreed about what
   participation is; one member's first recorded vote was 2024-11-19 by one
   and 2024-11-14 by the other.

Both paths now reduce the same rows through one function, and one
`_CHOICE_RECORDED` constant is deferred to by all six queries. Verified
read-only against production after the change: 14 members, all three
dimensions and the metrics under them, zero disagreements. Commit `a0b196b`.

### The floor-speech checkpoint (its R1)

Accurate as described. `record_sitting_state()` committed before the speech
inserts; a failed INSERT rolled back only the rows, and `should_skip` treats a
sitting with `turns_seen > 0` as settled once it is 14 days old. One transient
database error inside that window would drop a sitting's speeches for good.

Checked production first: **no sitting has actually lost its speeches this
way.** Latent, not a repair.

Rows and checkpoint now commit together; fetch failures and write failures are
counted separately and either raises inside the `record_fetch` block, which is
how a run reaches `source_fetches` as `status='error'`. `run()` returns 1, and
`__main__` exits with it instead of discarding it — the daily sync's
`|| echo "floor-speech ingest failed"` branch was unreachable before this.
Commit `6a50dd1`.

### Every rejected vote would have rendered as passed (its R2, last clause)

`"nepriimta".includes("priimta")` is true. VotesListView, VoteDetailView and
SessionsView each tested the positive first. `utils/voteOutcome.ts` already had
the rule right and its comment already named the trap; three views had written
their own copy anyway.

Latent: `votes.result_type` is NULL on all 5,286 rows and each site guards on
truthiness, so nothing renders today. It would have appeared in full, on three
public pages, the day that column was populated. Commit `61c2270`.

### Provenance could not record its own failures (its R3)

Verified by construction. A failed statement aborts the transaction in
Postgres, so `record_fetch`'s error-recording UPDATE raised "current
transaction is aborted" instead of running: the original exception was
replaced by a second one about the recording, and the row stayed 'running'.
One `conn.rollback()`. The new test fails without it.

`pipeline.cli --list` raised `NameError: __path__` on every invocation —
`__path__` is a module global, not visible inside a function body. Fixed; it
lists all 20 runners. Commit `49391af`.

## Verified, not fixed, and why

* **~~`/health` returns 200 when the database is disconnected~~** (its R7) —
  **fixed by splitting the question, not by making `/health` fail.** A failing
  `healthCheckPath` on Render restarts the service; a restart cannot reconnect
  a Neon outage and would loop through one on a free plan that already sleeps.
  So `/health` stays liveness — 200 while the process answers, with the
  database named in the body — and `/health/ready` is readiness, 503 when the
  database is unreachable. `uptime_check.sh` probes readiness now; it used to
  grep `"status":"ok"` out of the liveness body, which worked and depended on
  nobody rewording that string. Verified against the production database, both
  states.
* **~~Fourteen tsc errors / no type gate~~** (its R6) — **fixed.** 11 errors,
  all in three vendored shadcn/ui adapters (`calendar`, `chart`, `resizable`)
  that no application file imports, broken against the installed
  react-day-picker, recharts and react-resizable-panels. Fixing vendored
  adapters is separate work; blocking every future type gate on it is not. So
  `tsconfig.typecheck.json` excludes exactly those three, CI and the pre-push
  hook both run `tsc --noEmit` against it, and `noVendoredUiImports.test.ts`
  fails if anything imports one of them or if a fourth entry appears in the
  exclusion list. The gate cannot quietly widen its own blind spot.
* **~~CI on Node 20 (EOL)~~** (its R6) — **fixed.** CI on 24, the current LTS;
  `engines.node >= 22`, which is what the machine running the pre-push hook
  actually has. CI deliberately runs the newer line so a version-specific
  break appears there rather than in a Vercel build.
* **~~The build never got `VITE_API_URL`~~** (its R6) — **fixed, and it was
  live-capable.** `config.ts` throws at module load without it and Vite
  inlines the value at build time, so `vite build` succeeds with the variable
  missing (verified: exit 0) and produces a bundle that blanks the page for
  every visitor. CI gave it to the tests and not to the build. It now gets it,
  and `.github/scripts/smoke-built-app.mjs` fails the build if the URL was not
  inlined — verified failing on a deliberately unset build.
* **~~SessionsView aggregates the first 2,600 votes~~** (its R2/R5) — **fixed,
  and it was worse than "silently incomplete once the dataset exceeds the
  cap". It had already exceeded it.** Measured against production: that window
  held all 1,812 of session 144's votes, 781 of session 141's 1,554, and
  **none at all** of sessions 140, 139 and 143 — which hold 1,517, 391 and 5.
  So three sessions published „0 balsavimų" and, on expanding,
  „Balsavimų duomenų nerasta" — a claim that the Seimas met and decided
  nothing across 27 sitting days. `/api/meta/sessions` counts in SQL now, with
  the same overlap rule the client applies, and returns null rather than 0
  when it cannot count. Sums to 5,286 of 5,286.

  The day-by-day lists a reader opens are now fetched per session, by date
  range, and only on expand — `/api/votes` takes `date_from`/`date_to`. My
  first cut kept the single blanket download and simply labelled it a sample,
  which was honest and made browsing worse for four of six sessions; opening a
  session now returns that session's votes. Verified against production: 139,
  143 and 146 come back complete, and the three large sessions return their
  newest 500 covering 6–8 of their sitting days, which the panel states.
  `votes_unassigned` is counted the same way, over every vote, so the
  „Sesija nenustatyta" panel is no longer a fraction of itself.
* **~~Uncapped `limit` on `get_votes` / `get_mp_votes`~~** — fixed in the same
  commit, since one enabled the other. `MAX_PAGE = 500`, clamped rather than
  rejected: a caller asking for too much wants as much as it can have, and a
  422 would break someone doing nothing wrong.
* **~~CORS `https://dashboard.*\.vercel\.app` with credentials~~** (its R5) —
  **fixed.** That regex matched any Vercel project whose name starts with
  "dashboard", a namespace open to anyone's registration. Not an
  authentication bypass — the audit says so and it is right — but far wider
  than the three deployments that exist, all already listed. Regex dropped,
  `allow_credentials` dropped (nothing sends a credentialed request),
  `CORS_EXTRA_ORIGINS` added so a preview is allowed deliberately.
* **~~Dependency advisories~~** (its R4) — **fixed, and `npm audit` reports 0
  with and without dev dependencies.** Mostly by checking what is actually
  there rather than upgrading: `aiohttp` is imported nowhere and was removed,
  as Pillow was; `drizzle-kit`/`drizzle-orm` (a React dashboard with no
  Drizzle usage) were the sole source of the vulnerable esbuild;
  `@storybook/test-runner` is declared and never invoked and was the only
  thing pulling the vulnerable uuid. react-router 7.13.0 → 7.18.3 within its
  major, and Storybook `~8.5.0` → `~8.6.0` resolving 8.6.18, where its
  advisory is fixed — `npm audit fix --force` would have gone to Storybook 10
  and broken the stories that document the nine retained components. vite was
  already at the recommended 6.4.3.

### Vote corrections: measured, then deliberately not applied (its R3)

The audit says `ingest_votes_v2.py:300`'s `ON CONFLICT DO NOTHING` preserves
old or incorrect choices when the source changes them, and proposes upserting
the mutable fields. The reasoning is right and the fix is a §4.5 STOP
condition: overwriting `mp_votes.vote_choice` changes a historical ingested
record, and what a named member is recorded as having voted is precisely the
row this project does not quietly rewrite.

So I measured it first, read-only against production on 2026-09-08. Forty
votes sampled at random across the whole term, re-fetched from
`p2b.ad_sp_balsavimo_rezultatai`, **5,632 member-choice comparisons, zero
differences.** Not one stored choice disagrees with what the source serves
today. The correction has never once been needed.

The real gap was that we would not have known if it were. The ingest already
holds both values, so it now records a disagreement in
`mp_vote_choice_drift` (migration 045) and changes nothing — with a `warn` /
`record` DQ check so it surfaces, and a `times_seen` counter so a daily
re-run of the same drift does not read as an escalation. A drift row is
evidence for a person to act on, not an instruction to a script.

Also fixed here: `record_fetch` was imported at the top of that file and never
called, so the runner for the project's core dataset was the only one leaving
no trace in `source_fetches`, and a run that missed vote results printed a
warning and exited 0. It now records provenance and returns nonzero — with an
`|| echo` guard in `daily_sync.sh`, because under `set -e` one 404'd vote
result would otherwise abort the whole sync and take the registrations ingest
with it, which is exactly what understated 25 members' attendance on
2026-08-25.

## Where I think the audit is wrong for this project

* **Unauthenticated `/api/internal/data-health`** (its R5). Confirmed
  reachable, and I would leave it that way. It returns the platform's own
  data-quality checks, in Lithuanian, with their pass/fail state. On a
  transparency platform that is an asset, not a leak.
  `/api/admin/refresh-status` returns an interval and a null timestamp.
* **"Establish whether a secrets-bearing Storybook build was published"**
  (its R4). No Storybook build is published anywhere; there is no such
  artifact to inspect.

## What this cost, and the lesson worth keeping

Three of the six defects fixed here were **latent**: the checkpoint, the vote
outcomes, and the provenance recording all needed one more condition to become
visible. Two were not: the share card and the dimension disagreement were both
live, in production, on named people, while every suite was green.

Both live ones were found the same way — by fetching the thing a reader
fetches and looking at it. The share card needed the PNG opened. The
disagreement needed the same member's profile and the leaderboard read side by
side. §1.7 says this already and it keeps being the only method that works:
greps find what you name.

The guard files now assert at the route table rather than only over payloads,
and the agreement test §1.4 has always called permanent now exists.

## LT-COPY added by this work

Both in `SessionsView.tsx`, both marked in place. The file was already in the
21-file inventory, so the pack's count is unchanged.

* „Sąraše rodomi tik naujausi balsavimai, todėl šios sesijos jame nėra.
  Skaičius viršuje suskaičiuotas iš visų balsavimų." — replaces
  „Balsavimų duomenų nerasta" for a session whose votes exist but fall outside
  the sample the lists are drawn from.
* „Rodoma {n} iš {m} posėdžių dienų" — {m} is now the session's real
  sitting-day count. It used to divide the sample by itself, so it always
  looked complete.
