-- MP diary events, from p2b.ad_sn_darbotvarkes.
--
-- Evidence, never a count. Settled in docs/reviews/mp-diary-design-note.md
-- before either feed was built: ~93% of a diary is the parliamentary calendar,
-- so its length measures office and committee load, not effort. A member with
-- 1,901 events chairs more bodies than one with 225. No dial reads this table
-- and no surface displays a total.
--
-- Reconcile, not insert-once. Measured 2026-08-27 → 2026-08-31: 3 of 140
-- members gained entries dated more than eleven days earlier, so the feed adds
-- to the past. An ingest that wrote each event once would miss those
-- permanently and never notice. Upserts on a content hash handle it.
--
-- Deletions are deliberately NOT handled: only additions were observed, and
-- removing rows because a feed briefly omitted them is how a transient upstream
-- glitch becomes permanent data loss. If upstream deletion ever matters, it
-- needs its own detection and its own evidence.

CREATE TABLE IF NOT EXISTS mp_diary_events (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id         UUID NOT NULL REFERENCES politicians(id),
    starts_at     TIMESTAMP NOT NULL,
    ends_at       TIMESTAMP,
    -- Frequently blank at source: 0 of 552 rows for one backbencher, 509 of
    -- 1,073 for the member with the fullest diary. NULL means the feed gave no
    -- location, which the surface must render as unknown rather than as an
    -- empty line implying none existed.
    location      TEXT,
    title         TEXT NOT NULL,
    -- Identity, since the feed supplies no event id. Two genuinely distinct
    -- events with the same member, start, end, location and title are
    -- indistinguishable in the source and collapse here.
    content_hash  TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mp_diary_identity UNIQUE (mp_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_mp_diary_mp_start
    ON mp_diary_events (mp_id, starts_at DESC);

-- Per-member fingerprint, so a run can tell whether a diary changed at all
-- before doing any write work.
CREATE TABLE IF NOT EXISTS mp_diary_state (
    mp_id        UUID PRIMARY KEY REFERENCES politicians(id),
    full_sha256  TEXT NOT NULL,
    event_count  INTEGER NOT NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
