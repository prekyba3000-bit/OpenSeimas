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
