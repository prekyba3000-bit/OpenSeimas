-- Migration 009: per-MP vote geometry rollup.
--
-- vote_geometry (migration 004) is per-vote: one row per anomalous vote
-- with overall sigma + faction-level breakdown. The hero engine wants a
-- per-MP signal — "this MP participated in N anomalous votes, the worst at
-- sigma=X" — but the per-vote table has no mp_id column. Until now the
-- engine reported "Vote geometry table is unavailable" for everyone.
--
-- This table is the rollup the engine reads. Column names match what the
-- engine looks for: id_column 'mp_id', sigma_column 'max_deviation_sigma'.

CREATE TABLE IF NOT EXISTS mp_vote_geometry (
    id SERIAL PRIMARY KEY,
    mp_id UUID UNIQUE,
    max_deviation_sigma REAL,
    anomalous_vote_count INTEGER NOT NULL DEFAULT 0,
    last_anomalous_vote_id INTEGER,
    computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_mp_vote_geometry_sigma
    ON mp_vote_geometry(max_deviation_sigma DESC);
