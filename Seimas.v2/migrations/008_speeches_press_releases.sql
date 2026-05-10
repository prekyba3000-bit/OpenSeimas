-- Migration 008: extend speeches table to accept press-release rows.
--
-- Background: ingest_speeches.py targets the LRS endpoint
-- p2b.ad_sn_pranesimai_ziniasklaidai (press releases per MP) — there is no
-- per-MP plenary-speech feed in the public LRS API. The script intends to
-- INSERT (mp_id, speech_date, speech_title, speech_url) but the table only
-- had session_date / speech_duration_seconds / words_spoken / source_speech_id,
-- so every INSERT raised "column does not exist", the per-MP except-block
-- rolled back, and the table stayed empty. Hero engine CHA dropped to "proxy"
-- for every MP as a result.
--
-- The hero engine reads speeches via COUNT(*) only, so the column shape is
-- not load-bearing for scoring — but the table needs to actually accept the
-- ingest payload. We add the press-release columns (nullable) without
-- removing the plenary-speech columns so future plenary ingest can coexist.

ALTER TABLE speeches
    ADD COLUMN IF NOT EXISTS speech_date DATE,
    ADD COLUMN IF NOT EXISTS speech_title TEXT,
    ADD COLUMN IF NOT EXISTS speech_url TEXT,
    ADD COLUMN IF NOT EXISTS speech_type TEXT NOT NULL DEFAULT 'press_release';

-- Backfill speech_date from session_date for any pre-existing rows that may
-- have been written by an older flow (defensive; current count is 0).
UPDATE speeches SET speech_date = session_date WHERE speech_date IS NULL AND session_date IS NOT NULL;

-- Dedup index: an MP can have one row per source URL. PostgreSQL's default
-- UNIQUE treats NULLs as distinct, so rows with no URL won't conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_speeches_mp_url
    ON speeches(mp_id, speech_url);
