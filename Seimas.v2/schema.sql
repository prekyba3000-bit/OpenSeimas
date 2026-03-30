-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. The Master Identity Table (The "Rosetta Stone")
CREATE TABLE politicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Normalized Identity (for search/display)
    full_name_normalized TEXT NOT NULL,
    -- e.g., "jonas jonaitis"
    display_name TEXT NOT NULL,
    -- e.g., "Jonas Jonaitis"
    date_of_birth DATE,
    -- External Anchors (Unique IDs from sources)
    seimas_mp_id INTEGER UNIQUE,
    -- Anchor: Seimas API ID (e.g., 5643)
    vrk_candidate_id TEXT UNIQUE,
    -- Anchor: VRK Candidate ID
    open_sanctions_id TEXT,
    -- Context: PEP Data
    -- Metadata
    current_party TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    term_end_date DATE,
    photo_url TEXT,
    alt_text JSONB,
    -- Multilingual alt text for accessibility
    bio TEXT,
    -- Raw/Rich bio
    plain_text_bio TEXT,
    -- Simplified bio for screen readers
    bills_authored_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);
-- 2. Assets (VMI Data)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES politicians(id),
    year INTEGER NOT NULL,
    total_value NUMERIC(15, 2),
    source_url TEXT,
    raw_json JSONB,
    -- Store full raw line for audit
    created_at TIMESTAMP DEFAULT NOW()
);
-- 3. Conflicts of Interest (VTEK Data)
CREATE TABLE interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES politicians(id),
    interest_type TEXT,
    -- 'Shareholder', 'Spouse', 'Gift'
    description TEXT,
    organization_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX idx_politicians_name ON politicians(full_name_normalized);
CREATE INDEX idx_politicians_seimas ON politicians(seimas_mp_id);
-- 4. Votes (Seimas Voting Data)
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    seimas_vote_id INTEGER UNIQUE NOT NULL,
    -- The external ID (balsavimo_id)
    sitting_date DATE,
    title TEXT,
    description TEXT,
    project_id TEXT,
    -- NEW: Links to legislative project (Nr. ...)
    vote_type TEXT,
    -- NEW: Stage (Pateikimas, Priėmimas etc)
    result_type TEXT,
    -- 'Priimta', 'Nepriimta'
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE mp_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id INTEGER REFERENCES votes(seimas_vote_id),
    politician_id UUID REFERENCES politicians(id),
    vote_choice TEXT,
    -- 'Uz', 'Pries', 'Susilaike', 'Nedalyvavo'
    -- Composite unique key to prevent duplicate votes per MP per Motion
    UNIQUE(vote_id, politician_id)
);
CREATE INDEX idx_mp_votes_politician ON mp_votes(politician_id);
CREATE INDEX idx_votes_date ON votes(sitting_date);
CREATE INDEX idx_votes_project ON votes(project_id);

-- 5. Speeches and committee role data for hero engine direct metrics
CREATE TABLE speeches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id UUID REFERENCES politicians(id),
    session_date DATE,
    speech_duration_seconds INTEGER,
    words_spoken INTEGER,
    source_speech_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE committee_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id UUID REFERENCES politicians(id),
    committee_name TEXT NOT NULL,
    role TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    source_duty_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_speeches_mp_id ON speeches(mp_id);
CREATE INDEX idx_committee_memberships_mp_id ON committee_memberships(mp_id);