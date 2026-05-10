-- Migration 010: 2024 Seimas election results from VRK open data.
--
-- Adds per-MP election context to politicians: which constituency they won,
-- whether they took a single-mandate or multi-mandate seat, the vote share
-- they received. Source is VRK's open-data API at atviriduomenys.vrk.lt
-- dataset gov/vrk/Rezultatai (per-station per-candidate vote totals).
--
-- election_type: 'single_mandate' (apygarda race) | 'multimandate' (party list)
-- constituency_number / _name: apygarda where the MP ran for single-mandate;
--   NULL for pure-multimandate winners.
-- vote_share: for single_mandate, candidate's share of valid ballots in their
--   apygarda. For multimandate, their party's national list share. Stored as
--   a fraction in [0, 1].
-- vrk_election_id: VRK rink_turo_id of the election (2150 = 2024 Seimas I turas).

ALTER TABLE politicians
    ADD COLUMN IF NOT EXISTS election_type TEXT,
    ADD COLUMN IF NOT EXISTS constituency_number INTEGER,
    ADD COLUMN IF NOT EXISTS constituency_name TEXT,
    ADD COLUMN IF NOT EXISTS vote_share REAL,
    ADD COLUMN IF NOT EXISTS vrk_election_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_politicians_constituency
    ON politicians(constituency_number)
    WHERE constituency_number IS NOT NULL;
