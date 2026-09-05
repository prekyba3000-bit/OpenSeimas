-- Two corrections entries for defects that reached production on 2026-09-05.
--
-- Both were found by asking a question no test was asking, which is the
-- pattern worth keeping: the first by a new guard reporting which keys the
-- client's schema silently drops, the second by opening a member's profile and
-- reading it as a stranger would.
--
-- 1. VERDICT-SHAPED KEYS ON THE PUBLIC API
--
-- /api/v2/heroes/{id} carried risk_score, high_risk_alerts, forensic_penalties,
-- social_bonus, raw_forensic_penalty_sum and capped_forensic_penalty for every
-- named member. No surface rendered them — the client's zod schema had been
-- dropping them all along — but charter §1.3 forbids a composite about a named
-- person "on any public surface OR in any public API payload", and the media
-- kit invites external API use.
--
-- They hid because HeroProfileResponse declares metrics and forensic_breakdown
-- as Dict[str, Any], and the existing guard read the response model's field
-- list. It filtered the top level; nothing filtered one level down.
--
-- Values were 0.0 throughout, so no reader saw a score about anyone. That is
-- why this entry says the fields were available rather than that verdicts were
-- published — the existing 'verdiktu-skelbimas' entry covers the case where
-- they actually were.
--
-- 2. A REASON WE INVENTED FOR NINE MEMBERS
--
-- The faction-alignment panel branched on "no comparable votes" and printed one
-- sentence for every cause of it: „frakcija per maža". Nine of 148 members sit
-- in no faction — the Speaker, who steps out of his for the term, and the eight
-- former members — and their own profile header says so two inches above. The
-- sentence told those readers something untrue about why the number was absent.
--
-- Same disease as migration 038: the absence was real and correctly shown, and
-- the explanation attached to it was not the source's.

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'verdict-keys-on-the-api',
    'Viešame duomenų sąsajos (API) atsakyme apie kiekvieną Seimo narį buvo '
    'siunčiami vertinamieji laukai: „rizikos balas", „didelės rizikos '
    'įspėjimai", baudos taškai ir jų sumos. Portale jų niekas nerodė — juos '
    'atmesdavo naršyklės pusėje — bet jie buvo prieinami visiems, kas naudoja '
    'mūsų API. Visos reikšmės buvo nulinės, todėl jokio balo apie konkretų '
    'žmogų niekas nematė. Vis dėlto pažadėjome, kad tokių laukų neskelbiame '
    'niekur, o jie ten buvo.',
    'resolved',
    'Laukai pašalinti iš atsakymo 2026-09-05. Aprašomieji rodikliai — '
    'dalyvavimas, sutapimas su frakcija, balsavimai, kalbos, patirtis — liko. '
    'Testas dabar tikrina visą sukurtą atsakymą iki paskutinio lygio, o ne tik '
    'jo viršutinius laukus: būtent todėl klaida ir liko nepastebėta.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'verdict-keys-on-the-api'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'metric',
    'faction-alignment-wrong-reason',
    'Devynių Seimo narių profiliuose prie rodiklio „Sutapimas su frakcija" '
    'rašėme, kad skaičiaus nerodome, nes frakcija per maža. Šie nariai '
    'frakcijai nepriklauso — tai matyti ir jų pačių profilio viršuje. '
    'Priežastis, kurią nurodėme, jiems buvo neteisinga. Duomenų trūkumą rodėme '
    'teisingai, bet paaiškinimą parašėme ne tą.',
    'resolved',
    'Ištaisyta 2026-09-05. Nariui be frakcijos dabar rašome, kad nėra '
    'pozicijos, su kuria būtų galima lyginti. Tas pats pataisyta ir prie paties '
    'rodiklio, kur anksčiau buvo žadama, kad skaičius atsiras įkėlus šaltinio '
    'duomenis — tokiam nariui jis neatsiras.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'faction-alignment-wrong-reason'
);
