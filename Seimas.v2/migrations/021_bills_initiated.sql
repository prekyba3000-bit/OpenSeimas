-- Legislative initiative counts, split by how the member participated.
--
-- The source (p2b.ad_sn_inicijuoti_ta_projektai) reports three numbers per
-- member: kiekis_viso, kiekis_individualiai and kiekis_grupėje. The existing
-- `bills_authored_count` column collapses that into one figure whose name
-- claims more than the data supports: for many members every initiative is
-- co-sponsored (Alekna: 20 total, 0 individual), and "authored 20 bills" is a
-- different statement from "was one of the signatories on 20 bills".
--
-- Both numbers are stored so the distinction stays visible and the surfaces can
-- say which one they are showing. bills_authored_count keeps receiving the
-- total, because that is what the existing STR formula reads.

ALTER TABLE politicians ADD COLUMN IF NOT EXISTS bills_initiated_total INTEGER;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS bills_initiated_individually INTEGER;
