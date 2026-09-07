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

* **`/health` returns 200 when the database is disconnected** (its R7).
  Confirmed: the body says `"status": "degraded"` but the HTTP status is 200,
  so Render's health check cannot see it. Real. Needs a decision about Render's
  behaviour on a failing check for a free-tier service that already sleeps, so
  it is not a change to make unattended.
* **~~SessionsView aggregates the first 2,600 votes~~** (its R2/R5) — **fixed,
  and it was worse than "silently incomplete once the dataset exceeds the
  cap". It had already exceeded it.** Measured against production: that window
  held all 1,812 of session 144's votes, 781 of session 141's 1,554, and
  **none at all** of sessions 140, 139 and 143 — which hold 1,517, 391 and 5.
  So three sessions published „0 balsavimų" and, on expanding,
  „Balsavimų duomenų nerasta" — a claim that the Seimas met and decided
  nothing across 27 sitting days. `/api/meta/sessions` counts in SQL now, with
  the same overlap rule the client applies, and returns null rather than 0
  when it cannot count. Sums to 5,286 of 5,286. Commit `aee1426`.
* **~~Uncapped `limit` on `get_votes` / `get_mp_votes`~~** — fixed in the same
  commit, since one enabled the other. `MAX_PAGE = 500`, clamped rather than
  rejected: a caller asking for too much wants as much as it can have, and a
  422 would break someone doing nothing wrong.
* **CORS `https://dashboard.*\.vercel\.app` with credentials** (its R5).
  Confirmed at `main.py:67`. The audit is careful to say this is not an
  authentication bypass, and it is not.
* **11 tsc errors** (its R6 says fourteen). All 11 are in vendored shadcn
  `ui/` files — `calendar.tsx`, `chart.tsx`, `resizable.tsx` — none of which
  the app imports. Worth a `tsc --noEmit` gate; not worth calling broken
  adapters releasable.

## Where I think the audit is wrong for this project

* **Unauthenticated `/api/internal/data-health`** (its R5). Confirmed
  reachable, and I would leave it that way. It returns the platform's own
  data-quality checks, in Lithuanian, with their pass/fail state. On a
  transparency platform that is an asset, not a leak.
  `/api/admin/refresh-status` returns an interval and a null timestamp.
* **"Establish whether a secrets-bearing Storybook build was published"**
  (its R4). No Storybook build is published anywhere; there is no such
  artifact to inspect.
* **Node 20 EOL / Node 24 migration** (its R6). True and not urgent. It
  competes for the same hours as the incomplete session totals above, and
  those are visible to readers.

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
