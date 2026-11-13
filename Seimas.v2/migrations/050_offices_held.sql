-- Offices held outside the Seimas: the President, the Prime Minister and the
-- ministers of the three Governments of the 2024–2028 Seimas term.
--
-- Design note and verification: docs/reviews/2026-11-13-valdzios-zemelapis.md
--
-- Every row was read from a signed presidential decree (lrp.lt/lt/dekretai)
-- and cross-checked against lrv.lt on 2026-11-13. Names are spelled as the
-- decree spells them. `from_date` is filled only where a source states a date
-- for that person; NULL means "from the start of that Government", which the
-- governments row dates.
--
-- `mp_seimas_id` links a minister to a Seimas member ONLY where the minister's
-- official CV on the ministry's site says they are a member; the CV is in
-- `mp_link_source_url`. A NULL link is "not confirmed", never "not a member".
-- Seven further exact-name matches are deliberately left unlinked (see note).
--
-- Nothing here is a metric. No counts, scores or comparisons of people.

CREATE TABLE IF NOT EXISTS ministries (
    key         TEXT PRIMARY KEY,
    name_lt     TEXT NOT NULL,
    url         TEXT NOT NULL,
    sort_order  INT  NOT NULL
);

CREATE TABLE IF NOT EXISTS governments (
    number            INT PRIMARY KEY,
    numeral           TEXT NOT NULL,
    mandate_from      DATE,          -- Seimas approved the programme
    mandate_basis_lt  TEXT,
    started_work_on   DATE,          -- only where the source words it this way
    resigned_on       DATE,
    resign_basis_lt   TEXT,
    composition_basis_lt TEXT NOT NULL,
    composition_url   TEXT NOT NULL,
    source_url        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offices_held (
    id                  SERIAL PRIMARY KEY,
    office_key          TEXT NOT NULL CHECK (office_key IN ('president', 'prime_minister', 'minister')),
    government_number   INT REFERENCES governments(number),
    ministry_key        TEXT REFERENCES ministries(key),
    seq                 INT NOT NULL DEFAULT 1,   -- 2 = replaced the first holder mid-term
    person_name         TEXT NOT NULL,
    title_lt            TEXT NOT NULL,
    from_date           DATE,
    basis_lt            TEXT,
    basis_url           TEXT,
    mp_seimas_id        INT,
    mp_link_source_url  TEXT,
    source_url          TEXT NOT NULL,
    CHECK ((office_key = 'minister') = (ministry_key IS NOT NULL)),
    CHECK ((office_key = 'president') = (government_number IS NULL)),
    CHECK ((mp_seimas_id IS NULL) = (mp_link_source_url IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_offices_held_slot
    ON offices_held (office_key, COALESCE(government_number, 0), COALESCE(ministry_key, ''), seq);

INSERT INTO ministries (key, name_lt, url, sort_order) VALUES
    ('aplinka',     'Aplinkos ministerija',                      'https://am.lrv.lt/lt/',     1),
    ('ekonomika',   'Ekonomikos ir inovacijų ministerija',       'https://eimin.lrv.lt/lt/',  2),
    ('energetika',  'Energetikos ministerija',                   'https://enmin.lrv.lt/lt/',  3),
    ('finansai',    'Finansų ministerija',                       'https://finmin.lrv.lt/lt/', 4),
    ('gynyba',      'Krašto apsaugos ministerija',               'https://kam.lt/',           5),
    ('kultura',     'Kultūros ministerija',                      'https://lrkm.lrv.lt/',      6),
    ('socialine',   'Socialinės apsaugos ir darbo ministerija',  'https://socmin.lrv.lt/lt/', 7),
    ('susisiekimas','Susisiekimo ministerija',                   'https://sumin.lrv.lt/lt/',  8),
    ('sveikata',    'Sveikatos apsaugos ministerija',            'https://sam.lrv.lt/lt/',    9),
    ('svietimas',   'Švietimo, mokslo ir sporto ministerija',    'https://smsm.lrv.lt/lt/',  10),
    ('teisingumas', 'Teisingumo ministerija',                    'https://tm.lrv.lt/lt/',    11),
    ('uzsienis',    'Užsienio reikalų ministerija',              'https://www.urm.lt/',      12),
    ('vidus',       'Vidaus reikalų ministerija',                'https://vrm.lrv.lt/lt/',   13),
    ('zemes_ukis',  'Žemės ūkio ministerija',                    'https://zum.lrv.lt/',      14)
ON CONFLICT (key) DO NOTHING;

INSERT INTO governments (number, numeral, mandate_from, mandate_basis_lt, started_work_on,
                         resigned_on, resign_basis_lt, composition_basis_lt, composition_url, source_url) VALUES
    (19, 'XIX', '2024-12-12', 'Seimo nutarimas Nr. XV-54', NULL,
     '2025-08-04', 'Respublikos Prezidento dekretas Nr. 1K-426',
     'Respublikos Prezidento 2024-12-04 dekretas Nr. 1K-173, pakeistas 2024-12-11 dekretu Nr. 1K-178',
     'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf',
     'https://lrv.lt/lt/apie-vyriausybe/ankstesnes-vyriausybes/'),
    (20, 'XX', '2025-09-25', 'Seimo nutarimas Nr. XV-439', NULL,
     '2026-06-23', 'Respublikos Prezidento dekretas Nr. 1K-728',
     'Respublikos Prezidento 2025-09-09 dekretas Nr. 1K-434, pakeistas 2025-09-25 dekretu Nr. 1K-446',
     'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf',
     'https://lrv.lt/lt/apie-vyriausybe/ankstesnes-vyriausybes/'),
    (21, 'XXI', NULL, NULL, '2026-07-14',
     NULL, NULL,
     'Respublikos Prezidento 2026-07-07 dekretas Nr. 1K-737',
     'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf',
     'https://lrv.lt/lt/apie-vyriausybe/xxi-vyriausybe/')
ON CONFLICT (number) DO NOTHING;

-- President and Prime Ministers.
INSERT INTO offices_held (office_key, government_number, ministry_key, seq, person_name, title_lt,
                          from_date, basis_lt, basis_url, source_url) VALUES
    ('president', NULL, NULL, 1, 'Gitanas Nausėda', 'Respublikos Prezidentas',
     NULL, NULL, NULL, 'https://www.lrp.lt/lt/institucija/prezidento-funkcijos/118'),
    ('prime_minister', 19, NULL, 1, 'Gintautas Paluckas', 'Ministras Pirmininkas',
     '2024-11-21', 'Respublikos Prezidento dekretas Nr. 1K-156',
     'https://www.lrp.lt/data/public/uploads/2024/11/2024-11-21-nr.-1k-156.pdf',
     'https://lrv.lt/lt/apie-vyriausybe/ankstesnes-vyriausybes/'),
    ('prime_minister', 20, NULL, 1, 'Inga Ruginienė', 'Ministrė Pirmininkė',
     '2025-08-26', 'Respublikos Prezidento dekretas Nr. 1K-428',
     'https://www.lrp.lt/data/public/uploads/2025/08/2025-08-26-nr.-1k-428.pdf',
     'https://lrv.lt/lt/apie-vyriausybe/ankstesnes-vyriausybes/'),
    ('prime_minister', 21, NULL, 1, 'Mindaugas Sinkevičius', 'Ministras Pirmininkas',
     '2026-06-30', 'Respublikos Prezidento dekretas Nr. 1K-733',
     'https://www.lrp.lt/data/public/uploads/2026/06/2026-06-30-nr.-1k-733.pdf',
     'https://lrv.lt/lt/apie-vyriausybe/ministras-pirmininkas/')
ON CONFLICT DO NOTHING;

-- Ministers. source_url is the decree that names the person in that post.
INSERT INTO offices_held (office_key, government_number, ministry_key, seq, person_name, title_lt,
                          from_date, basis_lt, basis_url, source_url)
SELECT 'minister', v.gov, v.ministry, v.seq, v.person, v.title, v.from_date::date, v.basis, v.url, v.url
FROM (VALUES
    -- XIX, decree 1K-178 (full list in its new wording)
    (19, 'aplinka',      1, 'Povilas Poderskis',     'aplinkos ministras',                     NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'ekonomika',    1, 'Lukas Savickas',        'ekonomikos ir inovacijų ministras',      NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'energetika',   1, 'Žygimantas Vaičiūnas',  'energetikos ministras',                  NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'finansai',     1, 'Rimantas Šadžius',      'finansų ministras',                      NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'gynyba',       1, 'Dovilė Šakalienė',      'krašto apsaugos ministrė',               NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'kultura',      1, 'Šarūnas Birutis',       'kultūros ministras',                     NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'socialine',    1, 'Inga Ruginienė',        'socialinės apsaugos ir darbo ministrė',  NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'susisiekimas', 1, 'Eugenijus Sabutis',     'susisiekimo ministras',                  NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'sveikata',     1, 'Marija Jakubauskienė',  'sveikatos apsaugos ministrė',            NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'svietimas',    1, 'Raminta Popovienė',     'švietimo, mokslo ir sporto ministrė',    NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'teisingumas',  1, 'Rimantas Mockus',       'teisingumo ministras',                   NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'uzsienis',     1, 'Kęstutis Budrys',       'užsienio reikalų ministras',             NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'vidus',        1, 'Vladislav Kondratovič', 'vidaus reikalų ministras',               NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    (19, 'zemes_ukis',   1, 'Ignas Hofmanas',        'žemės ūkio ministras',                   NULL, 'Dekretas Nr. 1K-178', 'https://www.lrp.lt/data/public/uploads/2024/12/2024-12-11-nr.-1k-178.pdf'),
    -- XX, decree 1K-446 (full list in its new wording)
    (20, 'aplinka',      1, 'Kastytis Žuromskas',    'aplinkos ministras',                     NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'ekonomika',    1, 'Edvinas Grikšas',       'ekonomikos ir inovacijų ministras',      NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'energetika',   1, 'Žygimantas Vaičiūnas',  'energetikos ministras',                  NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'finansai',     1, 'Kristupas Vaitiekūnas', 'finansų ministras',                      NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'gynyba',       1, 'Dovilė Šakalienė',      'krašto apsaugos ministrė',               NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'kultura',      1, 'Ignotas Adomavičius',   'kultūros ministras',                     NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'socialine',    1, 'Jūratė Zailskienė',     'socialinės apsaugos ir darbo ministrė',  NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'susisiekimas', 1, 'Juras Taminskas',       'susisiekimo ministras',                  NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'sveikata',     1, 'Marija Jakubauskienė',  'sveikatos apsaugos ministrė',            NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'svietimas',    1, 'Raminta Popovienė',     'švietimo, mokslo ir sporto ministrė',    NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'teisingumas',  1, 'Rita Tamašunienė',      'teisingumo ministrė',                    NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'uzsienis',     1, 'Kęstutis Budrys',       'užsienio reikalų ministras',             NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'vidus',        1, 'Vladislav Kondratovič', 'vidaus reikalų ministras',               NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    (20, 'zemes_ukis',   1, 'Andrius Palionis',      'žemės ūkio ministras',                   NULL, 'Dekretas Nr. 1K-446', 'https://www.lrp.lt/data/public/uploads/2025/09/2025-09-25-nr.-1k-446.pdf'),
    -- XX, replacements. Decree 1K-486 is dated 2025-11-10 and names both;
    -- lrv.lt gives 2025-11-11 as the day they took the posts.
    (20, 'gynyba',       2, 'Robertas Kaunas',       'krašto apsaugos ministras',      '2025-11-11', 'Dekretas Nr. 1K-486', 'https://www.lrp.lt/data/public/uploads/2025/11/2025-11-10-nr.-1k-486.pdf'),
    (20, 'kultura',      2, 'Vaida Aleknavičienė',   'kultūros ministrė',              '2025-11-11', 'Dekretas Nr. 1K-486', 'https://www.lrp.lt/data/public/uploads/2025/11/2025-11-10-nr.-1k-486.pdf'),
    -- XXI, decree 1K-737
    (21, 'aplinka',      1, 'Ieva Andriulaitytė',    'aplinkos ministrė',                      NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'ekonomika',    1, 'Edvinas Grikšas',       'ekonomikos ir inovacijų ministras',      NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'energetika',   1, 'Lukas Savickas',        'energetikos ministras',                  NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'finansai',     1, 'Taurimas Valys',        'finansų ministras',                      NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'gynyba',       1, 'Robertas Kaunas',       'krašto apsaugos ministras',              NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'kultura',      1, 'Lukas Alsys',           'kultūros ministras',                     NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'socialine',    1, 'Inga Ruginienė',        'socialinės apsaugos ir darbo ministrė',  NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'susisiekimas', 1, 'Juras Taminskas',       'susisiekimo ministras',                  NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'sveikata',     1, 'Linas Kukuraitis',      'sveikatos apsaugos ministras',           NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'svietimas',    1, 'Raminta Popovienė',     'švietimo, mokslo ir sporto ministrė',    NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'teisingumas',  1, 'Rita Tamašunienė',      'teisingumo ministrė',                    NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'uzsienis',     1, 'Kęstutis Budrys',       'užsienio reikalų ministras',             NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'vidus',        1, 'Martynas Katelynas',    'vidaus reikalų ministras',               NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf'),
    (21, 'zemes_ukis',   1, 'Kęstutis Mažeika',      'žemės ūkio ministras',                   NULL, 'Dekretas Nr. 1K-737', 'https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf')
) AS v(gov, ministry, seq, person, title, from_date, basis, url)
ON CONFLICT DO NOTHING;

-- Seimas membership, confirmed by the minister's official CV (read 2026-11-13).
UPDATE offices_held o
SET mp_seimas_id = c.seimas_id, mp_link_source_url = c.cv
FROM (VALUES
    ('Lukas Savickas',     84619, 'https://enmin.lrv.lt/lt/struktura-ir-kontaktai/gyvenimo-aprasymas/'),
    ('Robertas Kaunas',    90952, 'https://kam.lt/krasto-apsaugos-ministras/'),
    ('Linas Kukuraitis',   84606, 'https://sam.lrv.lt/lt/struktura-ir-kontaktine-informacija/vadovybe-2026/gyvenimo-aprasymas-linas-kukuraitis/'),
    ('Raminta Popovienė',  73583, 'https://smsm.lrv.lt/lt/gyvenimo-aprasymas_/'),
    ('Rita Tamašunienė',   73586, 'https://tm.lrv.lt/lt/gyvenimo-aprasymas_ministre/'),
    ('Martynas Katelynas', 83412, 'https://vrm.lrv.lt/lt/struktura-ir-kontaktine-informacija/vadovybe/gyvenimo-aprasymas-M/'),
    ('Kęstutis Mažeika',   79131, 'https://zum.lrv.lt/lt/struktura-ir-kontaktai/vadovybe/kestutis-mazeika/')
) AS c(person, seimas_id, cv)
WHERE o.person_name = c.person AND o.office_key = 'minister' AND o.mp_seimas_id IS NULL;
