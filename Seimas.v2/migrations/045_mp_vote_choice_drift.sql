-- What we do instead of overwriting a member's recorded vote.
--
-- `ingest_votes_v2` inserts per-member choices with `ON CONFLICT DO NOTHING`.
-- An external audit called that a defect: if LRS corrects a vote, the
-- correction never reaches a reader. The reasoning is sound and the fix it
-- proposes — upsert the choice — is a §4.5 STOP condition, because overwriting
-- `mp_votes.vote_choice` changes a historical ingested record. What a member
-- was recorded as having voted is exactly the kind of row this project does
-- not quietly rewrite.
--
-- Measured before deciding, 2026-09-08, read-only against production: 40
-- votes sampled across the whole term, re-fetched from
-- `p2b.ad_sp_balsavimo_rezultatai`, 5,632 member-choice comparisons.
-- **Zero differences.** Not one stored choice disagrees with what the source
-- serves today. So the problem is real in principle and has never once
-- occurred, and the cost of the proposed fix is the ability to trust that a
-- stored vote is the vote.
--
-- The gap that did need closing is that we would not have known. The ingest
-- already holds both values when it runs, so it now records a disagreement
-- here and changes nothing. A drift row is evidence for a human to act on —
-- re-ingest deliberately, publish a correction — not an instruction to a
-- script.

CREATE TABLE IF NOT EXISTS mp_vote_choice_drift (
    id              BIGSERIAL PRIMARY KEY,
    -- INTEGER, matching mp_votes.vote_id, which references
    -- votes.seimas_vote_id. TEXT here would join to nothing and record
    -- nothing, quietly.
    vote_id         INTEGER NOT NULL,
    politician_id   UUID NOT NULL REFERENCES politicians(id),
    stored_choice   TEXT,
    source_choice   TEXT,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    times_seen      INTEGER NOT NULL DEFAULT 1,
    -- Set by a human after deciding what to do. NULL means nobody has looked.
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT
);

-- One row per (vote, member, disagreement). A daily ingest that keeps seeing
-- the same drift bumps a counter rather than filling the table.
CREATE UNIQUE INDEX IF NOT EXISTS mp_vote_choice_drift_unique
    ON mp_vote_choice_drift (vote_id, politician_id, COALESCE(stored_choice, ''), COALESCE(source_choice, ''));

CREATE INDEX IF NOT EXISTS mp_vote_choice_drift_unresolved
    ON mp_vote_choice_drift (last_seen_at DESC) WHERE resolved_at IS NULL;

-- A twelfth check. Warn, not block: drift is a fact to look at, not a reason
-- to stop publishing data that is otherwise correct. Publishing would help
-- nobody if it halted every time the source revised one row.
INSERT INTO dq_checks (check_key, description_lt, sql, severity, error_if, warn_if, action)
SELECT
 'mp_vote_choice_drift',
 'Šaltinis pakeitė jau įrašytą Seimo nario balsą. Įrašo nekeičiame automatiškai — skirtumas užfiksuojamas, kad žmogus galėtų patikrinti ir, jei reikia, paskelbti pataisymą.',
 $q$SELECT vote_id::text AS vote_id,
           politician_id::text AS politician_id,
           COALESCE(stored_choice, '(tuščia)') AS stored_choice,
           COALESCE(source_choice, '(tuščia)') AS source_choice,
           last_seen_at::text AS last_seen_at
    FROM mp_vote_choice_drift
    WHERE resolved_at IS NULL
    ORDER BY last_seen_at DESC$q$,
 'warn', NULL, '>0', 'record'
WHERE NOT EXISTS (SELECT 1 FROM dq_checks WHERE check_key = 'mp_vote_choice_drift');
