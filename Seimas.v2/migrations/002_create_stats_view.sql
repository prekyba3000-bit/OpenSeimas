-- Migration: Create Materialized View for MP Stats Aggregation
-- Updated: 2026-02-22
-- FIX: Attendance is now calculated by SITTING DAY, not individual votes.
-- An MP is "present" on a day if they cast at least one non-Nedalyvavo vote.
DROP MATERIALIZED VIEW IF EXISTS mp_stats_summary;
CREATE MATERIALIZED VIEW mp_stats_summary AS
SELECT p.id AS mp_id,
    p.display_name,
    p.current_party,
    p.photo_url,
    p.seimas_mp_id,
    COUNT(mv.vote_id) AS total_votes_registered,
    COUNT(mv.vote_id) FILTER (
        WHERE mv.vote_choice != 'Nedalyvavo'
    ) AS total_votes_cast,
    -- Days where MP had at least one non-Nedalyvavo vote = attended
    COUNT(DISTINCT v.sitting_date) FILTER (
        WHERE mv.vote_choice != 'Nedalyvavo'
    ) AS days_attended,
    -- Total sitting days where MP had any record
    COUNT(DISTINCT v.sitting_date) AS total_sitting_days,
    -- Attendance % by sitting day (not by individual vote)
    CASE
        WHEN COUNT(DISTINCT v.sitting_date) > 0 THEN ROUND(
            (
                COUNT(DISTINCT v.sitting_date) FILTER (
                    WHERE mv.vote_choice != 'Nedalyvavo'
                )::numeric / COUNT(DISTINCT v.sitting_date) * 100
            ),
            2
        )
        ELSE 0
    END AS attendance_percentage,
    MODE() WITHIN GROUP (
        ORDER BY mv.vote_choice
    ) AS most_frequent_vote,
    NOW() as last_refreshed
FROM politicians p
    LEFT JOIN mp_votes mv ON p.id = mv.politician_id
    LEFT JOIN votes v ON mv.vote_id = v.seimas_vote_id
GROUP BY p.id,
    p.display_name,
    p.current_party,
    p.photo_url,
    p.seimas_mp_id;
CREATE UNIQUE INDEX idx_mp_stats_summary_id ON mp_stats_summary(mp_id);
