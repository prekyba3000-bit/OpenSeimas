-- MP Assets Table
CREATE TABLE IF NOT EXISTS mp_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    mandatory_assets_eur NUMERIC(15, 2),
    securities_art_jewelry_eur NUMERIC(15, 2),
    cash_deposits_eur NUMERIC(15, 2),
    loans_granted_eur NUMERIC(15, 2),
    loans_received_eur NUMERIC(15, 2),
    total_income_eur NUMERIC(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(politician_id, year)
);
-- Index for correlation
CREATE INDEX IF NOT EXISTS idx_mp_assets_politician_year ON mp_assets(politician_id, year);