-- Migration 012: Parsed organization fields on interests.
--
-- The existing interests.organization_name was filled with a literal sentinel
-- ("VRK Import (Raw)") for every row by the original ingest because the source
-- declaration JSON was never unpacked. This migration adds the fields that
-- the parser will populate from interests.description:
--
--   organization_code         — juridinio asmens kodas (Lithuanian legal-
--                               entity code). The reliable join key for
--                               procurement / business registry matching.
--                               NULL for transaction-counterparty rows
--                               (Ryšys sudarius sandorį) where VRK doesn't
--                               require the counterparty's code, and for
--                               metadata-only declaration rows.
--   parsed_organization_name  — canonical org name from the declaration:
--                                 Darbovietė            → "Pavadinimas" (idx 2)
--                                 Ryšys                 → "Juridinio asmens
--                                                          pavadinimas" (idx 2)
--                                 Ryšys sudarius        → "Kitos sandorio
--                                  sandorį                šalies pavadinimas" (idx 3)
--
-- We intentionally leave organization_name (the original "VRK Import (Raw)"
-- sentinel column) untouched so we don't lose the audit trail of what the
-- raw ingest produced. Downstream code should prefer parsed_organization_name
-- + organization_code.

ALTER TABLE interests
    ADD COLUMN IF NOT EXISTS organization_code TEXT,
    ADD COLUMN IF NOT EXISTS parsed_organization_name TEXT;

CREATE INDEX IF NOT EXISTS idx_interests_org_code
    ON interests(organization_code)
    WHERE organization_code IS NOT NULL;
