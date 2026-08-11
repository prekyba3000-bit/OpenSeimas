-- Attendance v2: presence evidenced two ways, over the days an MP could
-- actually attend.
--
-- Three defects in v1 (migration 015), all found on 2026-08-12:
--   1. The denominator was per-MP — "sitting days this member appears in
--      mp_votes" — so a member present for 5 of 93 sitting days displayed
--      100% attendance and outranked one who attended 66.
--   2. Presence was inferred only from casting a vote, so a member present
--      through a sitting who abstained from every recorded vote read as absent.
--   3. Sittings decided "bendru sutarimu" record no individual votes at all,
--      making such days an absence for every member.
--
-- v2 counts a member present on a sitting day if they registered OR cast a
-- vote that day, over the sitting days falling inside their mandate. This
-- departs from the master plan's literal wording ("from registration data")
-- because registration alone is a roll call at a single moment: a member who
-- arrives afterwards and then votes all day would read as absent. Presence by
-- either evidence serves the plan's intent — a number that means what a reader
-- takes it to mean.
--
-- Not fixed here, and stated wherever the number appears: the sources do not
-- say *why* someone was absent, so sickness, parental leave and official
-- travel are indistinguishable from choosing not to attend. Annotated, never
-- silently excluded.

ALTER TABLE politicians ADD COLUMN IF NOT EXISTS mandate_start_date DATE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS mandate_end_date DATE;

DROP MATERIALIZED VIEW IF EXISTS mp_attendance_v2;

CREATE MATERIALIZED VIEW mp_attendance_v2 AS
WITH sitting_days AS (
    -- Every day the Seimas actually sat, from either evidence stream.
    SELECT sitting_date FROM sitting_registrations WHERE sitting_date IS NOT NULL
    UNION
    SELECT sitting_date FROM votes WHERE sitting_date IS NOT NULL
),
present_by_registration AS (
    SELECT p.id AS mp_id, s.sitting_date
    FROM politicians p
    JOIN mp_registrations m ON m.seimas_mp_id = p.seimas_mp_id AND m.registered
    JOIN sitting_registrations s ON s.reg_id = m.reg_id
    WHERE s.sitting_date IS NOT NULL
),
present_by_vote AS (
    SELECT mv.politician_id AS mp_id, v.sitting_date
    FROM mp_votes mv
    JOIN votes v ON v.seimas_vote_id = mv.vote_id
    WHERE v.sitting_date IS NOT NULL
      AND (
          LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz', 'prieš', 'pries')
          OR LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%'
      )
),
present AS (
    SELECT mp_id, sitting_date FROM present_by_registration
    UNION
    SELECT mp_id, sitting_date FROM present_by_vote
),
eligible AS (
    -- Sitting days inside each member's mandate. Missing mandate dates fall
    -- back to the full term, which is the pre-existing behaviour.
    SELECT p.id AS mp_id, d.sitting_date
    FROM politicians p
    CROSS JOIN sitting_days d
    WHERE (p.mandate_start_date IS NULL OR d.sitting_date >= p.mandate_start_date)
      AND (p.mandate_end_date IS NULL OR d.sitting_date <= p.mandate_end_date)
)
SELECT
    e.mp_id,
    COUNT(DISTINCT e.sitting_date) AS eligible_days,
    COUNT(DISTINCT pr.sitting_date) AS days_present,
    CASE
        WHEN COUNT(DISTINCT e.sitting_date) > 0
        THEN ROUND(100.0 * COUNT(DISTINCT pr.sitting_date) / COUNT(DISTINCT e.sitting_date), 2)
        ELSE 0
    END AS attendance_percentage
FROM eligible e
LEFT JOIN present pr ON pr.mp_id = e.mp_id AND pr.sitting_date = e.sitting_date
GROUP BY e.mp_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_attendance_v2_mp ON mp_attendance_v2 (mp_id);
