-- Corrections entries (§1.6) and a methodology entry (§1.5) for two defects
-- that reached production. Both were found by the 2026-11-22 whole-repository
-- evaluation (.evaluation/20261118-235807, findings CORA-01 and CORB-07), the
-- first by rendering the members list, the second by building a profile with
-- a real faction agreement instead of an empty one.
--
-- 1. SEARCH SHOWED ZEROS
--
-- Typing in the search box on „Seimo nariai" replaced each matching member's
-- figures with 0 votes and „0 %" attendance. The hits came from a different
-- endpoint and were mapped into list rows with hard-coded zeros. A faction
-- name, which the box invites, found nobody. Every searched member was shown
-- with the most damaging figure the platform can state about a person.
--
-- 2. A "BONUS" DERIVED FROM DISAGREEING WITH ONE'S FACTION
--
-- Every profile carried, and drew as a flag, a 10-point "integrity bonus" for
-- members who disagreed with their faction between 10 % and 40 % of the time
-- (100 − party loyalty). That is a verdict on a named person. The guards
-- missed it because they ran on an empty profile, where the bonus is always 0.
--
-- The methodology entry is a presentational retirement. It takes effect at
-- once, without the 14-day notice: the notice protects readers from a changed
-- figure, and here no figure changes — a verdict stops being shown (charter
-- order: the trust floor and non-partisanship come before process).
--
-- LT-COPY: needs native review (all three texts below).

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'members-search-showed-zeros',
    'Puslapyje „Seimo nariai" ieškant nario pagal vardą, prie kiekvieno rasto '
    'nario rodėme 0 balsavimų ir 0 % dalyvavimą. Tai nebuvo tikri skaičiai: '
    'paieškos rezultatams skaičių tiesiog nepriskyrėme ir vietoje jų parodėme '
    'nulius. Ieškant pagal frakcijos pavadinimą, nebuvo randamas nė vienas '
    'narys, nors paieškos laukelis tai siūlė.',
    'resolved',
    'Paieška dabar ieško tame pačiame narių sąraše, kurį matote be paieškos, '
    'todėl skaičiai sutampa. Paieška randa narius ir pagal frakciją, o '
    'lietuviškos raidės nebūtinos. Testas tikrina, kad ieškant rodomi tie '
    'patys skaičiai kaip sąraše.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'members-search-showed-zeros'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'metric',
    'loyalty-bonus-verdict',
    'Seimo narių profiliuose rodėme žymą, pagrįstą tuo, kaip dažnai narys '
    'balsavo kitaip nei jo frakcija. Jei tai nutikdavo 10–40 % balsavimų, '
    'nariui buvo skiriama 10 taškų „premija". Tai vertinimas apie konkretų '
    'žmogų, o tokių vertinimų žadėjome neskelbti. Ta pati žyma buvo ir mūsų '
    'API atsakyme.',
    'resolved',
    'Žymą ir premiją pašalinome iš profilio ir iš API. Rodiklis „Sutapimas su '
    'frakcija" liko: tai skaičius su paaiškinimu, kaip jis gautas. Testas '
    'dabar tikrina profilį su tikrais duomenimis, o ne tuščią.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'loyalty-bonus-verdict'
);

INSERT INTO methodology_versions (metric_key, version, title_lt, body_lt, announced_at, effective_from)
SELECT 'loyalty_bonus', 1,
'„Premija" už balsavimą kitaip nei frakcija nebeskaičiuojama',
'Iki šiol profiliuose buvo žyma, kuri nariui skirdavo 10 taškų, jei jis 10–40 % balsavimų balsavo kitaip nei jo frakcija.

Ši žyma pašalinta. Ji vertino žmogų, o portalas žmonių nevertina.

Kiek narys balsavo kartu su savo frakcija, rodo rodiklis „Sutapimas su frakcija". Jo skaičiavimas nepasikeitė.',
NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM methodology_versions WHERE metric_key = 'loyalty_bonus' AND version = 1
);
