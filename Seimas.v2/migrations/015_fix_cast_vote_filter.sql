-- Migration 015: fix "cast vote" filter in mp_stats_summary and mp_leaderboard_metrics.
--
-- Bug: prior MVs used `vote_choice != 'Nedalyvavo'` to count cast votes, but the
-- upstream LRS XML emits an empty `kaip_balsavo=""` attribute for MPs who were
-- absent at a vote. Those rows get stored with vote_choice='' and *pass* the
-- "!= 'Nedalyvavo'" filter, so every MP showed total_votes_cast = total vote
-- count (3467) and attendance_percentage = 100%.
--
-- Fix: count a row as a cast vote only when vote_choice positively matches one
-- of the cast values (už/prieš/susilaikė, case- and accent-tolerant). Empty,
-- 'Nedalyvavo', and any unknown values count as not-voted.

DROP MATERIALIZED VIEW IF EXISTS mp_leaderboard_metrics;
DROP MATERIALIZED VIEW IF EXISTS mp_stats_summary;

CREATE MATERIALIZED VIEW mp_stats_summary AS
WITH normalized_votes AS (
    SELECT
        mv.vote_id,
        mv.politician_id,
        mv.vote_choice,
        v.sitting_date,
        CASE
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%' THEN 'SUSILAIKE'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%' THEN 'NEDALYVAVO'
            WHEN COALESCE(mv.vote_choice, '') = '' THEN 'EMPTY'
            ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
        END AS vote_choice_norm
    FROM mp_votes mv
    LEFT JOIN votes v ON mv.vote_id = v.seimas_vote_id
),
amendment_counts AS (
    SELECT
        p.id AS mp_id,
        COALESCE(mac.amendments_proposed_count, 0) AS amendments_proposed_count
    FROM politicians p
    LEFT JOIN mp_amendment_counts mac ON mac.mp_id = p.id
),
party_consensus AS (
    SELECT
        nv.vote_id,
        p.current_party,
        nv.vote_choice_norm,
        COUNT(*) AS choice_count,
        SUM(COUNT(*)) OVER (
            PARTITION BY nv.vote_id, p.current_party
        ) AS party_total_count,
        ROW_NUMBER() OVER (
            PARTITION BY nv.vote_id, p.current_party
            ORDER BY COUNT(*) DESC, nv.vote_choice_norm ASC
        ) AS row_num
    FROM normalized_votes nv
    JOIN politicians p ON nv.politician_id = p.id
    WHERE nv.vote_choice_norm IN ('UZ', 'PRIES', 'SUSILAIKE')
      AND COALESCE(p.current_party, '') NOT IN ('', 'Unknown')
    GROUP BY nv.vote_id, p.current_party, nv.vote_choice_norm
),
dominant_choice AS (
    SELECT
        vote_id,
        current_party,
        vote_choice_norm AS party_majority_choice,
        choice_count,
        party_total_count
    FROM party_consensus
    WHERE row_num = 1
),
loyalty_rollup AS (
    SELECT
        p.id AS mp_id,
        COUNT(*) FILTER (
            WHERE dc.party_total_count > 0
              AND (dc.choice_count::numeric / dc.party_total_count) > 0.5
        ) AS total_party_majority_votes,
        COUNT(*) FILTER (
            WHERE nv.vote_choice_norm = dc.party_majority_choice
        ) AS aligned_votes
    FROM normalized_votes nv
    JOIN politicians p ON nv.politician_id = p.id
    JOIN dominant_choice dc
      ON nv.vote_id = dc.vote_id
     AND p.current_party = dc.current_party
    WHERE nv.vote_choice_norm IN ('UZ', 'PRIES', 'SUSILAIKE')
      AND dc.party_total_count > 0
      AND (dc.choice_count::numeric / dc.party_total_count) > 0.5
    GROUP BY p.id
)
SELECT
    p.id AS mp_id,
    p.display_name,
    p.current_party,
    p.photo_url,
    p.seimas_mp_id,
    COUNT(nv.vote_id) AS total_votes_registered,
    COUNT(nv.vote_id) FILTER (
        WHERE nv.vote_choice_norm IN ('UZ', 'PRIES', 'SUSILAIKE')
    ) AS total_votes_cast,
    COUNT(DISTINCT nv.sitting_date) FILTER (
        WHERE nv.vote_choice_norm IN ('UZ', 'PRIES', 'SUSILAIKE')
    ) AS days_attended,
    COUNT(DISTINCT nv.sitting_date) AS total_sitting_days,
    CASE
        WHEN COUNT(DISTINCT nv.sitting_date) > 0 THEN ROUND(
            (
                COUNT(DISTINCT nv.sitting_date) FILTER (
                    WHERE nv.vote_choice_norm IN ('UZ', 'PRIES', 'SUSILAIKE')
                )::numeric / COUNT(DISTINCT nv.sitting_date) * 100
            ),
            2
        )
        ELSE 0
    END AS attendance_percentage,
    COALESCE(
        CASE
            WHEN lr.total_party_majority_votes > 0 THEN ROUND(
                (lr.aligned_votes::numeric / lr.total_party_majority_votes) * 100,
                2
            )
            ELSE 0
        END,
        0
    ) AS party_loyalty,
    COALESCE(ac.amendments_proposed_count, 0) AS amendments_proposed_count,
    MODE() WITHIN GROUP (
        ORDER BY nv.vote_choice
    ) FILTER (WHERE nv.vote_choice_norm IN ('UZ', 'PRIES', 'SUSILAIKE')) AS most_frequent_vote,
    NOW() AS last_refreshed
FROM politicians p
LEFT JOIN normalized_votes nv ON p.id = nv.politician_id
LEFT JOIN loyalty_rollup lr ON lr.mp_id = p.id
LEFT JOIN amendment_counts ac ON ac.mp_id = p.id
GROUP BY
    p.id,
    p.display_name,
    p.current_party,
    p.photo_url,
    p.seimas_mp_id,
    lr.total_party_majority_votes,
    lr.aligned_votes,
    ac.amendments_proposed_count;

CREATE UNIQUE INDEX idx_mp_stats_summary_id ON mp_stats_summary(mp_id);

-- Recreate mp_leaderboard_metrics using the same canonical cast-vote filter
-- for the vote/speech/committee rollups; mp_stats_summary now provides correct
-- total_votes_cast, attendance_percentage, party_loyalty.
CREATE MATERIALIZED VIEW mp_leaderboard_metrics AS
WITH vote_rollup AS (
    SELECT
        mv.politician_id AS mp_id,
        COUNT(mv.vote_id) FILTER (
            WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz', 'prieš', 'pries')
               OR LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%'
        ) AS votes_participated,
        COUNT(mv.vote_id) FILTER (
            WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz')
              AND COALESCE(v.result_type, '') = 'Priimta'
        ) AS votes_for_passed,
        COUNT(DISTINCT v.sitting_date) FILTER (
            WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz', 'prieš', 'pries')
               OR LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%'
        ) AS active_vote_days,
        COUNT(mv.vote_id) FILTER (
            WHERE (
                LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz', 'prieš', 'pries')
             OR LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%'
            )
            AND COALESCE(v.vote_type, '') ILIKE '%pateik%'
        ) AS amendment_votes,
        MIN(v.sitting_date) FILTER (
            WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz', 'prieš', 'pries')
               OR LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%'
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

CREATE UNIQUE INDEX idx_mp_leaderboard_metrics_id ON mp_leaderboard_metrics(mp_id);
CREATE INDEX idx_mp_leaderboard_metrics_active ON mp_leaderboard_metrics(is_active) WHERE is_active = TRUE;
