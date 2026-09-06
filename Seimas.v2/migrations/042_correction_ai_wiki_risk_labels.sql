-- Corrections entry: an AI-generated "risk level" ranking of named members
-- was built, ran at least once, and shipped in the public repository.
--
-- Found 2026-09-06 while auditing which empty tables were safe to fill.
-- `dashboard/src/components/WikiPanel.tsx` was wired into every MP profile
-- page and fetched `/wikis/{mp_id}.md` — a static file meant to be generated
-- by an agent task (`docs/archive/generate_mp_wikis.md`, itself referencing
-- `.openplanter/prompts/generate_mp_wikis.md`) that researched a member via
-- database fields and a web search, then wrote a report ending in a
-- "Conclusion" section stating a Risk Level of Low, Medium, High or Critical.
--
-- That task had run: five members had a generated report and an index file
-- (`dashboard/public/wikis/index.json`) assigning each a risk_level, four of
-- them "High". A related, earlier attempt at the same task
-- (`docs/wiki-archive/`) had produced plain biographical pages for a few more
-- members plus an explicit note that a "flag MPs below an integrity
-- threshold" pass had failed to run — meaning the mechanism was understood
-- and attempted more than once.
--
-- All of it — the component, the generated reports, and the index — was
-- committed to git from the project's first commit onward, in a public
-- GitHub repository. The individual report files were never referenced by
-- the live Vercel build (they were not committed to `dashboard/public/`, so
-- the deployed site 404'd on them and showed a harmless empty state), but
-- `index.json` was committed to the exact path the frontend serves, and the
-- whole feature would have shown a "Risk Level" verdict on a real profile
-- page the moment anyone regenerated and committed the missing files.
--
-- This is the same failure the "heroes-villains" and "Gėdos siena"
-- retirements already named: a computed judgement about a specific named
-- person, published as if it were a fact the data supported. It reached
-- further than either of those — a static asset that a source-only grep does
-- not see, exactly the gap `noVerdictsInStaticData.test.ts` exists to close
-- and did not: `risk_level` was not in that guard's forbidden-key list.
--
-- The component, its service module, its tests, the generated reports, the
-- index, and the archived earlier attempt are removed in this commit. The
-- guard's vocabulary now includes `risk_level` and `integrity_score`.
--
-- What this migration does NOT do: name which members were rated, or repeat
-- the labels. The corrections log is itself a public page, and restating a
-- specific rating there would publish the exact thing being corrected under
-- the platform's own authority. The failure is described so it cannot recur;
-- the instance is not reproduced.

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'ai-wiki-risk-labels',
    'Portale veikė mechanizmas, kuris generuodavo tekstinę ataskaitą apie '
    'Seimo narį (duomenų bazės rodikliai plius interneto paieška) ir baigdavo '
    'ją rizikos lygiu — Žemas / Vidutinis / Aukštas / Kritinis. Bent viena šio '
    'mechanizmo veikimo banga buvo įvykusi: penki nariai turėjo sugeneruotą '
    'ataskaitą su priskirtu rizikos lygiu, keturiems iš jų — „Aukštas". Šis '
    'sąrašas ir komponentas, kuris jį rodytų profilyje, buvo įkelti į viešą '
    'saugyklą nuo pat pirmojo įrašo. Tai ta pati klaida, kurią jau taisėme dėl '
    '„herojų ir piktadarių" sąrašo bei „Gėdos sienos" — apskaičiuotas '
    'vertinimas apie konkretų žmogų, paskelbtas taip, tarsi jį patvirtintų '
    'duomenys. Šįkart ji pasiekė toliau: statinį failą, kurio anksčiau '
    'naudotos apsaugos nematė, nes tikrino tik programos kodą, o ne viešai '
    'skelbiamus duomenų failus.',
    'resolved',
    'Pašalinta 2026-09-06: komponentas, jo paslaugų modulis, sugeneruotos '
    'ataskaitos, indekso failas ir ankstesnio bandymo archyvas. Apsauga, '
    'tikrinanti viešai skelbiamus duomenis, papildyta žodžiais „risk_level" ir '
    '„integrity_score" — anksčiau jos nebuvo tikrinamų sąraše. Konkretūs '
    'nariai ir jiems priskirti įvertinimai čia nekartojami: pataisymų žurnalas '
    'yra viešas puslapis, ir pakartoti konkretų vertinimą reikštų paskelbti tą '
    'patį, ką taisome.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'ai-wiki-risk-labels'
);
