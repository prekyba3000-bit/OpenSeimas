-- Migration 013: CVP IS procurement contracts and MP supplier-link view.
--
-- Source: OCP Data Registry, publication 68 (Lithuania CVP IS), OCDS format.
-- We persist only contracts where at least one supplier's organization_code
-- (juridinis asmens kodas) matches a code declared by an MP in interests
-- (employer / member / transaction-counterparty). This keeps storage small
-- while preserving full context for Phantom Network edge inspection.
--
-- One row per (release, supplier) pair: a release with two co-suppliers
-- (joint venture) produces two rows.

CREATE TABLE IF NOT EXISTS procurement_contracts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocid            TEXT NOT NULL,
    release_id      TEXT NOT NULL,
    release_date    DATE,
    award_date      DATE,
    buyer_name      TEXT,
    buyer_code      TEXT,
    supplier_name   TEXT,
    supplier_code   TEXT NOT NULL,
    tender_title    TEXT,
    value_amount    NUMERIC,
    value_currency  TEXT,
    fetched_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (release_id, supplier_code)
);

CREATE INDEX IF NOT EXISTS ix_procurement_contracts_supplier
    ON procurement_contracts(supplier_code);

CREATE INDEX IF NOT EXISTS ix_procurement_contracts_buyer
    ON procurement_contracts(buyer_code);

-- Phantom Network edge view: every (MP, declared-org, contract) triple where
-- the org appears in both VRK declarations and CVP IS as a supplier.
-- mp_role identifies *how* the MP is connected to the supplier:
--   employer    — MP declared this org as Darbovietė (current/former employer)
--   member      — MP declared this org as Ryšys (party / NGO / other body)
--   transaction — MP declared a transaction with this org (Ryšys sudarius
--                 sandorį); near-zero match count expected because that
--                 form usually doesn't carry an org_code.
-- The role is derived from interests.description (the JSON base key) since
-- interests.interest_type is uniformly "VRK_DECLARATION" in the source.
CREATE OR REPLACE VIEW mp_supplier_links AS
SELECT
    i.politician_id,
    p.display_name        AS mp_name,
    p.current_party       AS mp_party,
    i.organization_code   AS org_code,
    i.parsed_organization_name AS org_name,
    -- description is JSON-dumped with ensure_ascii=True (Lithuanian chars
    -- escaped as \uXXXX), so we match against the stored escape sequences.
    -- LIKE eats backslashes; position() doesn't, so we use it instead.
    -- Order matters: "Ryšys sudarius sandorį" must be checked before "Ryšys"
    -- since both start with "Ryšys".
    CASE
        WHEN position('"Darboviet\u0117"' IN i.description) > 0 THEN 'employer'
        WHEN position('"Ry\u0161ys sudarius sandor\u012f"' IN i.description) > 0 THEN 'transaction'
        WHEN position('"Ry\u0161ys"' IN i.description) > 0 THEN 'member'
        ELSE 'other'
    END                   AS mp_role,
    pc.ocid,
    pc.release_date,
    pc.award_date,
    pc.buyer_name,
    pc.buyer_code,
    pc.tender_title,
    pc.value_amount,
    pc.value_currency
FROM interests i
JOIN politicians p ON p.id = i.politician_id
JOIN procurement_contracts pc
  ON pc.supplier_code = i.organization_code
WHERE i.organization_code IS NOT NULL;
