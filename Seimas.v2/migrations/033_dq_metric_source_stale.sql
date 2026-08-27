-- A twelfth check, from a failure of attention rather than of code.
--
-- source_freshness correctly reported seimas_registrations stale on every run
-- for a week. Its action is 'record', so it wrote a row and changed nothing,
-- and I read it twice, in writing, as cosmetic. Then a sitting day arrived with
-- no registration data behind it. The check was right and inert.
--
-- This one covers only the feeds that back a published dial, and it blocks.
-- A stale feed behind a number on someone's profile is not a log line.
--
--   seimas_registrations   -> attendance
--   seimas_floor_speeches  -> visibility
--   seimas_authored_bills  -> legislative_activity
--
-- The list is a declaration of which feeds carry published numbers, not a
-- remembered value that drifts: it changes only when a metric gains or loses a
-- source. A feed that has never recorded a fetch returns NULL here and is
-- reported too, so a rename or a quietly dropped ingest surfaces as a failure
-- rather than as silence — the case source_freshness cannot see, because a
-- source that never ran has no row to be stale.

INSERT INTO dq_checks (check_key, description_lt, sql, severity, error_if, warn_if, action) VALUES
('metric_backing_source_stale',
 'Šaltinis, kuriuo remiasi skelbiamas rodiklis, nebuvo atnaujintas per 50 valandų arba nebuvo paleistas niekada.',
 $q$WITH expected(source_name, feeds) AS (
      VALUES ('seimas_registrations',  'lankomumas'),
             ('seimas_floor_speeches', 'viešumas'),
             ('seimas_authored_bills', 'teisėkūros aktyvumas')
    )
    SELECT e.source_name,
           e.feeds,
           max(f.finished_at)::text AS last_success,
           CASE WHEN max(f.finished_at) IS NULL THEN 'never run'
                ELSE round(EXTRACT(EPOCH FROM (now() - max(f.finished_at))) / 3600.0, 1)::text || 'h'
           END AS age
    FROM expected e
    LEFT JOIN source_fetches f
      ON f.source_name = e.source_name AND f.status = 'ok'
    GROUP BY e.source_name, e.feeds
    HAVING max(f.finished_at) IS NULL
        OR now() - max(f.finished_at) > interval '50 hours'$q$,
 'error', '>0', NULL, 'block_publish')
ON CONFLICT (check_key) DO NOTHING;
