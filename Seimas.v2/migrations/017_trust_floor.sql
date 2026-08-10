-- 017_trust_floor.sql — V.4 trust infrastructure (Phase 1)
-- Provenance, corrections, methodology versioning, summary edit history, right-of-reply.
-- Idempotent: safe to run via apply_migrations.py (tracked in schema_migrations).

-- 1. Provenance: one row per ingest/pipeline run; public numbers trace back here.
CREATE TABLE IF NOT EXISTS source_fetches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name TEXT NOT NULL,              -- 'seimas_votes', 'seimas_registrations', 'vrk_results', ...
    source_url TEXT,
    job_id TEXT,                            -- pipeline cli run identifier
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'error')),
    rows_affected INTEGER,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_source_fetches_name ON source_fetches (source_name, started_at DESC);

-- 2. Corrections: public report-an-error workflow (72h first-response SLA per V.4 plan §7).
-- reporter_email is NEVER exposed by public endpoints.
CREATE TABLE IF NOT EXISTS corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('mp', 'vote', 'bill', 'topic_tag', 'summary', 'metric', 'other')),
    entity_id TEXT NOT NULL,                -- UUID / seimas_vote_id / topic key / URL fragment
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
    reporter_email TEXT CHECK (reporter_email IS NULL OR char_length(reporter_email) <= 320),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'resolved')),
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON corrections (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corrections_entity ON corrections (entity_type, entity_id);

-- 3. Methodology versioning: every metric carries a version; changes announced in advance.
CREATE TABLE IF NOT EXISTS methodology_versions (
    id SERIAL PRIMARY KEY,
    metric_key TEXT NOT NULL,               -- 'attendance', 'tau_alignment', 'vote_similarity', ...
    version INTEGER NOT NULL,
    title_lt TEXT NOT NULL,
    body_lt TEXT NOT NULL,                  -- markdown (Lithuanian)
    announced_at TIMESTAMPTZ,               -- when the change was pre-announced (>=14 days before effective_from per plan §7)
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (metric_key, version)
);

-- 4. Summary edit history: full public revision trail for every plain-language summary
-- (model: TheyVoteForYou division edit history).
CREATE TABLE IF NOT EXISTS summary_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('vote', 'bill', 'mp', 'topic')),
    entity_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    body_lt TEXT NOT NULL,
    editor TEXT NOT NULL,                   -- human name or 'pipeline:tagger v1' / 'llm:simplify+approved:X'
    note TEXT,                              -- why this revision exists
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_type, entity_id, revision)
);
CREATE INDEX IF NOT EXISTS idx_summary_revisions_entity ON summary_revisions (entity_type, entity_id, revision DESC);

-- 5. Right of reply: MP responses displayed next to contested content.
CREATE TABLE IF NOT EXISTS mp_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES politicians(id),
    subject_type TEXT NOT NULL CHECK (subject_type IN ('profile', 'metric', 'summary', 'recommendation')),
    subject_ref TEXT,                       -- e.g. metric_key or summary entity_id
    body_lt TEXT NOT NULL CHECK (char_length(body_lt) BETWEEN 1 AND 8000),
    verified BOOLEAN NOT NULL DEFAULT FALSE, -- identity confirmed by maintainer; public endpoints show verified only
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mp_replies_mp ON mp_replies (politician_id, created_at DESC);

-- 6. Tau (Phase 4) deterministic recommendation output + feedback loop.
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_version TEXT NOT NULL,           -- 'tau-rules-v1' — deterministic; no LLM-decided content
    subject_type TEXT NOT NULL CHECK (subject_type IN ('bill', 'vote', 'topic')),
    subject_id TEXT NOT NULL,
    priorities_hash TEXT NOT NULL,          -- hash of the (anonymized) priority vector — enables replay/audit without storing profiles
    tier TEXT NOT NULL CHECK (tier IN ('inform', 'align', 'consider')),
    reasons JSONB NOT NULL,                 -- [{evidence_id, text_lt}] — exactly 3 per V.4 plan
    confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    methodology_version INTEGER REFERENCES methodology_versions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
    signal TEXT NOT NULL CHECK (signal IN ('useful', 'confusing', 'distrust')),
    comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_rec ON recommendation_feedback (recommendation_id);
