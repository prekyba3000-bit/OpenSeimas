-- Corrections entry: a public PNG rendered a level number, a D&D alignment
-- badge and RPG stat axes onto a named member of parliament.
--
-- Found 2026-09-07 while verifying an external technical audit, which flagged
-- `backend/share_card_renderer.py:123-226` as still drawing fields that had
-- been removed from the profile payload. It was live: a HEAD against
-- production returned 200 image/png, and the rendered card showed a real
-- member's photograph and name beside a circle containing „0", a badge
-- reading "True Neutral", a five-axis radar labelled STR / WIS / CHA / INT /
-- STA, an "XP Progress" bar reading "XP: 0 / 1", and "No artifacts unlocked".
--
-- Reachable, not theoretical. `MpProfileCard.tsx` put a „Dalintis kortele"
-- button on every member profile that fetched exactly this URL; the response
-- carried `Cache-Control: public, max-age=3600` and no authentication.
--
-- Removing the RPG keys from the JSON payload — the correct fix, made
-- earlier — is what made the image worse rather than better. The renderer
-- read them from a dict that no longer contained them and fell back to its
-- own defaults, so `level` became 0 and `alignment` became "True Neutral" for
-- every member alike. Both are §1.1 failures on top of the §1.3 one: a
-- plausible-looking default standing in for data that does not exist.
--
-- The guard that should have caught it, `tests/test_no_verdicts_on_the_wire.py`,
-- contained the sentence "Nothing rendered them". That was written about the
-- JSON and was true about the JSON. Every assertion in the file reads a
-- payload; none read the route table for a surface that is not a payload. A
-- PNG is a public surface.
--
-- Removed in this commit: the endpoint, the renderer, its HTML template, the
-- profile button, and Pillow, which nothing else in the tree uses. The guard
-- now asserts at the route table that no route serves a card about a person,
-- and that the renderer module is absent rather than merely unrouted.
--
-- As with `ai-wiki-risk-labels`, the entry does not name which member the
-- verification card was rendered for. The corrections log is a public page.

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'rpg-share-card',
    'Kiekvieno Seimo nario profilyje veikė mygtukas „Dalintis kortele". Jis '
    'atsisiųsdavo paveikslėlį, kuriame šalia nario nuotraukos ir vardo buvo '
    'rodomas „lygis" (skaičius apskritime), charakterio tipo ženklelis '
    '(„True Neutral"), penkių ašių diagrama su žymomis STR / WIS / CHA / INT / '
    'STA, patirties taškų juosta ir „artefaktų" sąrašas. Tai vaidmenų žaidimo '
    'sąvokos, pritaikytos tikram žmogui, ir tai yra vertinimas — būtent tai, ko '
    'portalas neskelbia. Padėtį blogino tai, kad šie laukai jau buvo pašalinti '
    'iš duomenų, kuriuos portalas siunčia: paveikslėlio piešiklis jų nerasdavo '
    'ir įrašydavo savo numatytąsias reikšmes, todėl visiems nariams vienodai '
    'buvo rodomas lygis „0" ir tipas „True Neutral" — skaičius vietoje '
    'nežinomybės. Paveikslėlis buvo pasiekiamas viešai, be jokio prisijungimo.',
    'resolved',
    'Pašalinta 2026-09-07: pats adresas, paveikslėlio piešiklis, jo šablonas, '
    'mygtukas profilyje ir nebenaudojama paveikslėlių biblioteka. Ankstesnės '
    'apsaugos tikrino tik siunčiamus duomenis ir jose buvo įrašytas teiginys, '
    'kad šių laukų niekas nepiešia — jis buvo neteisingas. Dabar tikrinamas '
    'ir adresų sąrašas: joks portalo adresas negali grąžinti kortelės apie '
    'žmogų, o piešiklio failo saugykloje nebėra. Konkretus narys, kurio '
    'kortelė buvo atidaryta tikrinant, čia neįvardijamas — pataisymų žurnalas '
    'yra viešas puslapis.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'rpg-share-card'
);
