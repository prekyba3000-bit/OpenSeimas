-- Migration 007: rebuild mp_stats_summary with party loyalty + amendments count
-- Context: some environments still have the pre-006 view definition.

CREATE TABLE IF NOT EXISTS mp_amendment_counts (
    mp_id UUID PRIMARY KEY REFERENCES politicians(id) ON DELETE CASCADE,
    amendments_proposed_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DROP MATERIALIZED VIEW IF EXISTS mp_stats_summary;

CREATE MATERIALIZED VIEW mp_stats_summary AS
WITH amendment_counts AS (
    SELECT
        p.id AS mp_id,
        COALESCE(mac.amendments_proposed_count, 0) AS amendments_proposed_count
    FROM politicians p
    LEFT JOIN mp_amendment_counts mac ON mac.mp_id = p.id
),
party_consensus AS (
    SELECT
        mv.vote_id,
        p.current_party,
        CASE
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%' THEN 'SUSILAIKE'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%' THEN 'NEDALYVAVO'
            ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
        END AS vote_choice_norm,
        COUNT(*) AS choice_count,
        SUM(COUNT(*)) OVER (
            PARTITION BY mv.vote_id, p.current_party
        ) AS party_total_count,
        ROW_NUMBER() OVER (
            PARTITION BY mv.vote_id, p.current_party
            ORDER BY COUNT(*) DESC, CASE
                WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
                WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
                WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%' THEN 'SUSILAIKE'
                WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%' THEN 'NEDALYVAVO'
                ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
            END ASC
        ) AS row_num
    FROM mp_votes mv
    JOIN politicians p ON mv.politician_id = p.id
    WHERE CASE
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%' THEN 'SUSILAIKE'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%' THEN 'NEDALYVAVO'
            ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
        END != 'NEDALYVAVO'
      AND COALESCE(p.current_party, '') NOT IN ('', 'Unknown')
    GROUP BY mv.vote_id, p.current_party, vote_choice_norm
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
            WHERE (
                CASE
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%' THEN 'SUSILAIKE'
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%' THEN 'NEDALYVAVO'
                    ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
                END
            ) = dc.party_majority_choice
        ) AS aligned_votes
    FROM mp_votes mv
    JOIN politicians p ON mv.politician_id = p.id
    JOIN dominant_choice dc
      ON mv.vote_id = dc.vote_id
     AND p.current_party = dc.current_party
    WHERE CASE
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%' THEN 'SUSILAIKE'
            WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%' THEN 'NEDALYVAVO'
            ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
        END != 'NEDALYVAVO'
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
    COUNT(mv.vote_id) AS total_votes_registered,
    COUNT(mv.vote_id) FILTER (
        WHERE mv.vote_choice != 'Nedalyvavo'
    ) AS total_votes_cast,
    COUNT(DISTINCT v.sitting_date) FILTER (
        WHERE mv.vote_choice != 'Nedalyvavo'
    ) AS days_attended,
    COUNT(DISTINCT v.sitting_date) AS total_sitting_days,
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
        ORDER BY mv.vote_choice
    ) AS most_frequent_vote,
    NOW() AS last_refreshed
FROM politicians p
LEFT JOIN mp_votes mv ON p.id = mv.politician_id
LEFT JOIN votes v ON mv.vote_id = v.seimas_vote_id
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
