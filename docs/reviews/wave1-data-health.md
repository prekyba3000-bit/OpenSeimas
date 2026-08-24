# Wave 1 — data health substrate

2026-08-24. Migrations 027/028 applied to a **local scratch database only**;
production application is held pending diff review, per the tranche constraint.

The five referenced specs (`research/openseimas_capability_upgrade_report.md`,
`openseimas_capability_dim01..04.md`) are **not in the repo** and were not
available. Everything below is built from the task description itself; anything
those documents would have settled is flagged as a deviation.

## 1. Table/column mapping — assumed vs found

| Spec name | Reality | Consequence |
| --- | --- | --- |
| `asmens_id` | **No such column.** It is the LRS *query parameter*; the stored column is `politicians.seimas_mp_id` (integer, already UNIQUE) | Check renamed and repointed |
| `mp_votes → votes` | `mp_votes.vote_id` is a FK to **`votes(seimas_vote_id)`**, not `votes(id)` | Joining on `votes.id` reports **all 743,515 rows** as orphans. Measured. |
| vote positions `už/prieš/susilaikė/nedalyvavo` | Stored domain is `Už`, `Prieš`, `Susilaikė` only. **`Nedalyvavo` never appears**; non-voting is `NULL`, on **408,267 of 743,515 rows (54.9%)** | NULL excluded from the domain check — it is the unpublished state, not a violation |
| "bill registration id" | `legislation` has 4 columns and **0 rows**. `votes.project_id` is legitimately non-unique (541 repeats over 5,279 votes — one bill draws several votes) and 894 NULL | Check placed on `legislation.project_id`, where uniqueness is meaningful. Vacuous until that table is populated — stated rather than hidden |
| three-way reconciliation | `source_fetches` had **only** `rows_affected` | Added `parsed_count`, `inserted_count`, `reconciliation_note`, `manifest_id` |

Confirmed as specced: `politicians.is_active` (140 active), `mp_votes`
uniqueness `(vote_id, politician_id)`, `source_fetches` status/timestamps.

## 2. CZ-2 — every "four dials" occurrence

Exactly **two**, both in one internal review document:

- `docs/reviews/evidence-first-profiles.md:27` — "Four dials replace it"
- `docs/reviews/evidence-first-profiles.md:113` — "Decision needed: is the target four dials"

Both are **historical decision records** from before the five-dial decision, not
user-facing copy. The controlling implementation is already five:
`CIVIC_DIMENSION_ORDER` has length 5 (asserted by
`i18n/noVerdictsOnSurfaces.test.ts:75`), and the profile reads „Penki atskiri
rodikliai". **No user-facing copy was rewritten.** The two lines are annotated
as superseded rather than edited, because a review doc that silently agrees with
the present is no longer a record of how the decision was reached.

## 3. Snapshot storage — proposal, and what was implemented

**Implemented:** hashing and the manifest. **Not implemented:** payload bytes on
disk — that was gated on this proposal.

*Proposed layout* (`pipeline/common.snapshot_path()` already returns it, so one
edit switches it on):

```
snapshots/<source>/<first-2-hex>/<sha256>.xml
```

Sharded by the first two hex characters: a flat directory of tens of thousands
of files is slow to list and unpleasant in git tooling. Content-addressed, so
re-fetching an unchanged feed writes nothing new.

*Where the bytes should live.* Not Render (ephemeral disk) and not git (the
manifest is committed; payloads are not — 27 KB per member per feed becomes
gigabytes). The zero-cost option already in the stack is the **existing local
offsite backup path** (`offsite_backup.sh`, rclone), writing under the same
retention as the database backups. That needs your approval before anything
writes files.

**Two hashes, because one does not work.** The p2b feeds stamp
`suformavimo_laikas` into the root element. Two fetches two seconds apart are
byte-identical **except those digits** — verified: two 1048-byte payloads
differing at exactly one offset (124). A raw hash therefore answers "did this
change" with *yes, always*. So the manifest carries `sha256` over raw bytes
(integrity: what we received) and `content_sha256` over the payload with that
attribute blanked (change detection). Verified end to end: a second fetch of the
sessions feed records `fetch_status = unchanged` with a different raw hash.

## 4. The ten checks, and first-run results against production

Run read-only against production on 2026-08-24. Real numbers.

| Check | Status | Rows | Note |
| --- | --- | ---: | --- |
| `politicians_asmens_id_unique_not_null` | pass | 0 | maps to `seimas_mp_id` |
| `active_mp_count_in_band` | pass | 0 | 140 active, band 135–141 |
| `mp_votes_orphan_politicians` | pass | 0 | |
| `mp_votes_unique_member_per_vote` | pass | 0 | |
| `mp_votes_choice_in_domain` | pass | 0 | NULLs excluded by design |
| `mp_votes_orphan_votes` | pass | 0 | joined on `seimas_vote_id` |
| `legislation_project_id_unique_not_null` | pass | 0 | **vacuous — table is empty** |
| `source_freshness` | **error** | 2 | `seimas_floor_speeches` 290.5h, `seimas_registrations` 291.9h |
| `frozen_feed` | pass | 0 | matview rows excluded (NULL ≠ 0) |
| `three_way_reconciliation` | **unknown** | — | columns absent in production until 027 is applied |

