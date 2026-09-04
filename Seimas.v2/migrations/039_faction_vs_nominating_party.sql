-- `politicians.current_party` held two different facts in one column.
--
-- The ingest built it as a fallback chain: start with `iškėlusi_partija` (the
-- party that NOMINATED the member) and overwrite it with the faction name if a
-- faction could be resolved. When resolution failed, the nominating party was
-- left in place and rendered as though it were the member's parliamentary
-- group. A reader comparing two rows could not tell which fact they were
-- looking at.
--
-- Resolution failed for a specific and unlucky reason: the ingest matched the
-- role string "frakcijos nar" (Frakcijos narys/narė) and nothing else, while
-- LRS also uses "Frakcijos seniūnas/seniūnė" and "Frakcijos seniūno
-- pavaduotojas/pavaduotoja". So the faction LEADERS and their deputies — the
-- 10 members most clearly identified with a faction — were the ones labelled
-- with their nominating party instead. Verified against p2b.ad_seimo_nariai on
-- 2026-09-04: Čmilytė-Nielsen, Žemaitaitis, Lingė and Podolskis all carry a
-- current faction role in the source.
--
-- Matching on the department name instead resolves 139 of 140 active members
-- into 7 groups, where the column previously held 13 distinct values. No
-- member has more than one current faction role, so the rule is unambiguous.
--
-- The 140th is Juozas Olekas, the current Seimo Pirmininkas, whose faction
-- membership the source records as ending 2025-09-10 — the Speaker steps out of
-- their faction. He has no faction, and that must render as unknown rather than
-- silently falling back to who put him on the ballot.

ALTER TABLE politicians ADD COLUMN IF NOT EXISTS nominating_party TEXT;

COMMENT ON COLUMN politicians.nominating_party IS
    'LRS SeimoNarys/@iškėlusi_partija — who nominated the member. NOT their '
    'parliamentary faction, and never a fallback for it.';

COMMENT ON COLUMN politicians.current_party IS
    'The member''s current parliamentary faction (frakcija), from a Pareigos '
    'row whose padalinio_pavadinimas names a faction and whose data_iki is '
    'empty. NULL when the member sits in none — the Speaker, by convention. '
    'Never falls back to nominating_party: they are different facts.';
