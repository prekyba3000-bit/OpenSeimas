-- Corrections entries (§1.6) and methodology entries (§1.5) for display
-- defects that reached production. All were found by the 2026-11-22
-- whole-repository evaluation (.evaluation/20261118-235807) by rendering the
-- pages, not by reading the code.
--
-- 1. hub-low-attendance-list (CORF-01). „Skaidrumo centras" opened on the
--    headline „Neįmanoma būti suktam." above a list of named members under
--    60 % attendance, lowest first, beside an alert icon and counted in a
--    ticker. The faction roster ordered members by attendance in
--    vote-for / vote-against colours.
-- 2. profile-removed-checks (CORF-04). Every profile listed four forensic
--    checks as „Duomenų nėra". Nothing ever ran them; they were deleted on
--    2026-11-14, and the methodology page described them in the present tense.
-- 3. monitoring-first-20 (CORA-08, CORF-02). „Pasisakymai ir balsavimai"
--    showed the first 20 members alphabetically and nobody else. Sorting by a
--    column put members without that figure in rows one cell out of line.
-- 4. dimension-drawers (CORF-03). The „Kaip skaičiuojama?" text for
--    „Viešumas" and „Patirtis ir aktyvumas" did not say what is computed.
--
-- Not entered: members with no sitting day yet shown at 0 % (CORA-03). The
-- defect was real and is fixed, but no member was in that state on
-- 2026-11-22 (/api/mps?status=all: 149 members, none at 0), and we have no
-- record that one ever was. A correction says what was shown; this one could
-- not.
--
-- The two methodology entries change no figure. They correct the published
-- description, so they take effect at once, without the 14-day notice that
-- protects readers from a changed figure.
--
-- LT-COPY: needs native review (every text below).

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'hub-low-attendance-list',
    'Puslapis „Skaidrumo centras" prasidėjo antrašte „Neįmanoma būti suktam.", '
    'o po ja buvo Seimo narių, kurių dalyvavimas mažesnis nei 60 %, sąrašas — '
    'nuo mažiausio, su įspėjimo ženklu. Puslapyje „Frakcijos" nariai buvo '
    'išrikiuoti pagal dalyvavimą ir nuspalvinti žalia, geltona arba raudona '
    'spalva. Sąrašo tvarka ir spalvos yra vertinimas apie konkrečius žmones.',
    'resolved',
    'Sąrašą ir antraštę pašalinome. Frakcijų nariai dabar išdėstyti pagal '
    'abėcėlę, be spalvų. Kiekvieno nario dalyvavimas rodomas jo profilyje ir '
    'narių sąraše. Testas tikrina, kad nariai rikiuojami pagal vardą.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'hub-low-attendance-list'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'profile-removed-checks',
    'Kiekvieno Seimo nario profilyje rodėme keturias patikras, tarp jų '
    '„Paslėptų ryšių tinklą", su užrašu „Duomenų nėra". Šios patikros niekada '
    'nebuvo paleistos, o 2026 m. lapkričio 14 d. jas pašalinome. Metodikos '
    'puslapis jas vis dar aprašė taip, lyg jas atliktume.',
    'resolved',
    'Patikras pašalinome iš profilių. Metodikos puslapyje parašyta, kad jos '
    'pašalintos ir kodėl.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'profile-removed-checks'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'monitoring-first-20',
    'Puslapyje „Pasisakymai ir balsavimai" rodėme tik pirmuosius 20 Seimo '
    'narių pagal abėcėlę, nors nurodėme, kad tai visų narių lentelė. Kitų '
    'narių ten nebuvo. Surikiavus lentelę pagal stulpelį, narių be to rodiklio '
    'eilutėse skaičiai buvo po kitais stulpeliais, o telefone šie nariai '
    'nebuvo rodomi.',
    'resolved',
    'Lentelėje dabar yra visi nariai. Eilutės sutampa su stulpeliais, o '
    'telefone rodomi ir nariai be to rodiklio.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'monitoring-first-20'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'metric',
    'dimension-drawers',
    'Paaiškinimai „Kaip skaičiuojama?" prie rodiklių „Viešumas" ir „Patirtis '
    'ir aktyvumas" neatitiko skaičiavimo. Pusė „Viešumo" skirta socialiniams '
    'tinklams, kurių duomenų nerenkame, todėl didžiausia reikšmė yra 50, o ne '
    '100. „Patirtis ir aktyvumas" neskaičiuoja kadencijų, o penktadalis jo '
    'skirtas pataisoms, kurių duomenų neturime, todėl didžiausia reikšmė yra '
    '80. Be to, šiuos rodiklius rodėme procentais, nors tai taškai.',
    'resolved',
    'Paaiškinimai dabar nurodo visas dalis, jų svorius ir didžiausią galimą '
    'reikšmę. Skaičiai nepasikeitė. Šie rodikliai rodomi kaip taškai iš 100. '
    'Testas tikrina, kad paaiškinimas atitinka skaičiavimą.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'dimension-drawers'
);

INSERT INTO methodology_versions (metric_key, version, title_lt, body_lt, announced_at, effective_from)
SELECT 'visibility', 2,
'Viešumas: patikslintas aprašymas',
'Skaičiavimas nepasikeitė. Ankstesniame aprašyme trūko vienos dalies.

Pusė rodiklio — pasisakymai: kalba Seimo posėdyje skaičiuojama du kartus, pranešimas spaudai — vieną kartą. Suma lyginama su didžiausia Seimo nario suma.

Kita pusė skirta buvimui socialiniuose tinkluose. Šių duomenų nerenkame, todėl ši dalis visiems lygi 0, o didžiausia galima reikšmė yra 50 iš 100.',
NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM methodology_versions WHERE metric_key = 'visibility' AND version = 2
);

INSERT INTO methodology_versions (metric_key, version, title_lt, body_lt, announced_at, effective_from)
SELECT 'experience', 1,
'Patirtis ir aktyvumas: kaip skaičiuojama',
'Rodiklį sudaro trys dalys. Kiekviena lyginama su didžiausia reikšme tarp šios kadencijos narių.

Pusė — laikas nuo pirmo nario balso šioje kadencijoje. 30 % — atiduotų balsų skaičius. 20 % — pateiktų pataisų skaičius.

Pataisų duomenų kol kas neturime, todėl ši dalis visiems lygi 0, o didžiausia galima reikšmė yra 80 iš 100. Ankstesnių kadencijų neskaičiuojame, nes jų balsavimų duomenų neturime.',
NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM methodology_versions WHERE metric_key = 'experience' AND version = 1
);
