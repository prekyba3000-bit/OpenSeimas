-- Official foreign travel, from p2b.ad_sn_komandiruotes.
--
-- Evidence, not a metric. Trip counts track committee role and leadership —
-- a delegation chair travels more than a backbencher for reasons that have
-- nothing to do with diligence — so no dial reads this table and no count of
-- it is displayed. Same rule as the MP diary, decided in
-- docs/reviews/mp-diary-design-note.md before either was built.
--
-- The feed has no trip identifier, so identity is (member, start date, title).
-- It also has no destination field: the title carries the purpose in prose
-- ("...dalyvavimo NATO Parlamentinės Asamblėjos ... sesijoje"), which is
-- readable but not parseable, and nothing here pretends otherwise.

CREATE TABLE IF NOT EXISTS mp_travel (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id           UUID NOT NULL REFERENCES politicians(id),
    date_from       DATE NOT NULL,
    date_to         DATE,
    trip_type       TEXT,
    title           TEXT NOT NULL,
    -- LRS truncates at exactly 200 characters, mid-word: 3 of 20 trips for the
    -- first member checked, and 584 of 5,279 vote titles show the same cut.
    -- A clipped sentence displayed as a whole one is a small lie, so the
    -- surface needs to know which titles are incomplete.
    title_truncated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_travel_identity
    ON mp_travel (mp_id, date_from, md5(title));
CREATE INDEX IF NOT EXISTS idx_mp_travel_mp ON mp_travel (mp_id, date_from DESC);
