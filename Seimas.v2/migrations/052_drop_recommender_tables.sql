-- Drop the two tables left by the voter-guide recommender.
--
-- `recommendations` and `recommendation_feedback` were created by migration
-- 017 for a feature that ranked named members against a reader's stances. It
-- broke charter §1.3 and was removed twice; no code reads or writes either
-- table. Both held 0 rows on production when checked on 2026-11-14.
--
-- Destructive (charter STOP §4.5): approved by the human on 2026-11-14.
DROP TABLE IF EXISTS recommendation_feedback;
DROP TABLE IF EXISTS recommendations;
