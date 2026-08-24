-- The ten Wave 1 checks.
--
-- Runner contract: the SQL returns violating rows. Zero rows is a pass. If the
-- result carries a `severity` column, the worst row-level value wins; otherwise
-- the check's own severity applies. That extension exists because two of these
-- (freshness, vote-choice domain) are graded per row rather than per check.
--
-- Names confirmed against the live schema on 2026-08-24. Three spec names had
-- no such column; the mapping is in the report.

INSERT INTO dq_checks (check_key, description_lt, sql, severity, error_if, warn_if, action) VALUES

-- 1. The spec calls this asmens_id. There is no such column: asmens_id is the
--    LRS query parameter, and it lands in politicians.seimas_mp_id.
('politicians_asmens_id_unique_not_null',
 'Kiekvienas Seimo narys turi turėti unikalų LRS asmens identifikatorių.',
 $q$SELECT id::text AS politician_id, seimas_mp_id::text AS seimas_mp_id, 'null' AS problem
    FROM politicians WHERE seimas_mp_id IS NULL
    UNION ALL
    SELECT NULL, seimas_mp_id::text, 'duplicate'
    FROM politicians WHERE seimas_mp_id IS NOT NULL
    GROUP BY seimas_mp_id HAVING count(*) > 1$q$,
 'error', '>0', NULL, 'block_publish'),

-- 2. A band, not a constant: 141 seats, and vacancies are normal.
('active_mp_count_in_band',
 'Aktyvių Seimo narių skaičius turi būti 135–141.',
 $q$SELECT count(*) AS active_count, 135 AS min_expected, 141 AS max_expected
    FROM politicians WHERE is_active
    HAVING count(*) < 135 OR count(*) > 141$q$,
 'error', '>0', NULL, 'block_publish'),

('mp_votes_orphan_politicians',
 'Kiekvienas balsas turi priklausyti žinomam Seimo nariui.',
 $q$SELECT mv.id::text AS mp_vote_id, mv.politician_id::text
    FROM mp_votes mv LEFT JOIN politicians p ON p.id = mv.politician_id
    WHERE p.id IS NULL$q$,
 'error', '>0', NULL, 'block_publish'),

('mp_votes_unique_member_per_vote',
 'Vienas narys viename balsavime gali turėti tik vieną įrašą.',
 $q$SELECT politician_id::text, vote_id::text, count(*) AS occurrences
    FROM mp_votes GROUP BY politician_id, vote_id HAVING count(*) > 1$q$,
 'error', '>0', NULL, 'block_publish'),

-- 5. NULL is excluded deliberately. 408,267 of 743,515 rows (54.9%) carry a
--    NULL choice, and that is the known unpublished state for the 1,653 votes
--    LRS records without per-member results — not a domain violation. Treating
--    it as one would quarantine over half the table and call missing data bad
--    data. 'Nedalyvavo' never appears as a stored value; absence is the
--    representation.
('mp_votes_choice_in_domain',
 'Balso reikšmė turi būti „Už", „Prieš" arba „Susilaikė". Tuščia reikšmė reiškia, kad duomenys nepaskelbti, ir tai nėra klaida.',
 $q$WITH bad AS (
      SELECT id, vote_choice FROM mp_votes
      WHERE vote_choice IS NOT NULL
        AND vote_choice NOT IN ('Už', 'Prieš', 'Susilaikė')
    ), total AS (SELECT count(*)::numeric AS n FROM mp_votes WHERE vote_choice IS NOT NULL)
    SELECT b.id::text AS mp_vote_id, b.vote_choice,
           CASE WHEN (SELECT count(*) FROM bad)::numeric / NULLIF((SELECT n FROM total),0)
                     > 0.001 THEN 'warn' ELSE 'warn' END AS severity
    FROM bad b$q$,
 'warn', NULL, '>0', 'record'),

-- 6. The landmine. mp_votes.vote_id is a FK to votes(seimas_vote_id), not
--    votes(id). Joining on votes.id returns every one of the 743,515 rows.
('mp_votes_orphan_votes',
 'Kiekvienas balsas turi priklausyti žinomam balsavimui.',
 $q$SELECT mv.id::text AS mp_vote_id, mv.vote_id::text
    FROM mp_votes mv LEFT JOIN votes v ON v.seimas_vote_id = mv.vote_id
    WHERE v.seimas_vote_id IS NULL$q$,
 'error', '>0', NULL, 'block_publish'),

-- 7. Vacuous while legislation holds 0 rows, and that is the honest place for
--    it: votes.project_id is legitimately non-unique (541 repeats across 5,279
--    votes, because one bill draws several votes), so asserting uniqueness
--    there would manufacture a failure out of correct data.
('legislation_project_id_unique_not_null',
 'Kiekvienas teisės akto projektas turi turėti unikalų registracijos numerį.',
 $q$SELECT project_id, 'null' AS problem FROM legislation WHERE project_id IS NULL
    UNION ALL
    SELECT project_id, 'duplicate' FROM legislation
    WHERE project_id IS NOT NULL GROUP BY project_id HAVING count(*) > 1$q$,
 'error', '>0', NULL, 'block_publish'),

('source_freshness',
 'Kiekvienas šaltinis turi būti atnaujintas per pastarąsias 26 valandas.',
 $q$SELECT source_name,
           round(EXTRACT(EPOCH FROM (now() - max(finished_at))) / 3600.0, 1) AS age_hours,
           CASE WHEN now() - max(finished_at) > interval '50 hours' THEN 'error'
                ELSE 'warn' END AS severity
    FROM source_fetches
    WHERE source_name NOT LIKE 'matview:%'
    GROUP BY source_name
    HAVING now() - max(finished_at) > interval '26 hours'$q$,
 'warn', NULL, '>0', 'record'),

-- 9. NULL is not zero. The matview refreshers record NULL rows_affected
--    because a REFRESH has no row count, so they are excluded rather than
--    read as frozen.
('frozen_feed',
 'Šaltinis, kuris tris kartus iš eilės grąžino 0 įrašų, greičiausiai nutrūkęs.',
 $q$WITH ranked AS (
      SELECT source_name, rows_affected,
             row_number() OVER (PARTITION BY source_name ORDER BY finished_at DESC) AS rn
      FROM source_fetches
      WHERE status = 'ok' AND rows_affected IS NOT NULL
    )
    SELECT source_name, count(*) AS zero_runs
    FROM ranked WHERE rn <= 3 AND rows_affected = 0
    GROUP BY source_name HAVING count(*) = 3$q$,
 'error', '>0', NULL, 'block_publish'),

-- 10. Needs the columns added in migration 027. Rows written before those
--     columns existed carry NULL and are skipped rather than reported as a
--     mismatch — an unmeasured run is unknown, not a delta.
('three_way_reconciliation',
 'Perskaityti, apdoroti ir įrašyti įrašų skaičiai turi sutapti.',
 $q$SELECT id::text AS fetch_id, source_name, parsed_count, rows_affected, inserted_count,
           reconciliation_note
    FROM source_fetches
    WHERE parsed_count IS NOT NULL AND inserted_count IS NOT NULL
      AND (parsed_count <> rows_affected OR rows_affected <> inserted_count)
      AND reconciliation_note IS NULL$q$,
 'error', '>0', NULL, 'block_publish')

ON CONFLICT (check_key) DO NOTHING;
