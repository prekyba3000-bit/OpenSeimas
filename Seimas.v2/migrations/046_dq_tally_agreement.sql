-- A thirteenth check: the two ways this project counts the same vote must
-- agree.
--
-- Every published tally exists twice. `votes.votes_for/against/abstained` are
-- the protocol's own summary, written by LRS. The vote page counts `mp_votes`
-- rows instead, and the P5 summaries read the protocol columns. Two paths,
-- one published fact — the exact shape that produced the list/profile
-- disagreement fixed on 2026-09-07, where a member's `experience` read 12.35
-- on one surface and 61.98 on another because two code paths normalised
-- against different maxima and nothing asserted they matched.
--
-- The P5 recon (2026-09-02) verified the agreement held on all 3,630 tallied
-- votes and filed a permanent check rather than building one. Re-verified
-- 2026-09-08: still 3,630 of 3,630, and zero votes claim an empty tally while
-- holding member choices. This is that check.
--
-- `block_publish`, not `warn`: a disagreement here means one of two numbers a
-- reader can see is wrong, and refreshing the views would carry it onto a
-- profile. Holding is the cheaper failure.
--
-- The predicate is migration 015's, the one positive definition of a recorded
-- choice — už / prieš / susilaikė, case- and accent-tolerant. Using anything
-- looser here would compare the protocol against a different question.

INSERT INTO dq_checks (check_key, description_lt, sql, severity, error_if, warn_if, action)
SELECT
 'vote_tally_agreement',
 'Protokolo suvestinė ir atskirų narių balsai turi sutapti. Tą patį balsavimą portalas skaičiuoja dviem keliais — jei jie nesutampa, bent vienas skaičius, kurį mato skaitytojas, yra klaidingas.',
 $q$WITH per_member AS (
      SELECT mv.vote_id,
             count(*) FILTER (WHERE lower(coalesce(mv.vote_choice,'')) IN ('už','uz'))       AS f,
             count(*) FILTER (WHERE lower(coalesce(mv.vote_choice,'')) IN ('prieš','pries')) AS a,
             count(*) FILTER (WHERE lower(coalesce(mv.vote_choice,'')) ~ '^susilaik')        AS s,
             count(*) FILTER (WHERE coalesce(mv.vote_choice,'') <> '')                       AS recorded
      FROM mp_votes mv
      GROUP BY mv.vote_id
  )
  SELECT v.seimas_vote_id::text AS vote_id,
         v.sitting_date::text   AS sitting_date,
         'protokolas'           AS problem,
         v.votes_for::text      AS protocol_for,
         p.f::text              AS member_for,
         v.votes_against::text  AS protocol_against,
         p.a::text              AS member_against,
         v.votes_abstained::text AS protocol_abstained,
         p.s::text              AS member_abstained
  FROM votes v
  JOIN per_member p ON p.vote_id = v.seimas_vote_id
  WHERE v.votes_participated > 0
    AND (v.votes_for <> p.f OR v.votes_against <> p.a OR v.votes_abstained <> p.s)

  UNION ALL

  -- The other direction: a vote the protocol reports as having no results at
  -- all, while member rows carry choices. 1,656 votes publish nothing, and
  -- `votes_participated = 0` is what every surface uses to say so. If that
  -- predicate ever stops being clean, those surfaces start hiding real data.
  SELECT v.seimas_vote_id::text, v.sitting_date::text,
         'nepaskelbta, bet yra balsų', '0', p.recorded::text, NULL, NULL, NULL, NULL
  FROM votes v
  JOIN per_member p ON p.vote_id = v.seimas_vote_id
  WHERE v.votes_participated = 0 AND p.recorded > 0$q$,
 'error', '>0', NULL, 'block_publish'
WHERE NOT EXISTS (SELECT 1 FROM dq_checks WHERE check_key = 'vote_tally_agreement');
