-- Session boundaries, from LRS rather than from a literal in a React file.
--
-- `views/SessionsView.tsx` grouped votes with a hardcoded five-row array whose
-- current row read `2026-03-10 → dabar` with an end date of 2099-12-31. LRS
-- says session 144 ended 2026-07-14. The array also did not contain session
-- 146 (neeilinė, from 2026-08-25) or 145 (5 eilinė, from 2026-09-10), so from
-- 2026-08-25 every new vote would have been shown to citizens under a spring
-- session that ended in July.
--
-- data_iki is empty in the feed for a session that has not ended. It is stored
-- NULL and must render as unknown — never as a far-future date, which is how
-- the previous version claimed a session was sitting through the summer recess.
CREATE TABLE IF NOT EXISTS sessions (
    seimas_session_id INTEGER PRIMARY KEY,
    term_id           INTEGER NOT NULL,
    number            INTEGER,
    name              TEXT NOT NULL,
    date_from         DATE NOT NULL,
    date_to           DATE,
    last_synced_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_dates ON sessions (date_from, date_to);
