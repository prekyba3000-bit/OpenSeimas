-- Corrections entry (§1.6): the hardcoded „Duomenų šaltiniai" box on the
-- Skaidrumas page listed six sources as active or partial. The pipeline reads
-- the Seimas and VRK only. Checked 2026-11-14: no pipeline or backend code
-- reads data.gov.lt, Registrų centras, Rekvizitai, VMI or ICIJ, and 0 of 149
-- politicians rows carry an OpenSanctions id. The page's headline also promised
-- declarations and connections, which the Sources page says we do not collect.
INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'skaidrumas-sources-box-unloaded',
    'Skaidrumo centro puslapio apačioje buvo sąrašas „Duomenų šaltiniai". '
    'Jame šeši šaltiniai buvo pažymėti žodžiu „aktyvus" arba „dalinis". Iš jų '
    'portalas naudoja tik Seimo ir VRK duomenis. Registrų centro, „Rekvizitai", '
    'VMI, „OpenSanctions / ICIJ" ir data.gov.lt duomenų portalas nerenka. To '
    'paties puslapio viršuje buvo parašyta, kad portale yra „deklaracijos ir '
    'ryšiai", nors šaltinių puslapyje sakome, kad deklaracijų nerenkame.',
    'resolved',
    'Sąrašą pašalinome ir įdėjome nuorodą į šaltinių puslapį. Sakinį puslapio '
    'viršuje pakeitėme. Klaidą radome perskaitę puslapį taip, kaip jį mato '
    'lankytojas.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'skaidrumas-sources-box-unloaded'
);
