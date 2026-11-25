-- Evaluation ARC-01 part 3: a failing check holds what it protects, not everything.
--
-- The gate was all-or-nothing: a stale registrations feed, which can only make
-- attendance wrong, also held vote counts and faction alignment; a duplicate in
-- `legislation`, which no published view reads, held all of them. Holding what a
-- check cannot speak to is not caution, it is serving yesterday's figures for no
-- reason — and it is why a second vote source could never publish while lrs.lt
-- registrations were down.
--
-- Publication units (backend/publish.py). Views in one unit publish together,
-- because surfaces must agree across them:
--   members     mp_stats_summary + mp_leaderboard_metrics  (list reads the first,
--               profile the second; §1.4 agreement)
--   attendance  mp_attendance_v2
--   faction     faction_alignment_votes + faction_alignment (counted from it)
--
-- dq_checks.protects:
--   NULL            unknown scope: holds every unit (a check nobody scoped
--                   protects everything — the safe default for new checks)
--   '{}'            protects no published view: recorded, holds nothing
--   '{by_source}'   each failing row names a source_name; its units come from
--                   dq_source_units, and an unmapped source holds every unit
--   unit names      holds those units
-- A check that could not run (`unknown`) holds every unit regardless.

ALTER TABLE dq_checks ADD COLUMN IF NOT EXISTS protects TEXT[];

CREATE TABLE IF NOT EXISTS dq_source_units (
    source_name TEXT PRIMARY KEY,
    units       TEXT[] NOT NULL,
    reason      TEXT NOT NULL
);

INSERT INTO dq_source_units (source_name, units, reason) VALUES
    ('seimas_votes_v2', '{members,attendance,faction}',
     'mp_votes and votes feed every published view'),
    ('seimas_registrations', '{attendance}',
     'sitting_registrations and mp_registrations feed only mp_attendance_v2'),
    ('seimas_floor_speeches', '{members}',
     'speeches feed mp_leaderboard_metrics (visibility)'),
    ('seimas_authored_bills', '{members}',
     'politicians.bills_authored_count feeds mp_leaderboard_metrics (legislative activity)'),
    ('seimas_sessions', '{}', 'session boundaries feed no published view'),
    ('lrp_decrees', '{}', 'presidential decrees feed no published view'),
    ('seimas_diary', '{}', 'the diary feeds no published view'),
    ('seimas_travel', '{}', 'travel feeds no published view'),
    ('seimas_assistants', '{}', 'assistants feed no published view')
ON CONFLICT (source_name) DO NOTHING;

-- Every view reads politicians, mp_votes and votes.
UPDATE dq_checks SET protects = '{members,attendance,faction}'
WHERE check_key IN ('active_mp_count_in_band', 'politicians_asmens_id_unique_not_null',
                    'mp_votes_orphan_politicians', 'mp_votes_orphan_votes',
                    'mp_votes_unique_member_per_vote', 'vote_tally_agreement');

-- sitting_registrations is read only by mp_attendance_v2.
UPDATE dq_checks SET protects = '{attendance}'
WHERE check_key = 'sitting_day_without_registrations';

-- `legislation` is read by no published view (bills_authored_count comes from
-- politicians). The check stays on the data-health page; it holds nothing.
UPDATE dq_checks SET protects = '{}'
WHERE check_key = 'legislation_project_id_unique_not_null';

-- Per-source checks: each failing row names the source it is about.
UPDATE dq_checks SET protects = '{by_source}'
WHERE check_key IN ('frozen_feed', 'metric_backing_source_stale', 'three_way_reconciliation');
