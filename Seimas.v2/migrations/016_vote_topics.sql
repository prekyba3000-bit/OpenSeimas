-- Migration 016: deterministic topic tags for votes and legislation.
--
-- Foundation for the V.4 "Tau" voter-guidance card engine: every vote/bill
-- is tagged with 0..N of 8 everyday-life topic categories by the
-- pipeline/tag_topics.py keyword matcher. One row per (entity, topic).
--
-- matched_terms records which keyword stems fired (explainability /
-- provenance for the "why this matters to you" cards).
-- title_hash is md5 of the normalized title at tagging time, so the tagger
-- can detect title changes and re-tag only what actually changed
-- (votes has no updated_at column).

CREATE TABLE IF NOT EXISTS vote_topics (
    vote_id         INTEGER NOT NULL REFERENCES votes(seimas_vote_id) ON DELETE CASCADE,
    topic           TEXT NOT NULL CHECK (topic IN (
                        'bustas', 'pajamos', 'sveikata', 'svietimas',
                        'transportas', 'saugumas', 'aplinka', 'valdymas'
                    )),
    matched_terms   TEXT[] NOT NULL DEFAULT '{}',
    title_hash      TEXT,
    tagged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (vote_id, topic)
);

CREATE INDEX IF NOT EXISTS ix_vote_topics_topic ON vote_topics(topic);

CREATE TABLE IF NOT EXISTS legislation_topics (
    project_id      TEXT NOT NULL REFERENCES legislation(project_id) ON DELETE CASCADE,
    topic           TEXT NOT NULL CHECK (topic IN (
                        'bustas', 'pajamos', 'sveikata', 'svietimas',
                        'transportas', 'saugumas', 'aplinka', 'valdymas'
                    )),
    matched_terms   TEXT[] NOT NULL DEFAULT '{}',
    title_hash      TEXT,
    tagged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, topic)
);

CREATE INDEX IF NOT EXISTS ix_legislation_topics_topic ON legislation_topics(topic);
