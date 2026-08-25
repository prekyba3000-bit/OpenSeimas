-- Visibility: the press-release input becomes populated.
--
-- The formula does not change. `speeches_given` has always been
-- floor_speech*2 + press_release, but no press-release row had ever been
-- ingested, so in practice the metric ran on floor speeches alone. Filling
-- that input moves published values, which is what earns a methodology entry
-- under the accumulated law even though no code changed.
--
-- Measured before ingesting: 399 press releases across 140 active members,
-- median 0, max 187. Three members move more than half a point on the
-- 0–50 visibility half-term; the rest move less.

INSERT INTO methodology_versions (metric_key, version, title_lt, body_lt, announced_at, effective_from)
SELECT 'visibility', 1,
'Matomumas: pranešimai žiniasklaidai įtraukti į duomenis',
'Matomumo rodiklis nuo pat pradžių skaičiavo dvi veiklas: kalbas posėdžiuose ir pranešimus žiniasklaidai. Tačiau pranešimų duomenys nebuvo surinkti, todėl iki 2026-08-25 rodiklis rėmėsi vien kalbomis.

Skaičiavimas: kalba posėdyje skaičiuojama dvigubai, pranešimas žiniasklaidai – vienetu. Gauta suma lyginama su didžiausia Seimo nario suma.

Nuo 2026-08-25 pranešimai surenkami iš LRS (p2b.ad_sn_pranesimai_ziniasklaidai). Iš viso surinkti 399 pranešimai. Daugumai narių jų nėra nė vieno, todėl jų rodiklis beveik nepasikeitė. Trijų narių rodiklis pasikeitė pastebimai.

Rodiklis nevertina pranešimų kokybės, turinio ar svarbos. Jis rodo tik tai, kiek kartų narys pasinaudojo šiuo kanalu.',
NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM methodology_versions WHERE metric_key='visibility' AND version=1
);
