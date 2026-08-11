-- A percentage over one or two days is not a percentage.
--
-- Migration 019 measured attendance over each member's mandate window, which is
-- correct — but it exposed members whose mandate covers almost no sitting days.
-- Four members elected in 2024 (Blinkevičiūtė, Landsbergis, Sinkevičius,
-- Veryga) hold a mandate of 2024-11-14 to 2024-11-14: they took the seat and
-- gave it up the same day to hold other office. Over their single eligible day
-- they show 0% attendance, which reads as "never turns up" rather than "never
-- served" — the same class of misleading number this whole series is removing.
--
-- Attendance is therefore NULL below MIN_ELIGIBLE_DAYS, and the surfaces render
-- their "no data" state rather than a figure. Members with a short but real
-- tenure keep their number alongside the raw counts (Mažylis: 5 of 5 days), so
-- a reader can see exactly how much service the percentage summarises.

DROP MATERIALIZED VIEW IF EXISTS mp_attendance_v2;

CREATE MATERIALIZED VIEW mp_attendance_v2 AS
WITH sitting_days AS (
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
    SELECT p.id AS mp_id, d.sitting_date
    FROM politicians p
    CROSS JOIN sitting_days d
    WHERE (p.mandate_start_date IS NULL OR d.sitting_date >= p.mandate_start_date)
      AND (p.mandate_end_date IS NULL OR d.sitting_date <= p.mandate_end_date)
),
counted AS (
    SELECT
        e.mp_id,
        COUNT(DISTINCT e.sitting_date) AS eligible_days,
        COUNT(DISTINCT pr.sitting_date) AS days_present
    FROM eligible e
    LEFT JOIN present pr ON pr.mp_id = e.mp_id AND pr.sitting_date = e.sitting_date
    GROUP BY e.mp_id
)
SELECT
    mp_id,
    eligible_days,
    days_present,
    CASE
        WHEN eligible_days >= 3
        THEN ROUND(100.0 * days_present / eligible_days, 2)
        ELSE NULL          -- too little service for a percentage to mean anything
    END AS attendance_percentage
FROM counted;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_attendance_v2_mp ON mp_attendance_v2 (mp_id);
