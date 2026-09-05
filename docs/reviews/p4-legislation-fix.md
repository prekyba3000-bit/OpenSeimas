# `legislation` — filled, and the key that made it impossible

2026-09-05. Follows `p4-legislation-runner.md`, which established that the table
could not be filled as specified. This records how it was filled instead, and
the two defects found while doing it.

## The state before

`legislation`: **0 rows**, for the life of the project, while `backend/graph.py`
and `pipeline/tag_topics.py` both read it.

Three separate things were wrong, and only the first was known:

1. No runner invoked `pipeline/ingest_legislation.py`.
2. The endpoint it fetched — `e-seimas.lrs.lt/rs/legalactproject/search/find` —
   **404s on every variant**, including the bare path. It had never once
   succeeded. „No runner" was the wrong diagnosis.
3. It joined on `votes.project_id`, which holds a different entity for most rows.

## The key

`ingest_votes_v2` filled `project_id` from the agenda's `registracijos_nr`
attribute, falling back to the first „Nr." in the title. For an amendment the
first „Nr." is the law **being amended**:

```
Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ... projektas (Nr. XVP-247)
                             ^^^^^^^^^ stored                        ^^^^^^^^ the project
```

| | |
| --- | ---: |
| votes carrying a `project_id` | 4,392 |
| …holding the wrong entity | **3,464 (79 %)** |
| stored values standing for more than one project | 331 |
| worst: `I-399`, the Statute, cited by every amendment to it | **44 projects** |

`backend/graph.py` rendered this as `Project XIII-804` on the graph node for a
vote about `XVP-247`. That is the one place the wrong number reached a reader.

## Two defects found while fixing it

Both were found by measuring against all 5,286 production titles rather than by
a failing test, and each would have re-created the collapse one level down.

**Preferring the attribute discards the revision.** The obvious rule — trust
`registracijos_nr`, since it is the source naming the project directly — is
wrong. Measured where both are present:

```
votes where both give a project number   866
  agree on the base project              866
  disagree                                 0
  attribute carries a revision suffix      0
  title carries a revision suffix        415
```

They never conflict; the title simply says more. It names `XVP-1119(2)`, the
document voted on, where the attribute names only `XVP-1119`. The revisions are
not cosmetic — **123 base projects carry more than one distinct title**, because
a later revision amends a different set of articles. So the title wins.

**A clipped title ends mid-number.** LRS truncates titles at exactly 200
characters — **588 of 5,286** — and the number is the last thing in a title:

```
…„Dėl Seimo delegacijos NATO Parlamentinėje Asamblėjoje“ pakeitimo“ projektas (Nr. XVP-111
                                                                              ^^^^^^^ cut off
```

The real number might be `XVP-1112` or `XVP-1119`. Worse, the fragment `XVP-111`
**is itself a real and unrelated project** — a VAT amendment — so accepting it
would have filed a decision about NATO delegates under it. Requiring the closing
bracket fixes it; that alone dropped the ambiguous keys from 20 to 13.

## What was built

**`pipeline/project_number.py`** — one rule, used by the ingest and the
backfill, so the two cannot drift. Returns registration and base separately.
28 tests, every fixture a real production string.

**Migration 041** — additive only. `votes.project_id` is **not rewritten**:
changing historical ingested records is charter §4.5. It gains a comment saying
what it actually holds, and two new columns carry the fact it destroyed. Same
shape as migration 039, which split faction from nominating party rather than
correcting one into the other.

**`pipeline/ingest_legislation.py`** — rewritten to build from the sitting
agendas already ingested. No network call at all, so it cannot break when a
remote endpoint moves. On `daily_sync.sh`, after `ingest_votes_v2` (whose titles
it reads) and before `tag_topics` (which tags its rows).

## Result

| | |
| --- | ---: |
| `legislation` rows | **1,683** (was 0) |
| …with a title | 1,683 |
| …with an invented summary or url | **0** |
| votes stamped with a project | 3,853 |
| votes joining `legislation` cleanly | 3,853 |
| distinct base projects | 1,343 |
| votes about no single project | 1,433 |

The 1,433 are procedural questions, question-group package votes (554), and
votes whose title the source clipped before the number. They carry NULL rather
than a guess.

## What it deliberately does not have

`summary` and `url` are NULL on all 1,683 rows, and the migration comments say
why. Nothing reachable publishes a project summary, and the e-seimas URL cannot
be verified to resolve — a plausible-looking link that 404s is worse than no
link.

## Corroboration (§9)

Of the agenda titles whose project also appears in the independent per-MP feed
`p2b.ad_sn_inicijuoti_ta_projektai`, **334 of 341** contain that feed's own
title for the project. The extraction identifies the same documents LRS names.

## Known imprecision

13 of 1,683 registrations are worded differently by the source across stages
(`XVP-1044(2)` is „Dėl tarybos patvirtinimo" at one stage and „Dėl tarybos
sudėties" at another). Rows are read in date order, so the most recent wording
is what remains. Recorded rather than hidden: it is the source's variation, not
a collision of two documents.

## Still open

- **P5 bill summaries are now unblocked** as far as data goes. The template work
  is done for votes; bills need their own template and the same figure gate.
- `votes.project_id` remains wrong for 3,464 rows. Correcting it in place is
  §4.5 and needs a human decision; nothing reads it any more except the legacy
  column comment telling readers not to.
- `tag_topics` will now tag 1,683 legislation rows on its next run, having had
  nothing to tag since the project began.
