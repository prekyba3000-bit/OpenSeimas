-- Evaluation ARC-01: the votes behind faction alignment, published with it.
--
-- GET /api/mps/{id}/faction-alignment listed the votes behind a member's figure
-- by recomputing them live from mp_votes, and worked out its own percentage for
-- the card under the dial. The dial reads faction_alignment, which only the
-- gated publish step refreshes. During a data-quality HOLD the card and the dial
-- on one page could disagree, and the list could hold votes the figure did not.
--
-- faction_alignment_votes holds the comparable votes themselves (one row per
-- member per vote: their choice, their faction's position, how many of the
-- faction voted). faction_alignment is now counted from it, so the figure and
-- its list are one snapshot by construction, refreshed in the same publish pass.
--
-- Same computation as migration 037/049, not a new one: on production
-- 2026-11-26 the composed definition and the previous one returned the same 140
-- rows with zero differences either way. No methodology entry for that reason.

CREATE MATERIALIZED VIEW faction_alignment_votes AS
WITH countable AS (
    SELECT mv.politician_id, mv.vote_id, p.current_party,
           lower(mv.vote_choice) AS choice
    FROM mp_votes mv
    JOIN politicians p ON p.id = mv.politician_id
    WHERE mv.vote_choice IS NOT NULL
      AND lower(mv.vote_choice) IN ('už', 'uz', 'prieš', 'pries', 'susilaikė', 'susilaike')
      AND p.current_party IS NOT NULL
),
faction_vote AS (
    SELECT vote_id, current_party,
           count(*) AS faction_voters,
           mode() WITHIN GROUP (ORDER BY choice) AS position
    FROM countable
    GROUP BY vote_id, current_party
)
SELECT c.politician_id AS mp_id,
       c.vote_id,
       c.choice,
       f.position,
       f.faction_voters AS voters,
       (c.choice = f.position) AS agreed
FROM countable c
JOIN faction_vote f ON f.vote_id = c.vote_id AND f.current_party = c.current_party
WHERE f.faction_voters >= 10;

-- Required for REFRESH ... CONCURRENTLY, and the route's lookup key.
CREATE UNIQUE INDEX idx_faction_alignment_votes ON faction_alignment_votes (mp_id, vote_id);

DROP MATERIALIZED VIEW faction_alignment;

CREATE MATERIALIZED VIEW faction_alignment AS
SELECT p.id AS mp_id,
       p.display_name,
       p.current_party,
       count(v.vote_id) AS comparable_votes,
       count(*) FILTER (WHERE v.agreed) AS aligned_votes,
       CASE
           WHEN count(v.vote_id) >= 20
           THEN round(count(*) FILTER (WHERE v.agreed)::numeric / count(v.vote_id)::numeric * 100, 2)
           ELSE NULL::numeric
       END AS alignment_pct,
       CASE
           WHEN count(v.vote_id) >= 20 THEN NULL::text
           WHEN p.current_party IS NULL THEN 'no_faction'::text
           WHEN count(v.vote_id) = 0 THEN 'faction_too_small'::text
           ELSE 'too_few_comparable_votes'::text
       END AS suppression_reason
FROM politicians p
LEFT JOIN faction_alignment_votes v ON v.mp_id = p.id
WHERE p.is_active
GROUP BY p.id, p.display_name, p.current_party;

CREATE UNIQUE INDEX idx_faction_alignment ON faction_alignment (mp_id);
