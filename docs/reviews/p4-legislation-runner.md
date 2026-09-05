# The legislation runner — why it is not wired

2026-09-05. Read-only against production and the LRS feeds. Verification-first,
per the W3 rule: *find what actually feeds the table before any ingest*.

The task was "the `legislation` table is empty and no timer invokes
`pipeline/ingest_legislation.py` — wire the runner". Three things had to be true
for that to be the right move. None of them is.

## 1. The script's source is dead

`ingest_legislation.py` fetches `e-seimas.lrs.lt/rs/legalactproject/search/find`.
Every variant tried returns **404**:

```
/rs/legalactproject/search/find?number=250-I-1   → 404
/rs/legalactproject/search/find                  → 404
/portal/legalActProject/lt/TAP/250-I-1           → 404
```

Not the parameter-name trap recorded in `upstream-source-map-verification.md`
(where an unsupported query parameter produces a path-level 404) — the bare path
404s too. Every working ingest in this repo uses `apps.lrs.lt/sip/p2b.*`; this
script is the only thing pointing at `e-seimas`.

So the script has **never successfully run**. The table is not empty because a
timer was forgotten. It is empty because the code behind the timer does not work.

## 2. The key it joins on holds a different fact

`ingest_legislation.py` selects `DISTINCT project_id FROM votes`. That column is
populated in `ingest_votes_v2.py`:

```python
project_id = q.get('registracijos_nr')
if not project_id:
    match = re.search(r'Nr\.\s*([A-Za-z0-9-]+)', title_base)
    if match: project_id = match.group(1)
```

The fallback takes **the first "Nr." in the title**. For an amendment, that is
the law *being amended*, not the project:

```
Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ... projektas (Nr. XVP-247)
                             ^^^^^^^^^ stored                       ^^^^^^^^ the project
```

Measured across all 4,392 votes that carry a `project_id`:

| | |
| --- | ---: |
| votes whose stored id is not the project's number | **3,464** (79%) |
| stored ids collapsing more than one real project onto one key | **331** |
| worst case: `I-399` (the Statute, cited by every amendment) | **44 distinct projects** |

A `legislation` row keyed `I-399` would claim to be one piece of legislation
while standing for forty-four. This is `current_party` again — two facts in one
column — and wiring an ingest on top of it would have produced a
canonical-looking table that is wrong for four rows in five.

## 3. The only live source covers a fifth of the chamber's business

`p2b.ad_sn_inicijuoti_ta_projektai` **is** live, and carries exactly what
`legislation` wants — `registracijos_numeris`, `pavadinimas`, `registracijos_data`:

```
?asmens_id=90947&kadencijos_id=10 → 200, 27,421 bytes
  <SeimoNarioPateiktasTeisėsAktoProjektas registracijos_numeris="XVP-105"
     pavadinimas="Seimo nutarimo „Dėl pavedimo ... valstybinį auditą" projektas"/>
```

Fetched for all 148 members (0 failures), and compared against the project
numbers actually voted on:

| | |
| --- | ---: |
| distinct projects in the MP-initiated feed | 707 |
| distinct projects actually voted on | 1,710 |
| **voted-on projects the feed covers** | **336 (19.6%)** |
| voted on but absent from the feed | 1,374 |

It is a per-MP feed of *member-initiated* projects for the current term. It
cannot contain government-initiated projects, and the absent examples are
mostly `XIVP-*` — previous-term projects this Seimas voted on. Filling
`legislation` from it would produce a table that looks complete and holds a
fifth of the record.

## What is actually available

The agenda feed we already ingest carries the project number and title for every
project voted on. The number is parenthesised in the title, and extracting *that*
rather than the first `Nr.` yields **1,710 distinct projects** — against 763
wrongly-keyed ones today.

Corroborated against an independent source, per §9:

- Where `votes.project_id` came from the feed's own `registracijos_nr` attribute,
  the title's parenthesised number agrees on 451 of 876 votes and "disagrees" on
  419 — but every disagreement is a revision suffix (`XVP-851` vs `XVP-851(2)`).
  The attribute names the base project; the title names the revision voted on.
  Both are true, at different granularity, and a runner must decide which it
  keys on rather than blur them.
- **334 of 341** agenda titles for projects that also appear in the per-MP feed
  contain the feed's own project title. The extraction identifies the same
  project LRS names.

## Decision

**Not wired.** `ingest_legislation` is recorded in
`tests/test_every_ingest_has_a_runner.py::UNWIRED_BY_DECISION` with the reason,
so it is empty by decision rather than by oversight — and the new guard there
makes the next unwired ingest fail a test instead of waiting for someone to ask
"what runs this?".

Building it properly is a real piece of work and needs its own review:

1. An additive migration adding the correct project registration number to
   `votes` beside `project_id`, which keeps the fact the current column
   destroys — the shape the faction fix used. Not an in-place correction of
   3,464 historical rows: that is charter §4.5.
2. `ingest_votes_v2.py` extracting it from `registracijos_nr` first and the
   parenthesised title number second, never the first `Nr.`.
3. A decision on base project vs revision (`XVP-851` vs `XVP-851(2)`) before
   either becomes a key.
4. `legislation` filled from the agenda data already ingested, with the coverage
   number stated on any surface that reads it.

## Consequence for P5

Bill summaries stay blocked, and the reason has changed. It was "no runner". It
is now "no source that covers the record, and a join key that means something
else". Vote summaries are unaffected — they are built, gated only on a native
Lithuanian reader.

## Also fixed in this pass

`scripts/refresh_wire_fixtures.py --check` now runs in `daily_sync.sh`. The
captured fixtures are the only test evidence taken from the live API rather than
from someone's imagination, and they were the one layer that could rot in
silence: both suites read the committed files and pass happily on a payload the
backend no longer sends. `--check` writes nothing — it recaptures the shapes and
reports drift, because writing from a cron that makes no commits would leave a
refreshed fixture sitting dirty in the working tree, which is the same silence
in a different place.

It found real drift on its first run: all four fixtures still carried the
verdict-shaped keys removed earlier the same day. Recaptured.
