-- The project a vote is about, stored as what it is.
--
-- `votes.project_id` was filled by taking the agenda item's `registracijos_nr`
-- attribute, and when that was absent, the first „Nr." in the title. For an
-- amendment the first „Nr." is the law BEING AMENDED, not the project doing the
-- amending — the project's own number sits later in the same title, in brackets:
--
--   Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ... projektas (Nr. XVP-247)
--                                ^^^^^^^^^ stored                        ^^^^^^^^ the project
--
-- Measured 2026-09-05: 3,464 of 4,392 votes carrying a project_id held the
-- wrong entity, and 331 stored values each stood for several distinct projects.
-- `I-399` — the Seimas Statute, cited by every amendment to it — stood for 44.
--
-- ADDITIVE ONLY. The existing column is not rewritten: charter §4.5 puts
-- changing historical ingested records on the stop list, and this is exactly
-- that. The old column keeps whatever it holds, gains a comment saying what
-- that really is, and the new columns carry the fact it destroyed. Same shape
-- as migration 039, which split faction from nominating party rather than
-- correcting one into the other.
--
-- Two columns, not one, because a registration and a project are different
-- facts. `XVP-851(2)` is the second revision of project `XVP-851`, and the
-- revisions are not cosmetic: 123 base projects carry more than one distinct
-- title because a later revision amends a different set of articles. A surface
-- asking "which document did they vote on" and one asking "how did this bill
-- progress" need different columns, and collapsing them is the mistake above.

ALTER TABLE votes ADD COLUMN IF NOT EXISTS project_registration_nr TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS project_base_nr TEXT;

COMMENT ON COLUMN votes.project_registration_nr IS
    'Registration number of the legal-act project voted on, including any '
    'revision suffix: XVP-1119(2). NULL when the vote is not about a single '
    'project - a procedural question, or a question-group bundling several. '
    'Populated by pipeline.project_number.resolve().';

COMMENT ON COLUMN votes.project_base_nr IS
    'The project across its revisions: XVP-1119(2) -> XVP-1119. Use this to '
    'group the stages of one bill; use project_registration_nr to identify the '
    'document actually voted on.';

COMMENT ON COLUMN votes.project_id IS
    'LEGACY AND WRONG FOR MOST ROWS. Holds the first "Nr." found in the agenda '
    'title, which for an amendment is the law being amended, not the project. '
    '3,464 of 4,392 populated rows held the wrong entity as of 2026-09-05, and '
    '331 distinct values each stood for several projects. Kept unrewritten '
    'because changing historical ingested records is a charter stop condition. '
    'Read project_registration_nr or project_base_nr instead.';

CREATE INDEX IF NOT EXISTS idx_votes_project_registration
    ON votes (project_registration_nr);
CREATE INDEX IF NOT EXISTS idx_votes_project_base
    ON votes (project_base_nr);

-- `legislation` is keyed by registration number, so a revision is its own row.
-- It was created with project_id as the primary key and no other constraint;
-- nothing else about the table changes.
COMMENT ON COLUMN legislation.project_id IS
    'Project registration number including any revision suffix, matching '
    'votes.project_registration_nr. Not votes.project_id, which holds a '
    'different and mostly wrong identifier.';

COMMENT ON COLUMN legislation.title IS
    'The project title as LRS publishes it on the sitting agenda, with the '
    'trailing "(Nr. ...)" removed and internal whitespace collapsed. Where the '
    'source spells one document differently across stages - 13 of 1,683 - the '
    'most recent spelling is kept.';

COMMENT ON COLUMN legislation.summary IS
    'Always NULL today. No source this project can reach publishes a summary, '
    'and generating one would be inventing content about legislation.';

COMMENT ON COLUMN legislation.url IS
    'Always NULL today. The e-seimas legal-act-project endpoint returns 404 on '
    'every variant tried on 2026-09-05, so there is no link to give that we '
    'have verified resolves.';
