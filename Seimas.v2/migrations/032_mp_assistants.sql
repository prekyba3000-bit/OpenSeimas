-- Parliamentary assistants and secretaries, from p2b.ad_sn_padejejai_sekretoriai.
--
-- The feed carries five fields per row: vardas, pavardė, ar_apygardoje,
-- kontakto_rūšis and kontakto_reikšmė — the last being a direct phone number or
-- an @lrs.lt address, one row per contact method, so each person appears twice.
--
-- This table has no contact column, deliberately and structurally. Assistants
-- are staff, not elected officials. The public-interest argument that justifies
-- publishing how a member voted does not reach their secretary's direct line,
-- and republishing ~1,000 contact details in bulk and indexed is a different
-- act from each sitting on one LRS page. The value is dropped at the parser, so
-- there is no column to leak, no backup to scrub and no future surface that can
-- accidentally render it. Data not collected cannot leak.
--
-- What remains is the employment relationship, which is a real public fact:
-- who works for whom, and whether in the constituency office or in Vilnius.

CREATE TABLE IF NOT EXISTS mp_assistants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mp_id           UUID NOT NULL REFERENCES politicians(id),
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    -- „ar_apygardoje" — constituency office rather than the parliament building.
    in_constituency BOOLEAN,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per person, not per contact method: the feed repeats each assistant
-- once for their phone and once for their email, and both collapse here.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_assistants_identity
    ON mp_assistants (mp_id, first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_mp_assistants_mp ON mp_assistants (mp_id);
