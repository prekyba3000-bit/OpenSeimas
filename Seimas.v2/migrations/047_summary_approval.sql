-- Approval is what stands between a drafted summary and a published one.
--
-- summary_revisions (migration 017) records every revision but has no notion
-- of approved. So "serve the latest revision" would serve whatever was
-- appended last — including a pilot draft written for review, or a future
-- LLM rephrasing nobody has read. Charter P5 is explicit: "no LLM-assisted
-- text to production until approved." This makes approved a real, dated,
-- attributed fact, and the public read path serves only the latest APPROVED
-- revision, never merely the latest.
--
-- A revision with approved_at IS NULL is a draft: stored, versioned, visible
-- in the edit history, and invisible to every public surface. Exactly the
-- shape the corrections log already uses for unreviewed submissions.
--
-- Additive only. Existing rows become drafts (approved_at NULL), which is the
-- safe default: the 0 rows in the table today, and any pilot output written
-- later, publish nothing until a human acts.

ALTER TABLE summary_revisions
    ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by  TEXT;

-- The public lookup is "highest approved revision for this entity". Partial
-- index over approved rows only, since drafts are never the answer.
CREATE INDEX IF NOT EXISTS idx_summary_revisions_approved
    ON summary_revisions (entity_type, entity_id, revision DESC)
    WHERE approved_at IS NOT NULL;
