-- Sitting registration data — the basis for plan-compliant attendance (§1:
-- "attendance from *registration* data, not vote proxies").
--
-- Why this exists: attendance has until now been inferred from whether an MP
-- cast a vote. That proxy misreads two things badly. Sittings decided "bendru
-- sutarimu" record balsavo="0" with every kaip_balsavo empty, so a day of
-- consensus decisions reads as an absence for all 141 members; and an MP who
-- is present but abstains from every recorded vote reads as absent.
--
-- Source: apps.lrs.lt/sip/p2b.ad_seimo_posedzio_eiga_full lists <registracija
-- reg_id=…> per sitting; p2b.ad_sp_registracijos_rezultatai?registracijos_id=…
-- returns one row per MP with ar_registravosi="Taip"/"Ne".
--
-- Note on excused absences: the feed reports only whether a member registered,
-- never why they did not. Sickness, parental leave and official travel are
-- indistinguishable here, so the platform annotates that limit rather than
-- claiming to exclude them (methodology attendance v2).

CREATE TABLE IF NOT EXISTS sitting_registrations (
    reg_id            BIGINT PRIMARY KEY,
    sitting_id        BIGINT,
    sitting_date      DATE,
    registration_time TIMESTAMPTZ,
    registered_count  INTEGER,
    total_count       INTEGER,
    source_url        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sitting_registrations_date
    ON sitting_registrations (sitting_date);

CREATE TABLE IF NOT EXISTS mp_registrations (
    reg_id       BIGINT NOT NULL REFERENCES sitting_registrations(reg_id) ON DELETE CASCADE,
    seimas_mp_id BIGINT NOT NULL,          -- asm_id / asmens_id, the LRS person key
    registered   BOOLEAN NOT NULL,
    PRIMARY KEY (reg_id, seimas_mp_id)
);
CREATE INDEX IF NOT EXISTS idx_mp_registrations_mp
    ON mp_registrations (seimas_mp_id, registered);

-- The source flags votes whose electronic per-MP results disagree with the
-- protocol totals (BendriBalsavimoRezultatai/@komentaras). We were discarding
-- that; a transparency platform should be the one keeping the record.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS source_comment TEXT;
