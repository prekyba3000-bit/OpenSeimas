-- Promote "self or spouse" from buried JSON to a real column.
--
-- ingest_interests.py already parses which section heading a declared
-- employer/connection sat under ("Deklaruojančio darbovietės" vs "Sutuoktinio
-- darbovietės") and stores it as `declarant_relation` inside the JSON
-- `description` blob. That was enough to be truthful, not enough to be
-- usable: a fact worth distinguishing at all is a fact worth being able to
-- query, filter and join on directly, not one a reader has to parse JSON to
-- find. Same reasoning as `current_party` vs `nominating_party` (migration
-- 039) and `organization_code` (migration 012) — a fact that matters gets its
-- own column.
--
-- Additive only. `description` is untouched; `declarant_relation` is derived
-- from it, not a replacement for it.

ALTER TABLE interests ADD COLUMN IF NOT EXISTS declarant_relation TEXT;

COMMENT ON COLUMN interests.declarant_relation IS
    'self or spouse - whose employer/connection/transaction this row '
    'declares, per the section heading VRK published it under. NULL for '
    'rows ingested before this column existed and never backfilled, or for '
    'a future declaration type this project has not seen yet.';

CREATE INDEX IF NOT EXISTS idx_interests_declarant_relation
    ON interests(declarant_relation);

-- Backfill from what is already correctly parsed and stored in `description`.
-- The JSON key is ASCII ("declarant_relation"), so no unicode-escaping
-- gymnastics are needed the way migration 013's mp_role matching required.
UPDATE interests
SET declarant_relation =
    CASE
        WHEN description LIKE '%"declarant_relation": "spouse"%' THEN 'spouse'
        WHEN description LIKE '%"declarant_relation": "self"%' THEN 'self'
        ELSE NULL
    END
WHERE declarant_relation IS NULL;

-- mp_supplier_links now says WHOSE declared connection produced the match,
-- not only that a match exists. A contract linked through the MP's own
-- declared employer and one linked through their spouse's are different
-- facts a reader needs to be able to tell apart — collapsing them would
-- overstate what either one shows on its own.
CREATE OR REPLACE VIEW mp_supplier_links AS
SELECT
    i.politician_id,
    p.display_name        AS mp_name,
    p.current_party        AS mp_party,
    i.organization_code    AS org_code,
    i.parsed_organization_name AS org_name,
    -- Copied verbatim from migration 013, not retyped by hand a second time.
    -- `description` is written by json.dumps(..., ensure_ascii=True), so the
    -- column's stored text contains the six literal ASCII characters
    -- backslash-u-0-1-1-7 wherever the letter "e-with-dot-above" appears —
    -- never the actual UTF-8 character. A plain (non-E-prefixed) SQL string
    -- literal does not interpret backslashes under standard_conforming_strings,
    -- so the ė escape below is being matched as those same six literal
    -- characters, which is what makes it line up with the stored text.
    -- Substituting the real accented character here — the "obvious" cleanup —
    -- would compile and run without error and silently match nothing, sending
    -- every row to 'other'. Checked against a live row before writing this
    -- migration, and again by re-inspecting the written bytes afterward,
    -- because the mistake happened once already while drafting it.
    -- Order matters: the transaction phrase must be checked before the bare
    -- "Ryšys" it starts with, or every transaction would be counted as a
    -- membership instead.
    CASE
        WHEN position('"Darboviet\u0117"' IN i.description) > 0 THEN 'employer'
        WHEN position('"Ry\u0161ys sudarius sandor\u012f"' IN i.description) > 0 THEN 'transaction'
        WHEN position('"Ry\u0161ys"' IN i.description) > 0 THEN 'member'
        ELSE 'other'
    END                    AS mp_role,
    pc.ocid,
    pc.release_date,
    pc.award_date,
    pc.buyer_name,
    pc.buyer_code,
    pc.tender_title,
    pc.value_amount,
    pc.value_currency,
    -- Appended, not inserted alongside mp_role above: CREATE OR REPLACE VIEW
    -- refuses to change the name or position of an existing output column —
    -- "cannot change name of view column ... to ..." — so a new column can
    -- only be added at the end of the list, never spliced in next to the
    -- fact it's most related to. Whose declaration this is; NOT who the
    -- contract's counterparty is — every row here is still keyed to the MP
    -- (i.politician_id), because that is whose profile this view exists to
    -- back. A spouse is a private individual, never a subject in their own
    -- right on this surface.
    COALESCE(i.declarant_relation, 'self') AS declarant_relation
FROM interests i
JOIN politicians p ON p.id = i.politician_id
JOIN procurement_contracts pc
  ON pc.supplier_code = i.organization_code
WHERE i.organization_code IS NOT NULL;
