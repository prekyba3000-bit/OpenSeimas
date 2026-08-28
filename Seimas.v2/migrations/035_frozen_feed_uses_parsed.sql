-- frozen_feed asked the wrong number.
--
-- It read rows_affected, which for an idempotent upsert ingest is the count of
-- *new* rows — 0 on every healthy run once the backlog is in. Bounding the
-- floor-speech ingest to unread sittings made that the normal case, and the
-- check immediately blocked the publish on a feed that was working perfectly.
--
-- What answers "is this feed still alive" is what the source offered, not what
-- survived deduplication. parsed_count is that number where an ingest records
-- it; rows_affected remains the fallback for ingests that do not.
--
-- The check keeps its purpose: three consecutive runs where the source handed
-- us nothing is still a dead feed.

UPDATE dq_checks
SET sql = $q$WITH ranked AS (
      SELECT source_name,
             COALESCE(parsed_count, rows_affected) AS offered,
             row_number() OVER (PARTITION BY source_name ORDER BY finished_at DESC) AS rn
      FROM source_fetches
      WHERE status = 'ok'
        AND COALESCE(parsed_count, rows_affected) IS NOT NULL
    )
    SELECT source_name, count(*) AS zero_runs
    FROM ranked WHERE rn <= 3 AND offered = 0
    GROUP BY source_name HAVING count(*) = 3$q$,
    description_lt = 'Šaltinis, kuris tris kartus iš eilės nepateikė nė vieno įrašo, greičiausiai nutrūkęs. Vertinama, kiek įrašų pateikė šaltinis, o ne kiek jų buvo naujų.'
WHERE check_key = 'frozen_feed';
