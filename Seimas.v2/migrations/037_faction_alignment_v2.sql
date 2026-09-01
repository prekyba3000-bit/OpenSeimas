-- faction_alignment, rebuilt so it can be published.
--
-- The view has never been refreshed: it was materialised before mp_votes was
-- populated and has held 0 rows since migration 004. Refreshing it as written
-- would have published fabricated numbers, so the defects are fixed first.
--
-- 1. A faction position from mode() over one person is that person's own vote.
--    36 of 140 members sit in a `current_party` group with fewer than ten
--    members, including „Išsikėlė pats" (1) and „Politinė partija „Nemuno
--    Aušra"" (1). Their alignment would have computed to 100% against
--    themselves. A position is now defined only where at least
--    MIN_FACTION_VOTERS members of that group cast a countable vote on that
--    same vote; below it the vote is not comparable and is excluded, rather
--    than being scored against a group of one.
--
-- 2. Several of those small groups are spelling variants of large factions —
--    „Lietuvos socialdemokratų partija" (5) beside „Lietuvos socialdemokratų
--    partijos frakcija" (48). Deliberately NOT merged here: party and faction
--    membership are different facts and guessing which is which from a string
--    is how a data-quality problem becomes a published claim. The size floor
--    means a variant too small to define a position yields no percentage,
--    which is the honest outcome until the underlying field is cleaned.
--
-- 3. The old shape was one row per member per sitting day, and the endpoint
--    averaged those daily percentages unweighted — a day with one vote counted
--    as much as a day with forty. Worst observed gap between that mean and the
--    true ratio: 68.63 against 72.70. Now one row per member, carrying the
--    numerator and denominator so any consumer computes the same figure.
--
-- 4. `current_party` is today's party applied to every historic vote. Not
--    fixable here — the feed carries no per-vote faction — so the column is
--    named for what it is and the coverage note says so on the surface.

DROP MATERIALIZED VIEW IF EXISTS faction_alignment;

CREATE MATERIALIZED VIEW faction_alignment AS
WITH countable AS (
    SELECT mv.politician_id,
           mv.vote_id,
           p.current_party,
           lower(mv.vote_choice) AS choice
    FROM mp_votes mv
    JOIN politicians p ON p.id = mv.politician_id
    WHERE mv.vote_choice IS NOT NULL
      AND lower(mv.vote_choice) IN ('už', 'uz', 'prieš', 'pries', 'susilaikė', 'susilaike')
      AND p.current_party IS NOT NULL
),
faction_vote AS (
    SELECT vote_id,
           current_party,
           count(*) AS faction_voters,
           mode() WITHIN GROUP (ORDER BY choice) AS position
    FROM countable
    GROUP BY vote_id, current_party
),
comparable AS (
    -- Only where the group is large enough for "the faction's position" to
    -- mean something. Ten is the same floor the context-band helper uses.
    SELECT c.politician_id, c.vote_id, c.choice, f.position
    FROM countable c
    JOIN faction_vote f
      ON f.vote_id = c.vote_id AND f.current_party = c.current_party
    WHERE f.faction_voters >= 10
)
-- Every active member appears, including those whose faction is too small for
-- a position to exist. Dropping them would make the surface silently shorter
-- than the chamber, and a reader cannot ask about a row that is not there.
SELECT p.id AS mp_id,
       p.display_name,
       p.current_party,
       COALESCE(count(cm.vote_id), 0) AS comparable_votes,
       COALESCE(count(*) FILTER (WHERE cm.choice = cm.position), 0) AS aligned_votes,
       -- NULL, never 0: no measurement is not disagreement.
       CASE WHEN count(cm.vote_id) >= 20
            THEN round(count(*) FILTER (WHERE cm.choice = cm.position)::numeric
                       / count(cm.vote_id) * 100, 2)
       END AS alignment_pct,
       -- Why a percentage is absent, so the surface can say it rather than
       -- leaving a blank the reader has to interpret.
       CASE
         WHEN count(cm.vote_id) >= 20 THEN NULL
         WHEN p.current_party IS NULL THEN 'no_faction'
         WHEN count(cm.vote_id) = 0 THEN 'faction_too_small'
         ELSE 'too_few_comparable_votes'
       END AS suppression_reason
FROM politicians p
LEFT JOIN comparable cm ON cm.politician_id = p.id
WHERE p.is_active
GROUP BY p.id, p.display_name, p.current_party
WITH NO DATA;
-- Deliberately unpopulated. CREATE MATERIALIZED VIEW ... AS fills the view
-- immediately, and the standing instruction is that no alignment figure is
-- published until the surface shows the votes behind it. The refresh is a
-- separate, later step; until it runs, this view answers nothing.

CREATE UNIQUE INDEX IF NOT EXISTS idx_faction_alignment ON faction_alignment (mp_id);
