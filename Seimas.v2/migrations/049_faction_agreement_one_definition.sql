-- Faction agreement: one definition, and the corrections for 2026-11-13.
--
-- The profile dial and the list column „Sutapimas su frakcija" read
-- mp_stats_summary.party_loyalty. The card under the dial, the hub and
-- /api/forensics/loyalty read the faction_alignment view (migration 037),
-- which was rebuilt precisely so that it could be published. Two figures,
-- one name, one page.
--
-- Measured against production on 2026-11-13, 140 active members:
--   121 had both figures; all 121 differed; 110 by more than 2 points,
--   90 by more than 5. Widest: 47.55 on the dial, 94.34 in the view.
--   18 had a dial figure where the view says faction_too_small.
--
-- From this commit every read path takes the figure from faction_alignment.
-- No table or view changes here; mp_stats_summary.party_loyalty is no longer
-- read by anything that publishes.

INSERT INTO methodology_versions (metric_key, version, title_lt, body_lt, announced_at, effective_from)
SELECT 'party_loyalty', 2,
'Sutapimas su frakcija: vienas skaičiavimas visuose puslapiuose',
'Rodiklis „Sutapimas su frakcija" iki 2026-11-13 buvo skaičiuojamas dviem būdais. Profilio viršuje ir narių lentelėje rodėme senesnio skaičiavimo rezultatą. Profilio kortelėje su balsavimų sąrašu rodėme naujesnio skaičiavimo rezultatą. Skaičiai skyrėsi.

Nuo 2026-11-13 visur rodomas tik naujesnis skaičiavimas.

Skaičiavimas: imami balsavimai, kuriuose narys balsavo „už", „prieš" arba „susilaikė" ir kuriuose balsavo bent dešimt jo frakcijos narių. Frakcijos pozicija yra dažniausias tų narių pasirinkimas. Rodiklis yra balsavimų, kuriuose nario pasirinkimas sutapo su frakcijos pozicija, dalis.

Skaičiaus nerodome, jei narys nepriklauso frakcijai, jei frakcijoje balsavo mažiau nei dešimt narių arba jei palyginamų balsavimų yra mažiau nei dvidešimt.

Rodiklis remiasi šiandienine nario frakcija. Jei narys frakciją keitė, ankstesni jo balsavimai lyginami su dabartine frakcija.

Tai nėra ištikimybės ar savarankiškumo matas.',
NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM methodology_versions WHERE metric_key='party_loyalty' AND version=2
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'metric',
    'faction-agreement-two-figures',
    'Seimo nario profilyje rodiklį „Sutapimas su frakcija" rodėme du kartus, '
    'ir skaičiai nesutapo. Viršuje esantis skaičius buvo gautas senesniu '
    'skaičiavimu, o žemiau esančioje kortelėje — naujesniu. 2026 m. lapkričio '
    '13 d. abu skaičius turėjo 121 narys, ir visų jų skaičiai skyrėsi; 90 '
    'narių — daugiau nei 5 procentiniais punktais. Didžiausias skirtumas: '
    '47,55 % viršuje ir 94,34 % kortelėje. Dar 18 narių viršuje matė skaičių, '
    'nors jų frakcija per maža, kad jos poziciją būtų galima nustatyti. '
    'Senesnis skaičius buvo rodomas ir narių lentelėje.',
    'resolved',
    'Senesnio skaičiavimo neberodome niekur. Profilis, lentelė ir kortelė '
    'dabar ima skaičių iš to paties šaltinio. Skaičiavimas aprašytas '
    'metodikoje. Testas neleidžia šiam rodikliui turėti antro skaičiavimo.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'faction-agreement-two-figures'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'profile-cards-unchecked-claims',
    'Nuo 2026 m. spalio 2 d. iki lapkričio 13 d. Seimo narių profiliuose '
    'rodėme korteles, kurių neturėjome rodyti. Kortelė apie verslo '
    'ryšius ir viešuosius pirkimus 110 narių rodė ženklą „Nėra sutapčių"; tą '
    'patį ženklą ji rodė ir tada, kai duomenų gauti nepavyko. 30 narių ji '
    'rodė „sutapimus" — sutartis, kurias laimėjo nario deklaruota darbovietė '
    'ar organizacija. Kita kortelė rodė '
    'antrą, kitaip skaičiuotą sutapimo su frakcija rodiklį. Trečia teigė, kad '
    'duomenų „neužfiksuota", nors jų niekada nerinkome. Be to, profilyje prie '
    'Benfordo analizės visiems nariams rašėme „Požymių nerasta", nors ši '
    'analizė nebuvo atlikta nė vienam nariui.',
    'resolved',
    'Korteles pašalinome. Prie neatliktos analizės dabar rašome „Duomenų '
    'nėra". Klaidas radome perskaitę puslapį taip, kaip jį mato lankytojas.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'profile-cards-unchecked-claims'
);
