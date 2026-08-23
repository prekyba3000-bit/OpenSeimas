-- Methodology entry: the legislative-activity dimension is relabelled.
--
-- Presentational change, not a computation change. The number is unchanged —
-- it has always been `kiekis_viso` from p2b.ad_sn_inicijuoti_ta_projektai,
-- which counts projects a member co-signed as well as ones they initiated
-- alone. What changes is that the surface stops calling that "authored".
--
-- Measured 2026-08-24: 69 of 148 members have a total above zero and zero
-- individual initiatives. The highest total in the chamber (94) belongs to a
-- member whose individual count is 0.
--
-- §1.5 requires an entry for presentational demotions too, which this is.
INSERT INTO methodology_versions (metric_key, version, title_lt, body_lt, announced_at, effective_from)
SELECT
    'legislative_activity',
    2,
    'Teisėkūros aktyvumas: patikslintas pavadinimas ir antras skaičius',
    'Rodiklis skaičiuoja teisės aktų projektus, kuriuos narys inicijavo arba '
    'prie kurių prisidėjo kaip bendraautoris. Šaltinis (LRS '
    'p2b.ad_sn_inicijuoti_ta_projektai) pateikia tris skaičius: bendrą, '
    'individualų ir grupėje. Iki šiol rodėme tik bendrą skaičių, o pavadinimas '
    'leido suprasti, kad narys projektus parengė vienas. 2026-08-24 duomenimis '
    '69 nariams iš 148 bendras skaičius didesnis už nulį, o individualus lygus '
    'nuliui, todėl toks pavadinimas buvo netikslus beveik pusei Seimo. '
    'Skaičiavimas nesikeičia. Nuo šiol rodome abu skaičius atskirai ir '
    'pavadiname tai, ką jie matuoja. Jei individualus skaičius nežinomas, '
    'rodome, kad duomenų nėra — ne nulį.',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM methodology_versions
    WHERE metric_key = 'legislative_activity' AND version = 2
);