Two genuine findings, and the second is the design working: an uninstallable
check reports **unknown and blocks**, rather than passing.

## 5. Fault injection and boundary drill

`tests/test_dq_check_runner.py` — **11 tests**. Broken SQL and a missing column
both yield `unknown`, never `pass`; per-row severity escalates (one stale source
warns while another errors inside one check); samples cap at 5 while
`failing_row_count` keeps the true total (200); a planted `'Neaišku'` vote
position is caught; a planted NULL choice is **not**.

`tests/test_boundary_validation.py` — **9 tests**. The rename drill:
`vote_choice` arriving as `balso_reiksme` is classified **block**, `clean` is
empty, and the batch is quarantined whole — partitioning row-by-row against a
schema the payload no longer matches would call a structural change a data
problem. An added column warns and proceeds. A bad value quarantines one row
and lets the other two through.

Also demonstrated live: the runner against an empty schema fires
`active_mp_count_in_band`, holds the publish, exits 1.

## 6. Quarantine schema and a real sample row

`quarantine_rows`: `id, source, batch_id, original_record JSONB,
failure_reason, failure_column, failure_check, parser_version, quarantined_at,
manifest_id`. Append-only.

```json
{
  "source": "votes_sample",
  "original_record": {
    "vote_choice": "Neaišku", "sitting_date": "2026-07-14",
    "seimas_vote_id": 5191, "politician_seimas_id": 90947
  },
  "failure_reason": "vote_choice: isin(('Už', 'Prieš', 'Susilaikė')) (got 'Neaišku')",
  "failure_column": "vote_choice",
  "failure_check": "isin(('Už', 'Prieš', 'Susilaikė'))",
  "parser_version": "votes-1"
}
```

The original is kept verbatim: the record that broke the parser is the only
evidence of how the feed changed.

## 7. Healthchecks wiring and failure behaviour

**No account was created and none is required.** STOP condition 3 covers
third-party accounts, and the zero-cost rule forbids new hosted dependencies.
Both pings read a URL from the environment and are skipped when absent — an
unconfigured ping is silence, never a false green.

- daily sync → `HEALTHCHECK_SYNC_URL` on completion
- dq runner → `HEALTHCHECK_DQ_URL`, pinging `/fail` on a blocking failure, so a
  red suite is distinguishable from a runner that never started

**Publish gate.** `refresh_stats.sh` consults `dq_check_runner.py --gate` and
distinguishes three outcomes:

| rc | Meaning | Behaviour |
| --: | --- | --- |
| 0 | clear | refresh |
| 1 | a `block_publish` check failed | **hold** — last-good views stay served |
| 2 | runner cannot run (checks not installed here) | warn, refresh anyway |

The rc=2 branch is not cosmetic. My first version treated any non-zero as
blocking, which would have **frozen every matview refresh in production the
moment it shipped** — including `mp_attendance_v2`, two days before attendance
v2 takes effect. Caught by running it. A second bug in the same block: `set +e`
does not suppress the `ERR` trap, so the job died silently; the `if` condition
form is the exempt one. Both paths verified against production (rc=2 → refresh
completed) and locally (rc=1 → hold).

## 8. CZ-3 probe outcome

Probed 2026-08-24 with Martynas Gedvilas (`asmens_id=90947`, 94 initiatives) —
a member known to have activity, so an empty response means an empty feed
rather than an inactive member.

| Feed | Result | Evidence |
| --- | --- | --- |
| `ad_sn_inicijuoti_ta_projektai` | **live** | 96 record elements, 27,112 bytes |
| `ad_sn_pasiulymai_ta_projektams` | **live** | 75 record elements, 20,464 bytes |

Both recorded as dated `snapshot_manifest` rows. **Liveness is established for
both.** No activity metric was built on them — that remains a separate decision.

## 9. Deviations

1. **The five spec documents do not exist.** Built from the task text.
2. **Production migration held.** 027/028 applied to a local scratch DB only.
   The diff is in this commit for review.
3. **`legislation_project_id_unique_not_null` is vacuous today** (0 rows).
   Placing it on `votes.project_id` instead would manufacture 541 failures out
   of correct data.
4. **Pandera lives in `requirements-pipeline.txt`, not `requirements.txt`.**
   The latter carries "# pandas - removed to save build size on Render", a
   deliberate prior decision; boundary validation runs in the local ingestion
   path, never in the web process, so reversing it was unnecessary.
5. **Payload bytes are not written anywhere** — gated on §3 above.
6. **`content_sha256` added beyond spec.** The specified raw-bytes change
   detection cannot work against these feeds.
7. **Manifest wired into one ingest so far** (`ingest_sessions`), as the
   verified pattern. The remaining ingests follow the same three lines.
