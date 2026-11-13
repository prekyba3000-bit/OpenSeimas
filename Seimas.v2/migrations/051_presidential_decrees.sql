-- The President's decree register, as lrp.lt/lt/dekretai lists it.
--
-- One row per listed decree: number, the day lrp.lt lists it under, the title
-- and the link to the signed PDF. `kind` is derived from the title alone by
-- pipeline/ingest_presidential_decrees.classify — a deterministic rule, no
-- judgement — and names the five things the President sends to the Seimas or
-- the Government that „Valdžios žemėlapis" shows:
--
--   veto        a law returned to the Seimas for reconsideration
--   bill        a draft law or resolution the President submits to the Seimas
--   treaty      a treaty submitted for ratification or denunciation
--   nomination  an appointment or dismissal that needs the Seimas
--   cabinet     Prime Minister, ministers, the Government's composition
--   other       everything else (ranks, citizenship, awards, judges, leave)
--
-- `listed_on` is lrp.lt's list date. It is usually, not always, the date in
-- the PDF's file name; the register keeps what the list says.
--
-- Evidence only: the page shows these rows as lists with links. Nothing is
-- scored. Additive; no existing table changes.

CREATE TABLE IF NOT EXISTS presidential_decrees (
    id          SERIAL PRIMARY KEY,
    decree_no   TEXT,                 -- '1K-737'; NULL when lrp.lt links no file
    listed_on   DATE NOT NULL,
    title_lt    TEXT NOT NULL,
    url         TEXT,
    kind        TEXT NOT NULL CHECK (kind IN ('veto', 'bill', 'treaty', 'nomination', 'cabinet', 'other')),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_presidential_decrees_no
    ON presidential_decrees (decree_no) WHERE decree_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_presidential_decrees_unnumbered
    ON presidential_decrees (listed_on, title_lt) WHERE decree_no IS NULL;
CREATE INDEX IF NOT EXISTS ix_presidential_decrees_kind ON presidential_decrees (kind, listed_on DESC);
