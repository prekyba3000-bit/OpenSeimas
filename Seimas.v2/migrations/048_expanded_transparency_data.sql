-- Migration 048: Expanded Transparency Data Schema
-- Supports VTEK declarations, CVP IS procurement contracts, lobbyist meetings,
-- Seimas committee stenograms, and VRK campaign finance donor records.

BEGIN;

-- 1. VTEK Private Interests Declarations
CREATE TABLE IF NOT EXISTS vtek_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seimas_mp_id INT REFERENCES politicians(seimas_mp_id) ON DELETE CASCADE,
    declaration_id VARCHAR(100) UNIQUE NOT NULL,
    declaration_type VARCHAR(100), -- 'annual', 'initial', 'updated'
    declarant_name VARCHAR(255) NOT NULL,
    position_title VARCHAR(255),
    declared_assets_summary JSONB DEFAULT '{}'::jsonb,
    corporate_interests JSONB DEFAULT '[]'::jsonb,
    gifts_declared JSONB DEFAULT '[]'::jsonb,
    declared_date DATE,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vtek_declarations_mp_id ON vtek_declarations(seimas_mp_id);
CREATE INDEX IF NOT EXISTS idx_vtek_declarations_date ON vtek_declarations(declared_date);

-- 2. CVP IS Public Procurement Contracts & Tenders
CREATE TABLE IF NOT EXISTS procurement_tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id VARCHAR(100) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(100),
    contract_value_eur NUMERIC(12, 2),
    contract_date DATE,
    mp_relation_note TEXT,
    linked_mp_id INT REFERENCES politicians(seimas_mp_id) ON DELETE SET NULL,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_tenders_mp_id ON procurement_tenders(linked_mp_id);
CREATE INDEX IF NOT EXISTS idx_procurement_tenders_supplier ON procurement_tenders(supplier_code);

-- 3. Lobbyist Meetings Register
CREATE TABLE IF NOT EXISTS lobbyist_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id VARCHAR(100) UNIQUE NOT NULL,
    lobbyist_name VARCHAR(255) NOT NULL,
    lobbyist_organization VARCHAR(255),
    official_mp_id INT REFERENCES politicians(seimas_mp_id) ON DELETE CASCADE,
    official_name VARCHAR(255) NOT NULL,
    meeting_date DATE NOT NULL,
    topic_summary TEXT NOT NULL,
    bill_registration_number VARCHAR(100),
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobbyist_meetings_mp_id ON lobbyist_meetings(official_mp_id);
CREATE INDEX IF NOT EXISTS idx_lobbyist_meetings_date ON lobbyist_meetings(meeting_date);

-- 4. Seimas Committee Stenograms & Minutes
CREATE TABLE IF NOT EXISTS committee_stenograms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_name VARCHAR(255) NOT NULL,
    sitting_date DATE NOT NULL,
    sitting_number VARCHAR(50),
    bill_registration_number VARCHAR(100),
    agenda_topics JSONB DEFAULT '[]'::jsonb,
    attendees_mp_ids INT[] DEFAULT '{}',
    transcript_text TEXT,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_stenograms_date ON committee_stenograms(sitting_date);
CREATE INDEX IF NOT EXISTS idx_committee_stenograms_bill ON committee_stenograms(bill_registration_number);

-- 5. VRK Campaign Finance & Donors
CREATE TABLE IF NOT EXISTS campaign_donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id VARCHAR(100) UNIQUE NOT NULL,
    recipient_mp_id INT REFERENCES politicians(seimas_mp_id) ON DELETE SET NULL,
    recipient_party_name VARCHAR(255) NOT NULL,
    donor_name VARCHAR(255) NOT NULL,
    donor_type VARCHAR(50) DEFAULT 'individual', -- 'individual', 'corporate'
    amount_eur NUMERIC(10, 2) NOT NULL,
    donation_date DATE NOT NULL,
    campaign_name VARCHAR(255),
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_donors_mp_id ON campaign_donors(recipient_mp_id);
CREATE INDEX IF NOT EXISTS idx_campaign_donors_donor ON campaign_donors(donor_name);

COMMIT;
