-- Migration: Forensic Engine tables (Engines 01-05)

-- Engine 01: Amendment temporal profiling
CREATE TABLE IF NOT EXISTS amendment_profiles (
    id SERIAL PRIMARY KEY,
    amendment_id TEXT UNIQUE REFERENCES amendments(amendment_id),
    word_count INTEGER,
    legal_citation_count INTEGER,
    complexity_score REAL,
    drafting_window_minutes INTEGER,
    speed_anomaly_zscore REAL,
    cluster_id INTEGER,
    computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_amp_speed ON amendment_profiles(speed_anomaly_zscore);

-- Engine 02: Benford's Law analysis per MP
CREATE TABLE IF NOT EXISTS benford_analyses (
    id SERIAL PRIMARY KEY,
    mp_id INTEGER,
    sample_size INTEGER,
    chi_squared REAL,
    p_value REAL,
    mad REAL,
    digit_distribution JSONB,
    conformity_label TEXT,
    flagged_fields JSONB,
    computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_benford_pvalue ON benford_analyses(p_value);

-- Engine 03: Faction alignment materialized view
DROP MATERIALIZED VIEW IF EXISTS faction_alignment;
CREATE MATERIALIZED VIEW faction_alignment AS
WITH party_majority AS (
    SELECT
        mv.vote_id,
        p.current_party,
        MODE() WITHIN GROUP (ORDER BY mv.vote_choice) AS party_position
    FROM mp_votes mv
    JOIN politicians p ON p.id = mv.politician_id
    WHERE p.is_active = TRUE
      AND mv.vote_choice IS NOT NULL
      AND mv.vote_choice != 'Nedalyvavo'
    GROUP BY mv.vote_id, p.current_party
)
SELECT
    p.id AS mp_id,
    p.display_name,
    p.current_party,
    v.sitting_date,
    COUNT(*) AS votes_on_day,
    COUNT(*) FILTER (WHERE mv.vote_choice = pm.party_position) AS aligned_votes,
    ROUND(
        COUNT(*) FILTER (WHERE mv.vote_choice = pm.party_position)::numeric
        / NULLIF(COUNT(*), 0) * 100, 2
    ) AS alignment_pct
FROM mp_votes mv
JOIN politicians p ON p.id = mv.politician_id
JOIN votes v ON v.seimas_vote_id = mv.vote_id
JOIN party_majority pm ON pm.vote_id = mv.vote_id AND pm.current_party = p.current_party
WHERE mv.vote_choice IS NOT NULL AND mv.vote_choice != 'Nedalyvavo'
GROUP BY p.id, p.display_name, p.current_party, v.sitting_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_faction_alignment ON faction_alignment(mp_id, sitting_date);

-- Engine 04: Corporate ownership graph
CREATE TABLE IF NOT EXISTS ownership_edges (
    id SERIAL PRIMARY KEY,
    source_entity_code TEXT,
    target_entity_code TEXT,
    edge_type TEXT,
    person_name TEXT,
    snapshot_date DATE
);
CREATE INDEX IF NOT EXISTS ix_ownership_source ON ownership_edges(source_entity_code);
CREATE INDEX IF NOT EXISTS ix_ownership_target ON ownership_edges(target_entity_code);
CREATE INDEX IF NOT EXISTS ix_ownership_source_target ON ownership_edges(source_entity_code, target_entity_code);

CREATE TABLE IF NOT EXISTS indirect_links (
    id SERIAL PRIMARY KEY,
    mp_id INTEGER,
    target_entity_code TEXT,
    target_entity_name TEXT,
    hop_count INTEGER,
    path JSONB,
    has_procurement_hit BOOLEAN DEFAULT FALSE,
    has_debtor_hit BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_indirect_mp ON indirect_links(mp_id);
CREATE INDEX IF NOT EXISTS ix_indirect_target ON indirect_links(target_entity_code);

-- Engine 05: Vote geometry / statistical anomaly
CREATE TABLE IF NOT EXISTS vote_geometry (
    id SERIAL PRIMARY KEY,
    vote_id INTEGER,
    expected_for REAL,
    expected_against REAL,
    expected_abstain REAL,
    actual_for INTEGER,
    actual_against INTEGER,
    actual_abstain INTEGER,
    deviation_sigma REAL,
    anomaly_type TEXT,
    faction_deviations JSONB,
    computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_vg_sigma ON vote_geometry(deviation_sigma DESC);
CREATE INDEX IF NOT EXISTS ix_vg_vote ON vote_geometry(vote_id);
