# P4 recon — what feeds `legislative_activity`

Read-only. 2026-08-23. Production API + read-only session against the Neon DSN.

## The question

`legislation` has 0 rows, yet `bills_authored: 16` is served. Is the dimension
fed from a shadow source while the canonical table sits empty (invariant 4)?

## Answer: no shadow source, but two real defects

`legislative_activity` never reads `legislation`. The chain is:

```
LRS p2b.ad_sn_inicijuoti_ta_projektai
  └─ pipeline/ingest_authored_bills.py
       └─ politicians.bills_authored_count   (migration 005, DEFAULT 0)
            └─ hero_engine.score_legislative()
                 └─ dimensions.legislative_activity
```

`legislation` is a **different, dormant table**. `pipeline/ingest_legislation.py`
writes it and **no runner invokes that script** — not the daily sync, not any
timer, not any workflow. `backend/graph.py` and `pipeline/tag_topics.py` read
it, so whatever they compute from legislation rows computes from nothing.
The table is empty because nothing was ever wired to fill it, not because a
competing source won.

### Defect 1 — the dimension's input is not on the daily sync

`scripts/local-ops/daily_sync.sh` runs `apply_migrations`, `ingest_seimas`,
`ingest_votes_v2`, `tag_topics`, `export_stats`. `ingest_authored_bills` appears
only in `Seimas.v2/.cursor/skills/run-ingest-pipeline/scripts/run.sh`, which no
timer calls.

So `bills_authored_count` holds whatever a past manual run left, while
`legislative_activity` is displayed beside attendance and vote counts that
refresh daily. Provenance reads `direct` for it — verified live: Bilotaitė
returns `legislative_activity: 10.21`, `metrics_provenance.legislative_activity:
"direct"`. „Direct" is true about the lineage and silent about the age.

### Defect 2 — the column's name claims more than the feed supports

Migration 021 already documents this and it was never carried through to the
surfaces. The feed reports three numbers per member: `kiekis_viso`,
`kiekis_individualiai`, `kiekis_grupėje`. `ingest_authored_bills.py` writes
`bills_authored_count = total`, i.e. the co-sponsorship-inclusive figure.
Migration 021's own example: Alekna has 20 total and 0 individual. "Authored 20
bills" and "was one of the signatories on 20 bills" are different claims, and
the platform makes the stronger one.

`bills_initiated_individually` is stored and no surface reads it. The honest
number is already in the database.

## Other findings from the same pass

- **`mp_attendance_v2` was refreshed by nothing.** Materialized view from
  migration 020; `refresh_stats.sh` refreshed only `mp_stats_summary` and
  `mp_leaderboard_metrics`. It matched a live recompute (0 of 148 rows differ)
  **only because the chamber has not voted since 2026-07-14**. Attendance v2
  becomes the live methodology on 2026-08-26 and — per LRS, checked after this
  was written — an extraordinary session opens **2026-08-25**, a day earlier,
  with the autumn session following on 2026-09-10. The freeze would have begun
  the day before v2 went live, not two weeks after; from then it would have
  held at 93 eligible days while
  every surface presented it as current. **Fixed** — added to `refresh_stats.sh`
  with the `to_regclass` guard and `CONCURRENTLY` (the required unique index
  `idx_mp_attendance_v2_mp` exists). Ran once: clean.
- **`faction_alignment`** is a materialized view with **0 rows** and no
  refresher. Not fixed — an empty view is a question about its inputs, not a
  refresh schedule.
- **`assets` and `interests` are 0 rows.** Declared-interest data is absent
  entirely, so no surface can be showing it.
- **`/api/meta/freshness` under-reports itself**: `materialized_views` returns
  `last_refresh: null, refresh_count: 0` while refreshes have been running every
  30 minutes. The freshness panel reads a tracking table the ops script never
  writes. Under-reporting, not over-reporting, so it understates confidence
  rather than faking it — but the panel is wrong.

## Recommendation

1. Put `ingest_authored_bills` on the daily sync, or mark the dimension's
   as-of date on the surface. Refreshing is cheaper than explaining.
2. Serve `bills_initiated_individually` alongside the total and label both.
   The distinction is already in the database and already written down.
3. Decide whether `legislation` is wanted. If yes it needs a runner; if no,
   `ingest_legislation.py`, `graph.py`'s reads and the `tag_topics` legislation
   path are dead weight that currently compute from an empty table.

---

# Addendum — empty-pipeline recon (2026-08-23)

Step one of the empty-matview task: *verify what the surfaces render*, before
asking why the ingests fill nothing.

## What renders today

| table / view | rows | consumer | what a reader sees |
| --- | ---: | --- | --- |
| `faction_alignment` | 0 | `/api/forensics/loyalty` → `SkaidrumasHubView` | „Duomenų dar nėra…" — correct unknown state |
| `assets` | 0 | `backend/graph.py` | graph still returns 225 nodes / 8090 edges from other sources |
| `interests` | 0 | `backend/graph.py` | as above |

