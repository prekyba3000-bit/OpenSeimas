-- An eleventh check, from a defect that reached production.
--
-- 2026-08-25: the Seimas sat, votes were ingested, and the day entered every
-- member's attendance denominator. sitting_registrations had nothing for that
-- date because ingest_registrations had not run in 16 days. Attendance v2
-- counts "registered OR voted", so the 25 members who attended without voting
-- were recorded absent, and Bilotaitė's published figure fell from 72.04 to
-- 71.28.
--
-- The ten seeded checks did not catch it. source_freshness did warn that
-- seimas_registrations was stale, every run for a week, and nobody connected a
-- stale feed to a wrong number on a page. This asserts the consequence
-- directly, so the next occurrence names itself.
--
-- Two days of grace: registrations for a sitting legitimately arrive after its
-- votes, and flagging the same afternoon would train everyone to ignore it.

INSERT INTO dq_checks (check_key, description_lt, sql, severity, error_if, warn_if, action) VALUES
('sitting_day_without_registrations',
 'Posėdžio diena, kurioje yra balsavimų, bet nėra registracijų. Tokią dieną nebalsavę nariai klaidingai laikomi nedalyvavusiais.',
 $q$SELECT v.sitting_date::text AS sitting_date,
           count(DISTINCT vt.seimas_vote_id) AS votes_that_day
    FROM (SELECT DISTINCT sitting_date FROM votes WHERE sitting_date IS NOT NULL) v
    JOIN votes vt ON vt.sitting_date = v.sitting_date
    LEFT JOIN sitting_registrations sr ON sr.sitting_date = v.sitting_date
    WHERE v.sitting_date < CURRENT_DATE - INTERVAL '2 days'
      AND sr.reg_id IS NULL
    GROUP BY v.sitting_date
    ORDER BY v.sitting_date DESC$q$,
 -- Blocking on purpose: refreshing mp_attendance_v2 while a sitting day has no
 -- registrations bakes an understated figure into every affected member's
 -- profile. Holding the refresh keeps the last-good values until the gap closes.
 'error', '>0', NULL, 'block_publish')
ON CONFLICT (check_key) DO NOTHING;
