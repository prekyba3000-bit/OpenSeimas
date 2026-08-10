-- 016_legislation_bootstrap.sql — repair fresh-DB bootstrap (Phase 0 CI catch)
--
-- The `legislation` table was created manually in the author's database and never
-- committed, so migrations/016_vote_topics.sql (REFERENCES legislation(project_id))
-- failed on any fresh database. Column set matches the only writer,
-- pipeline/ingest_legislation.py (INSERT ... ON CONFLICT (project_id)).
-- Idempotent: on existing production DBs where the table already exists this is a no-op.
-- Filename sorts before 016_vote_topics.sql ('l' < 'v') so fresh bootstrap order is correct.

CREATE TABLE IF NOT EXISTS legislation (
    project_id  TEXT PRIMARY KEY,
    title       TEXT,
    summary     TEXT,
    url         TEXT
);
