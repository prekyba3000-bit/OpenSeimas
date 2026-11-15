# Front page, rebuilt from the mockup

2026-11-14/15. The human disliked the old front page ("no engaging inviting
structure that is self-explanatory"), preferred the mockup
(`mockups/pradzia-2026.html`) and approved a four-step plan: build `/` on live
data, add vote counts to the API, pick the vote cards by a fixed rule, check
on desktop and phone before any deploy. Other pages keep their look.

## Recon (§1.8)

- `/api/meta/last-sitting-day` → `sitting_date`, `vote_count`, `mps_present`.
  `mps_present` counts members with a recorded choice that day, not
  registrations. The mockup said „Užsiregistravo"; the page says „Bent kartą
  balsavo", as the existing day page does.
- `votes` holds `votes_for / votes_against / votes_abstained / voted_at`;
  `/api/votes` did not send them. 0/0/0 means the source published no count.
- `/api/government`: all 44 ministers of governments 19–21 carry an
  appointment decree with a link; only 2 carry their own start date. All 83
  listed presidential decrees carry a link (local copy of production).

## Built

- **API, additive:** `/api/votes` items gain `votes_for`, `votes_against`,
  `votes_abstained` (all three null together when the source has no count —
  never 0/0/0) and `voted_at`. `VoteSummary` in the contracts package gains the
  same optional fields; `getVotes` does not zod-parse, so nothing strips them.
  3 backend tests.
- **`utils/frontPage.ts`** (9 tests): `latestQuestions` — the latest counted
  vote on each of the last three questions of the day, grouped by title, so
  the page never chooses which decisions to show and never shows three votes
  on one bill. `searchMembers` (name or constituency, accents ignored),
  `sampleFaces` (random each visit), `voteTime` (Vilnius).
- **`LandingPage.tsx`** rewritten: search by name or constituency, twelve
  random faces (eight on phone), the last sitting day with three vote cards,
  the seat map, the three institutions, how we count, footer.
- **`SeimasMap`** gains `hideControls` (the front page states the encoding and
  has its own search; the legend stays).
- **`.hide-scrollbar`** defined in `index.css`. Two components used the class
  and nothing defined it.

## Non-partisanship on this page (§0, §1.3)

- Faces are drawn at random on every visit; nobody is featured.
- Example searches are constituencies, never people.
- Vote cards follow a fixed rule (above). A vote without a published count is
  left out, not drawn as 0.
- No scores, ranks or results labels about people.

## Rendered-surface audit (§1.7)

Desktop and 390 px phone, dark and light. Found and fixed before showing:
fourteen faces wrapping to an orphan row; the vote heading wrapping to three
lines; the seat map's own search box duplicating the page's; the seat hint
saying a click reveals the name (it opens the profile; hover or first tap
reveals); the phone placeholder truncated; a visible scrollbar under the
phone nav; the Vyriausybė card promising „kas ir nuo kada" when 42 of 44
ministers have no start date of their own — now „kiekvienas su paskyrimo
dekretu".

## Deploy coupling (§3)

One commit, both sides. The new fields are optional, so the old frontend
ignores them. Until Render finishes, the new frontend sees no counts and the
vote section shows its empty line („Šios dienos balsavimų rezultatų
neturime.") — minutes, then verify on production.

## LT-COPY inventory (all `// LT-COPY: needs native review`)

- Nav: „Kas mane atstovauja", „Ką nusprendė", „Seimo sudėtis", „Kas valdo",
  „Kaip skaičiuojame".
- „Duomenys iki {data}"; h1 „Ką Seimas iš tikrųjų padarė".
- „Raskite savo Seimo narį ir pažiūrėkite, kaip jis balsavo. Kiekvienas
  skaičius turi šaltinį. Vertinimų nerašome." — **flag:** „jis" follows the
  grammatical gender of „Seimo narys"; a native reader should say whether a
  neutral phrasing reads better.
- Search: „Pavardė arba apygarda", „Sąrašo įkelti nepavyko", „Nieko neradome.
  Bandykite pavardę arba apygardos pavadinimą.", „Pabandykite:",
  „{apygarda} apygarda (Nr. N)", „Pagal partijos sąrašą".
- „Visi {N} Seimo nariai →", „Visi balsavimai →", „Frakcijos →".
- „Paskutinis posėdis: {data}"; „{N} balsavimų. Bent kartą balsavo {n} iš {N}
  Seimo narių. Žemiau — paskutiniai trys klausimai, dėl kurių tą dieną
  balsuota."; „Šios dienos balsavimų rezultatų neturime."; „Kas kaip
  balsavo →"; „Be pavadinimo".
- „{N} vieta. Kas kur sėdi."; „Kiekvienas taškas — vienas Seimo narys. Spalva
  rodo frakciją. Užveskite pelę arba palieskite tašką — pamatysite, kas ten
  sėdi."
- „Trys institucijos, vienas kelias"; „Įstatymą priima Seimas, pasirašo arba
  grąžina Prezidentas, vykdo Vyriausybė."; the three door texts.
- „Be balų ir reitingų" / „Rodome, kas padaryta. Kas geriau, sprendžiate
  jūs."; „Kiekvienas skaičius su šaltiniu" / „Prie rodiklio parašyta, iš kur
  jis ir kaip skaičiuojamas."; „Klaidas taisome viešai" / „Pataisymų sąrašas
  atviras, su datomis."
- Footer: „Atviras Seimas — nepriklausomas projektas, ne Lietuvos Respublikos
  Seimo svetainė."

## Open

- Portraits are the VRK originals, about 450 kB each; the front page loads
  twelve. Not resized.
- The other pages still have the old look.
