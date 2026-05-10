-- Migration 014: mp_leaderboard_metrics materialized view
-- Pre-aggregates everything the leaderboard endpoint needs per MP, so the
-- /api/v2/heroes/leaderboard route can be served from one bulk SELECT instead
-- of the previous N+1 (141 MPs × ~7 queries each => 60s+ p99).
-- Refresh after vote/speech/committee ingestion finishes.

DROP MATERIALIZED VIEW IF EXISTS mp_leaderboard_metrics;

CREATE MATERIALIZED VIEW mp_leaderboard_metrics AS
WITH vote_rollup AS (
    SELECT
        mv.politician_id AS mp_id,
        COUNT(mv.vote_id) FILTER (
            WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
        ) AS votes_participated,
        COUNT(mv.vote_id) FILTER (
            WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz')
              AND COALESCE(v.result_type, '') = 'Priimta'
        ) AS votes_for_passed,
        COUNT(DISTINCT v.sitting_date) FILTER (
            WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
        ) AS active_vote_days,
        COUNT(mv.vote_id) FILTER (
            WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
              AND COALESCE(v.vote_type, '') ILIKE '%pateik%'
        ) AS amendment_votes,
        MIN(v.sitting_date) FILTER (
            WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
        ) AS first_vote_date
    FROM mp_votes mv
    LEFT JOIN votes v ON mv.vote_id = v.seimas_vote_id
    GROUP BY mv.politician_id
),
speech_rollup AS (
    SELECT mp_id,
           (COUNT(*) FILTER (WHERE speech_type='floor_speech') * 2
          + COUNT(*) FILTER (WHERE speech_type='press_release')) AS speeches_given
    FROM speeches
    GROUP BY mp_id
),
committee_rollup AS (
    SELECT
        mp_id,
        COUNT(*) FILTER (
            WHERE LOWER(COALESCE(role, '')) IN ('chair', 'deputy chair')
        ) AS committee_leadership_roles
    FROM committee_memberships
    GROUP BY mp_id
)
SELECT
    p.id AS mp_id,
    p.display_name,
    COALESCE(NULLIF(p.current_party, ''), 'Unknown') AS current_party,
    p.photo_url,
    p.is_active,
    p.seimas_mp_id,
    p.last_synced_at,
    COALESCE(p.bills_authored_count, 0) AS bills_authored_count,
    COALESCE(s.total_votes_cast, 0) AS total_votes_cast,
    COALESCE(s.attendance_percentage, 0) AS attendance_percentage,
    COALESCE(s.amendments_proposed_count, 0) AS amendments_proposed_count,
    COALESCE(s.party_loyalty, 0) AS party_loyalty,
    COALESCE(sr.speeches_given, 0) AS speeches_given,
    COALESCE(cr.committee_leadership_roles, 0) AS committee_leadership_roles,
    COALESCE(vr.votes_participated, 0) AS votes_participated,
    COALESCE(vr.votes_for_passed, 0) AS votes_for_passed,
    COALESCE(vr.active_vote_days, 0) AS active_vote_days,
    COALESCE(vr.amendment_votes, 0) AS amendment_votes,
    vr.first_vote_date,
    -- mp_vote_geometry is the only forensic table with usable per-MP rows in
    -- current schema; benford_analyses + amendment_profiles tables exist but
    -- are empty, vote_geometry stores per-vote rows (no mp_id).
    COALESCE(mvg.max_deviation_sigma, 0) AS geometry_max_deviation_sigma,
    COALESCE(mvg.anomalous_vote_count, 0) AS geometry_anomalous_vote_count,
    (mvg.mp_id IS NOT NULL) AS has_geometry_row,
    NOW() AS last_refreshed
FROM politicians p
LEFT JOIN mp_stats_summary s ON p.id = s.mp_id
LEFT JOIN vote_rollup vr ON p.id = vr.mp_id
LEFT JOIN speech_rollup sr ON p.id = sr.mp_id
LEFT JOIN committee_rollup cr ON p.id = cr.mp_id
LEFT JOIN mp_vote_geometry mvg ON p.id = mvg.mp_id;

-- Unique index enables REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX idx_mp_leaderboard_metrics_id ON mp_leaderboard_metrics(mp_id);
CREATE INDEX idx_mp_leaderboard_metrics_active ON mp_leaderboard_metrics(is_active) WHERE is_active = TRUE;
