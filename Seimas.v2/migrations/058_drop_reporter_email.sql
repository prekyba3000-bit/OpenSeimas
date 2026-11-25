-- SECA-08: stop holding reporter e-mail. The correction form no longer asks for
-- it and the API drops it on input. Dropping the column erases the one address
-- production held (1 of 24 reports, 2026-11-26). Local dumps (30 daily) and
-- offsite copies (4 weekly) age it out within about five weeks.
-- Deploy order: the backend that no longer inserts the column goes live first.

ALTER TABLE corrections DROP COLUMN IF EXISTS reporter_email;

-- LT-COPY: published corrections entry (charter §2: plain, factual, short).
INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'reporter-email-retention',
    'Pranešimo apie klaidą formoje buvo galima palikti el. pašto adresą. '
    'Nenurodėme, kiek laiko jį saugome, ir nebuvo būdo paprašyti jį ištrinti.',
    'resolved',
    'El. pašto laukelį pašalinome, o vienintelį išsaugotą adresą ištrynėme. '
    'Atsarginėse kopijose jis išnyks per penkias savaites. Sprendimą dėl '
    'kiekvieno pranešimo skelbiame šiame viešame žurnale.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'reporter-email-retention'
);
