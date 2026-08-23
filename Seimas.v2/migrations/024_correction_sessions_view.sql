-- Corrections entry: the sessions page attributed votes to a session that had
-- already closed. Published in plain Lithuanian per the corrections convention
-- — name the failure, not a euphemism for it.
INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'sessions-view',
    'Sesijų puslapyje 128 balsavimai buvo priskirti pavasario sesijai, kuri '
    'baigėsi 2026-07-14. Puslapis rodė, kad ta sesija vis dar vyksta („dabar"), '
    'nes sesijų datos buvo įrašytos programos kode, o ne imamos iš Seimo '
    'duomenų. Kode įrašyta pabaigos data buvo 2099-12-31, todėl kiekvienas '
    'naujas balsavimas būtų patekęs į jau pasibaigusią sesiją.',
    'resolved',
    'Sesijų ribos imamos iš LRS (p2b.ad_seimo_sesijos) ir saugomos duomenų '
    'bazėje. Nepasibaigusios sesijos pabaigos data lieka tuščia, o ne '
    'užpildoma tolima ateities data. Balsavimai, kurių posėdžio data nepatenka '
    'į jokią paskelbtą sesiją, rodomi atskirai, o ne priskiriami spėjant.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'sessions-view'
);
