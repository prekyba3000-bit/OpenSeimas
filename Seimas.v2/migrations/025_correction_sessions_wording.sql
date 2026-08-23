-- Amends the corrections entry added in 024. The first wording said 128 votes
-- had been attributed to a session that had ended. That was wrong in the
-- platform's own favour-of-drama direction: LRS records session 144 as running
-- 2026-03-10 → 2026-07-14, so votes through 14 July belonged to it correctly —
-- the session really was extended past 30 June.
--
-- The defect was narrower and worth stating exactly: the page asserted that
-- session was still sitting, and did not know about the two sessions that
-- follow it. A corrections entry that overstates a defect is the same failure
-- as one that hides it — both describe data that does not exist.
UPDATE corrections
SET description =
        'Sesijų puslapis rodė, kad pavasario sesija tebevyksta („dabar“), nors '
        'ji baigėsi 2026-07-14. Sesijų datos buvo įrašytos programos kode, o ne '
        'imamos iš Seimo duomenų, ir kode įrašyta pabaigos data buvo '
        '2099-12-31. Kode nebuvo nei neeilinės sesijos (nuo 2026-08-25), nei '
        'rudens sesijos (nuo 2026-09-10), todėl nuo 2026-08-25 kiekvienas '
        'naujas balsavimas būtų buvęs priskirtas jau pasibaigusiai sesijai.',
    resolution_note =
        'Sesijų ribos imamos iš LRS (p2b.ad_seimo_sesijos) ir saugomos duomenų '
        'bazėje; jas kasdien atnaujina sinchronizacija. Nepasibaigusios sesijos '
        'pabaigos data lieka tuščia, o ne užpildoma tolima ateities data. '
        'Balsavimai, kurių posėdžio data nepatenka į jokią paskelbtą sesiją, '
        'rodomi atskirai, o ne priskiriami spėjant.'
WHERE entity_id = 'sessions-view';
