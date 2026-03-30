-- Migration: Hero engine direct-data expansion
-- Created at: 2026-02-24

ALTER TABLE politicians
    ADD COLUMN IF NOT EXISTS bills_authored_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS speeches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id UUID REFERENCES politicians(id),
    session_date DATE,
    speech_duration_seconds INTEGER,
    words_spoken INTEGER,
    source_speech_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS committee_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id UUID REFERENCES politicians(id),
    committee_name TEXT NOT NULL,
    role TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    source_duty_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speeches_mp_id ON speeches(mp_id);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_mp_id ON committee_memberships(mp_id);
