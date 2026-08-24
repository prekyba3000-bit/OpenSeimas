-- Wave 1 data-health substrate: source snapshots, and dbt-test-style SQL checks.
--
-- Column names here were confirmed against the live schema before seeding, and
-- three of the spec's assumed names do not exist. The mapping is recorded in
-- docs/reviews/wave1-data-health.md; the important one is that
-- mp_votes.vote_id references votes(seimas_vote_id), NOT votes(id) — joining on
-- votes.id reports all 743,515 rows as orphans.

-- ─── A1: content-addressed source snapshots ─────────────────────────────────
-- The manifest is committed to git; payloads are not (see the report for the
-- storage proposal). Render's disk is ephemeral, so a manifest row is the
-- durable record that a given byte-sequence was fetched at a given time.
CREATE TABLE IF NOT EXISTS snapshot_manifest (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source         TEXT NOT NULL,
    url            TEXT NOT NULL,
    fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Two hashes, two jobs. `sha256` is over the raw bytes and proves what we
    -- received. `content_sha256` is over the payload with the feed's own
    -- generation timestamp removed, and is the only one usable for change
    -- detection: p2b feeds stamp suformavimo_laikas into the root element, so
    -- two fetches two seconds apart differ by exactly those bytes and a raw
    -- hash reports "changed" every single time. Measured 2026-08-24: identical
    -- 1048-byte payloads, one differing byte at offset 124.
    sha256         TEXT NOT NULL CHECK (char_length(sha256) = 64),
    content_sha256 TEXT CHECK (content_sha256 IS NULL OR char_length(content_sha256) = 64),
    byte_count     BIGINT NOT NULL CHECK (byte_count >= 0),
    parser_version TEXT NOT NULL,
    fetch_status   TEXT NOT NULL CHECK (fetch_status IN ('ok', 'error', 'unchanged')),
    error          TEXT
);
CREATE INDEX IF NOT EXISTS idx_snapshot_manifest_source ON snapshot_manifest (source, fetched_at DESC);
-- Change detection is client-side: lrs.lt serves no ETag or Last-Modified, so
-- "did this feed change" is answered by comparing this hash to the previous one.
CREATE INDEX IF NOT EXISTS idx_snapshot_manifest_sha ON snapshot_manifest (source, content_sha256);

-- Wire migration 017's provenance table to the manifest.
ALTER TABLE source_fetches ADD COLUMN IF NOT EXISTS manifest_id UUID REFERENCES snapshot_manifest(id);
-- Three-way reconciliation needs three numbers and the table had one.
-- rows_affected alone cannot distinguish "the feed shrank" from "the parser
-- dropped records": parsed is what came off the wire, inserted is what landed.
ALTER TABLE source_fetches ADD COLUMN IF NOT EXISTS parsed_count INTEGER;
ALTER TABLE source_fetches ADD COLUMN IF NOT EXISTS inserted_count INTEGER;
ALTER TABLE source_fetches ADD COLUMN IF NOT EXISTS reconciliation_note TEXT;

-- ─── A2: SQL checks with dbt-test semantics ─────────────────────────────────
-- A check is SQL that returns violating rows. Zero rows is a pass. There is no
-- separate "expected" value to drift out of date.
CREATE TABLE IF NOT EXISTS dq_checks (
    check_key      TEXT PRIMARY KEY,
    description_lt TEXT NOT NULL,
    sql            TEXT NOT NULL,
    severity       TEXT NOT NULL CHECK (severity IN ('error', 'warn')),
    error_if       TEXT,
    warn_if        TEXT,
    action         TEXT NOT NULL CHECK (action IN ('block_publish', 'record')),
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dq_check_runs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_key         TEXT NOT NULL REFERENCES dq_checks(check_key),
    run_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 'unknown' is a first-class outcome: a check that could not execute did
    -- not pass. Collapsing it into pass is how a dead check reads as health.
    status            TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'error', 'unknown')),
    failing_row_count INTEGER,
    sample_rows       JSONB,
    duration_ms       INTEGER,
    error             TEXT
);
CREATE INDEX IF NOT EXISTS idx_dq_check_runs_key ON dq_check_runs (check_key, run_at DESC);

-- Append-only. A data-health record that can be edited is a record of what
-- somebody was willing to leave behind, not of what happened.
REVOKE UPDATE, DELETE ON dq_check_runs FROM PUBLIC;
REVOKE UPDATE, DELETE ON snapshot_manifest FROM PUBLIC;
DO $$
BEGIN
    EXECUTE format('REVOKE UPDATE, DELETE ON dq_check_runs FROM %I', current_user);
    EXECUTE format('REVOKE UPDATE, DELETE ON snapshot_manifest FROM %I', current_user);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'append-only grants not applied for %: %', current_user, SQLERRM;
END $$;

-- ─── A3: boundary validation quarantine ─────────────────────────────────────
-- Records that failed schema validation are kept, not dropped. A record we
-- could not parse is evidence about the feed; discarding it destroys the only
-- copy of the thing that broke.
CREATE TABLE IF NOT EXISTS quarantine_rows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          TEXT NOT NULL,
    batch_id        TEXT,
    original_record JSONB NOT NULL,
    failure_reason  TEXT NOT NULL,
    failure_column  TEXT,
    failure_check   TEXT,
    parser_version  TEXT NOT NULL,
    quarantined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    manifest_id     UUID REFERENCES snapshot_manifest(id)
);
CREATE INDEX IF NOT EXISTS idx_quarantine_source ON quarantine_rows (source, quarantined_at DESC);
REVOKE UPDATE, DELETE ON quarantine_rows FROM PUBLIC;
