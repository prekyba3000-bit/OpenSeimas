-- Vote tallies from the LRS protocol totals.
--
-- The source (p2b.ad_sp_balsavimo_rezultatai) returns, per vote, a
-- <BendriBalsavimoRezultatai> element carrying the whole protocol summary:
--
--   <BendriBalsavimoRezultatai balsavimo_laikas="2026-07-14 14:23:05"
--     balsavo="81" viso="140" už="73" prieš="1" susilaikė="7"
--     komentaras="Elektroninėmis priemonėmis gauti individualūs ..."/>
--
-- The ingest already fetched this element and read exactly one attribute off it
-- (komentaras, the discrepancy flag, migration 018). The other six were parsed
-- and discarded, so the richest summary the source publishes was thrown away on
-- every one of 5,279 votes.
--
-- WHAT IS NOT HERE: an outcome. `votes.result_type` exists and is NULL on every
-- row because the source publishes no pass/fail field — not in this endpoint,
-- not in the sitting agenda. Deriving one from `už > prieš` would be inference
-- presented as record, and wrong wherever the threshold is not a simple
-- majority (constitutional laws need 3/5). result_type therefore stays NULL
-- until a source that actually states the outcome is found.

ALTER TABLE votes ADD COLUMN IF NOT EXISTS votes_for          integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS votes_against      integer;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS votes_abstained    integer;
-- balsavo: how many members registered any choice on this vote.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS votes_participated integer;
-- viso: how many members the protocol counted as eligible at that moment.
-- Not the constitutional 141 and not today's active count — a per-vote figure.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS seats_eligible     integer;
-- balsavimo_laikas: the wall-clock moment of the vote. sitting_date only has
-- day precision, so ordering several votes within one sitting needed this.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS voted_at           timestamptz;

COMMENT ON COLUMN votes.votes_for          IS 'LRS BendriBalsavimoRezultatai/@už';
COMMENT ON COLUMN votes.votes_against      IS 'LRS BendriBalsavimoRezultatai/@prieš';
COMMENT ON COLUMN votes.votes_abstained    IS 'LRS BendriBalsavimoRezultatai/@susilaikė';
COMMENT ON COLUMN votes.votes_participated IS 'LRS BendriBalsavimoRezultatai/@balsavo';
COMMENT ON COLUMN votes.seats_eligible     IS 'LRS BendriBalsavimoRezultatai/@viso — per-vote, not the constitutional 141';
COMMENT ON COLUMN votes.voted_at           IS 'LRS BendriBalsavimoRezultatai/@balsavimo_laikas';
COMMENT ON COLUMN votes.result_type        IS 'Always NULL: the LRS source publishes no pass/fail field. Never infer from tallies.';

-- Partial index: the tally-bearing rows are the ones any summary query wants.
CREATE INDEX IF NOT EXISTS idx_votes_tallied
  ON votes (sitting_date DESC)
  WHERE votes_for IS NOT NULL;
