# P5 — bill summaries, template-first

2026-09-08. Charter §6 P5 says "votes and bills". The vote half shipped
2026-09-02 (`p5-vote-summaries.md`); this is the other half.

Pilot output: [`p5-bill-summary-pilot.md`](p5-bill-summary-pilot.md).

Nothing here is published. No route serves these, `summary_revisions` is still
empty, no surface renders them. As with votes, the pilot is a document for a
person to read.

## Why it was blocked, and why it no longer is

The 2026-09-02 write-up closed with:

> **Bill summaries.** P5 says "votes and bills". `legislation` still has 0 rows
> and no runner, so there is nothing to summarise.

`legislation` now holds **1,683 rows**, built from already-ingested agenda
titles after the old e-seimas endpoint was found to 404 on every variant. All
1,683 join to votes on `project_registration_nr` — no orphans in either
direction — so every bill has a passage to describe.

## What a bill summary can honestly say

`legislation` carries `project_id` and `title` and nothing else: its `summary`
and `url` columns are empty on all 1,683 rows. So the substance comes from the
votes, aggregated:

| Fact | Source |
| --- | --- |
| how many recorded votes | `count(*)` over the joined votes |
| how many have published results | `count(*) FILTER (votes_participated > 0)` |
| the period | `min`/`max(sitting_date)` |
| which stages, and how many at each | `count(*) GROUP BY vote_type` |

Every figure the template prints is one of those, computed by the database, and
the gate checks each one back against it.

## What it refuses to do

1. **It never says the bill became law.** `votes.result_type` is NULL on all
   5,286 rows, so no vote in a passage has a recorded outcome and the passage
   has none either. Pilot sample 4 is the case this exists for: a bill ending
   on a `Priėmimas` with a lopsided tally, which a reader completes unaided.
2. **It never calls the last known vote the final one.** Our data ends where
   the ingest ends, not where the Seimas did — hence „paskutinis mums žinomas
   balsavimas, nebūtinai paskutinis įvykęs".
3. **It never renders an absent result as a zero.** 1,656 votes publish
   nothing; a bill made only of those (pilot sample 5) says so rather than
   reading as a bill nobody supported. And it does not supply a cause: the
   `komentaras` attribute is one identical string on all 5,286 votes, so it
   explains nothing about any of them.
4. **It does not paraphrase the title, and says nothing about any named
   person** — both for the reasons the vote write-up sets out.

## Four defects the figure gate could not see

The gate reported 0 violations on the first pilot run. Reading the rendered
Lithuanian found four things wrong with it, none of which is a number:

1. **„Dėl šio projekto užfiksuoti 1 balsavimas".** The participle was
   hardcoded plural. Lithuanian agrees it with the count exactly as the noun
   is agreed — *užfiksuotas* 1, *užfiksuoti* 3, *užfiksuota* 11,
   *užfiksuotas* 41. Wrong on every singular count in the set.
2. **„nuo 2026 m. liepos 14 d. iki 2026 m. liepos 14 d."** — three of the ten
   samples. A passage that happened on one day is one date.
3. **„14 d.."** — `_lt_date` already closes the sentence, and the template
   appended a second stop.
4. **„pateikimas, priėmimas, svarstymas"** — acceptance before consideration.
   The stage rows come back ordered by first date, which is right across days
   and arbitrary within one; ties now break on the Statute's order.

This is the rendered-surface rule (§1.7) doing exactly what it is for. A gate
that checks figures checks figures; agreement, punctuation and ordering are
invisible to it, and all four would have shipped.

## The gate, strengthened

While extending it to bills I closed a hole in `verify.py`. A title carrying
„Nr. IX-675 5, 17, 41 straipsnių" used to put 675, 5, 17 and 41 into the
allowed multiset as loose digits, so a rephrasing could spend one on a claim of
its own — „susilaikė 41" — while quietly dropping it from the title, and the
multiset balanced.

Verbatim spans are now consumed where they occur, and a span that has been
edited is a violation in itself. What remains to check against is exactly the
figures the template stands behind. This matters for votes as much as bills,
and it is the difference between a gate that guards an LLM rephrasing and one
that only looks like it does.

## LT-COPY inventory (added this session)

| File | Strings |
| --- | --- |
| `pipeline/summaries/bill_template.py` | The passage sentence and its participle forms; the stage list; the „no results published" and „partly published" sentences; the outcome-refusal and last-known-vote sentences |

**Carrying the same caveat as the vote template's stage glosses.** The stage
names are claims about Seimas procedure, not about our data, and need checking
against the Statute before publication.

## State

Done: template, 24 tests, 10-sample pilot, the gate strengthened, four
rendering defects fixed. Suites green — **401 backend / 453 dashboard**.

Not done, deliberately:

- **Nothing published.** Same as the vote half.
- **No LLM.** The templates alone produce publishable prose. The gate exists so
  that adding rephrasing later is a reviewable step rather than a leap, and
  calling a paid API would cross §4.1 regardless.
- **One pilot shape found no bill.** „Nenurodyta stadija" matches nothing:
  every bill's votes carry a stage today. The branch is covered by a synthetic
  test rather than shipped unexercised.

Next concrete step, and it is the same as the vote half's: **a human reads the
pilots.** Specifically the stage names against the Statute, and the Lithuanian
throughout. Publication is gated on that, not on more code.
