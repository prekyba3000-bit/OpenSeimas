-- Corrections entry: we told readers why per-member results were missing, and
-- the reason was not ours to give.
--
-- The vote page carried this, on each of the 1,656 votes with no per-member
-- data: „...šaltinis nepaskelbė, kaip balsavo kiekvienas narys — elektroniniu
-- būdu gauti rezultatai nesutapo su protokolo suvestine." The clause after the
-- dash came from the `komentaras` attribute in the LRS results feed, which
-- migration 018 recorded as a per-vote discrepancy flag.
--
-- It is not a flag. It is one identical string on all 5,286 votes, including
-- all 3,630 that publish complete per-member results:
--
--   SELECT source_comment, count(*), count(*) FILTER (WHERE votes_participated>0)
--   FROM votes GROUP BY 1;  -> 1 row: 5286, 3630
--
-- A field present on every row discriminates nothing, so it cannot explain why
-- any particular vote is missing anything. The absence was real and correctly
-- shown; the explanation attached to it was invented from a constant.
--
-- Stated plainly per the corrections convention: this is not a display bug, it
-- is us publishing a causal claim the source does not make.
INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, resolved_at)
SELECT
    'other',
    'unpublished-vote-reason',
    'Balsavimų puslapyje prie 1 656 balsavimų, kurių pavienių rezultatų '
    'šaltinis nepaskelbė, buvo nurodyta priežastis: esą elektroniniu būdu '
    'gauti rezultatai nesutapo su protokolo suvestine. Tokios priežasties '
    'šaltinis nenurodo. Šis sakinys Seimo duomenyse pažymėtas prie visų 5 286 '
    'balsavimų — taip pat ir prie tų 3 630, kurių visi pavieniai rezultatai '
    'yra paskelbti — todėl jis nieko nepaaiškina apie konkretų balsavimą. '
    'Duomenų trūkumą rodėme teisingai, bet priežastį prasimanėme.',
    'resolved',
    'Priežasties nebenurodome: rašome, kad šaltinis pavienių rezultatų '
    'nepaskelbė ir priežasties nenurodo. Ta pati klaida buvo pakartota dar '
    'dviejose vietose (salės žemėlapyje ir rengiamame santraukų šablone) — '
    'visos ištaisytos. Testas neleidžia jokiam tekstui priskirti priežasties '
    'trūkstamiems duomenims, jei jos nepateikia šaltinis.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM corrections WHERE entity_id = 'unpublished-vote-reason'
);
