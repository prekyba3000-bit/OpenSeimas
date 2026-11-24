-- P1 trust publication fixes (evaluation CORA-07, SECF-01, SECA-02).
--
-- `withheld` is a terminal, never-public state for abusive or private anonymous
-- submissions. Unlike `open`, it records that a maintainer reviewed the report;
-- unlike `rejected`, it cannot make the submitted text public.
--
-- LT-COPY: needs native review (both corrections entries below).

ALTER TABLE corrections
    DROP CONSTRAINT IF EXISTS corrections_status_check;

ALTER TABLE corrections
    ADD CONSTRAINT corrections_status_check
    CHECK (status IN ('open', 'accepted', 'rejected', 'resolved', 'withheld'));

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'summary-drafts-public-history',
    'Santraukų istorijos puslapis ir viešoji API rodė visas santraukų redakcijas, '
    'įskaitant dar nepatvirtintus juodraščius ir tekstus, kuriuos atmetė skaičių '
    'patikra. Skaitytojas negalėjo atskirti, kuri redakcija patvirtinta.',
    'resolved',
    'Viešojoje istorijoje dabar rodomos tik patvirtintos redakcijos. Pakartotas '
    'identiškos redakcijos įkėlimas nedaro kopijos, o leidimo scenarijus vėl '
    'apdoroja objektus, neturinčius nė vienos patvirtintos redakcijos.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'summary-drafts-public-history'
);

INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'anonymous-correction-text-republished',
    'Peržiūrėjus anoniminį pranešimą apie klaidą, jo tekstas buvo rodomas viešame '
    'pataisymų žurnale net ir tuomet, kai pranešimas atmetamas. Taip galėjo būti '
    'pakartoti nepatikrinti teiginiai arba atskleisti asmens duomenys.',
    'resolved',
    'Atmestų pranešimų tekstas viešai neberodomas; skelbiama būsena ir prižiūrėtojo '
    'sprendimas. Nauja būsena „neskelbiama" leidžia pašalinti piktnaudžiavimo ar privačius '
    'pranešimus iš laukiančių sąrašo nieko nepublikavus. Anoniminių įrašų skaičius '
    'taip pat ribojamas visoje sistemoje, ne tik pagal naudotojo nurodomą IP adresą.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'anonymous-correction-text-republished'
);