`/api/forensics/loyalty` serves `{"alignment": [], "total_mps": 0}` and the hub
guards on `alignment.length > 0`, so the empty state renders as an explicit
„no data yet" rather than as zeros. **The trust floor holds on this surface.**
Verified against production, not inferred from the code.

## Two findings that are not about refresh schedules

**1. The empty-state copy explains the absence wrongly.** It reads „lojalumo
analizė bus paleista po balsavimų duomenų surinkimo" — the analysis will run
once vote data is collected. Vote data *is* collected: 5,279 votes, 743,515
per-member records. Whatever keeps `faction_alignment` empty, it is not that.
The sentence is not a fabricated number, so it does not breach the trust floor,
but it tells a reader something untrue about why they are seeing nothing.

**2. A verdict-shaped surface is waiting behind the empty view.** The panel that
renders when `faction_alignment` has rows colours each named member's
`avg_alignment_30d`: red below 70, amber below 85, green above. That is a grade
on a named person, delivered in colour rather than in a word, on a dimension
called „lojalumas". Nothing renders it today only because the view is empty —
so filling the view would ship the grading, and the fix would arrive disguised
as a data improvement.

Recording it per §4.6 rather than redesigning it here: **the ingest for
`faction_alignment` should not be wired until that panel is evidence-first.**
The order matters — data first, then the surface, means the verdict ships.

## Also seen during the rendered audit

The public landing page offers „Skaidrumo reitingas" — a *ranking* — as one of
four things the platform provides. Whatever it links to, the word promises
readers a league table of people. Flagged as copy, not code; it needs a
decision, not a patch.

## Not yet answered

Why the three ingests fill nothing. That is the next step, and per the W3 rule
it gets a feasibility note before any ingest code.

---

# Empty materialized views — full recon (2026-08-24)

Measured against production, read-only. The earlier addendum checked what the
surfaces render; this establishes *why* each is empty.

| view / table | rows | source & population path | last refresh | verdict |
| --- | ---: | --- | --- | --- |
| `faction_alignment` | **0** | matview over `mp_votes` (743,515 rows) + `politicians` + `votes`; migration 004 | **never** | **bug** |
| `assets` | 0 | table only; **no ingest writes to it anywhere in the repo** | n/a | **blocked** |
| `interests` | 0 | table only; **no ingest writes to it anywhere in the repo** | n/a | **blocked** |

## `faction_alignment` — a bug, and the interesting one

A live recompute of the view's own definition returns **11,809 rows**. Its
inputs have been populated all along. It was materialised in migration 004,
before `mp_votes` was filled, and nothing has refreshed it since — the same
defect as `mp_attendance_v2`, caught one step earlier because this one was
born empty rather than going stale later.

So the platform has been showing „Duomenų dar nėra — lojalumo analizė bus
paleista po balsavimų duomenų surinkimo" for a computation it could have run
at any time. That also explains the wrong empty-state copy noted earlier: the
sentence was written to describe a pipeline that was waiting for data, and the
data was never what it was waiting for.

**Smallest safe fix is not "refresh it".** The panel that renders once this view
has rows colours each named member's `avg_alignment_30d` red below 70, amber
below 85, green above. Refreshing would populate 11,809 rows and switch on a
red/amber/green grade for every member in one step, arriving disguised as a
data improvement. The order has to be: make the panel evidence-first, then
schedule the refresh. One line of ops work is gated behind one UI decision, and
that is the right way round.

Recorded in `UNREFRESHED_BY_DECISION` with that reason, so the guard stays green
for a stated cause rather than by oversight. The previous reason there said
refreshing "would only re-materialise nothing" — that was wrong, and is
corrected.

## `assets` and `interests` — blocked, correctly empty

Neither table has any writer: no `INSERT INTO assets` or `INSERT INTO interests`
exists anywhere in the repository. They were created by a migration and no
ingest was ever written. Emptiness is therefore correct — the platform is not
losing data it collected, it never collected any.

`backend/graph.py` reads both, and the graph endpoint still returns 225 nodes
and 8,090 edges from other sources, so nothing renders a hole. No surface claims
declared-interest data exists.

These are declared-interest and asset-declaration sources — the kind of data
that most invites verdict-shaped presentation. Per the W3 rule they get a
feasibility note before any ingest code, and on the evidence of
`faction_alignment` that note should cover what the surface will do with the
data *before* the data arrives.

## Guards

- `test_matview_refresh_paths.py` already asserts every matview has a refresher
  or a written reason. `faction_alignment`'s reason is now accurate.
- Worth adding when the loyalty panel is redesigned: a guard that a view moving
  from exempt to scheduled has a surface test proving it renders evidence, not
  a grade. Not added now — a guard for a decision not yet taken would be
  guessing at its shape.
