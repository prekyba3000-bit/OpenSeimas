-- Which sittings the floor-speech ingest has already read.
--
-- The ingest walks every sitting in the term on every run: 177 HTTP requests
-- to re-read closed sittings, 8,036 turns attempted and 8,012 deduped, for 24
-- new rows. Correct but wasteful, and it grows with the term.
--
-- A closed sitting is append-only at the source, so once it has been read with
-- a stenogram and yielded turns, re-reading it finds nothing. This records that
-- so it can be skipped.
--
-- Deliberately NOT skipped, because each is a way the assumption could be wrong:
--   * recent sittings, inside the grace window — a stenogram can be revised
--   * sittings never seen before
--   * sittings that had no stenogram, which may gain one later (2 such on the
--     2026-08-25 catch-up run)
--   * sittings that yielded zero turns, which may mean an early read rather
--     than a silent sitting
-- The optimisation is therefore only ever applied where re-reading has been
-- observed to be pointless, never inferred from age alone.

CREATE TABLE IF NOT EXISTS sitting_ingest_state (
    posedis_id        TEXT PRIMARY KEY,
    sitting_date      DATE,
    stenogram_present BOOLEAN NOT NULL DEFAULT FALSE,
    turns_seen        INTEGER NOT NULL DEFAULT 0,
    last_read_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sitting_ingest_state_date
    ON sitting_ingest_state (sitting_date DESC);
