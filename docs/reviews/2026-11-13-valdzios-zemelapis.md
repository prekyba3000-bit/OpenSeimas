# Valdžios žemėlapis — President, Government and ministers joined to the Seimas

2026-11-13. Request from the human: connect the Government, the full cabinet
and the President to the project, and make it visually plain that the
President works at the top of foreign affairs, with every ministry laid out so
a reader finds the patterns unaided. Design note and review record in one.

## Recon (§1.8)

- No table, route or component knew anything outside the Seimas. `politicians`
  holds Seimas members only; `committee_memberships` has no public route.
- `apps.lrs.lt` is still unreachable, so nothing here depends on it.
- Reality differed from what I would have written from memory: the Government
  in office is the **XXI**, Prime Minister Mindaugas Sinkevičius, at work since
  2026-07-14. It is the **third** Government of this Seimas term. Nothing on
  the page is stated from memory for that reason.

## Sources, and what was verified against what (§1.9)

| Fact | Primary source | Cross-check |
|---|---|---|
| XXI cabinet, 14 ministers | Decree 1K-737, 2026-07-07 (read as image; scanned PDF) | lrv.lt „Ministrų kabinetas" — identical |
| XX cabinet | Decree 1K-434 as reworded by 1K-446, 2025-09-25 | lrv.lt „Ankstesnės Vyriausybės" — identical |
| XX replacements (culture, defence) | Decree 1K-486, 2025-11-10 | lrv.lt gives 2025-11-11 as the start |
| XIX cabinet | Decree 1K-173 as reworded by 1K-178, 2024-12-11 | lrv.lt — identical bar one spelling, below |
| PM appointments, resignations | Decrees 1K-156, 1K-428, 1K-733; 1K-426, 1K-728 by title and number | lrv.lt |
| President's powers | lrp.lt „Prezidento funkcijos", which quotes Constitution ch. VI | — |
| How ministers are appointed | lrv.lt „Ministrų kabinetas" | Constitution art. 84 as quoted on lrp.lt |

**One spelling conflict.** lrv.lt prints the XIX interior minister as
„Vladislavas Kondratovičius" and the XX one as „Vladislav Kondratovič". Both
decrees print „Vladislav Kondratovič". The register follows the decrees.

**The President's own site supports the framing asked for.** lrp.lt:
„Prezidentas didžiausius įgaliojimus turi užsienio politikos srityje". The
page shows that by position — the President sits only in the first row, beside
Foreign Affairs and Defence — and also states the powers that reach every row
(signing or vetoing laws, nominating judges), because a "higher-level foreign
minister" alone would misdescribe the office.

## Minister ↔ Seimas member: linked only on evidence

Sixteen cabinet names match a current member's name exactly. A name is not an
identity (the same reason `link_vrk.py` was held back on 2026-09-06), so a link
is stored only where the minister's **official CV** says they are a member:

Savickas, Kaunas, Kukuraitis, Popovienė, Tamašunienė, Katelynas, Mažeika —
seven people, twelve rows. Each row keeps the CV URL (`mp_link_source_url`).
The link is by `seimas_mp_id`, resolved at read time.

**Left unlinked on purpose** (exact-name match, no official confirmation
found): Inga Ruginienė (her ministry CV does not mention the Seimas), and from
earlier cabinets Šakalienė, Aleknavičienė, Zailskienė, Paluckas, Birutis,
Sabutis. The page says an absent mark does not mean "not a member". When
lrs.lt is reachable again its member pages can settle these seven.

## What was built

- `migrations/050_offices_held.sql` — `ministries`, `governments`,
  `offices_held`; 48 rows of office, each with the decree that names the person.
  Additive only. A CHECK forbids a member link without its source.
- `GET /api/government` — the register as one payload. Absent table →
  `available: false`, not an empty cabinet.
- `/dashboard/valdzia` („Valdžia" in the main menu): three institutions; two
  step strips; the map (areas × President × ministries); the three cabinets
  side by side, where pressing a name highlights every office that person held
  and a left bar marks a post kept from the previous Government.
- Sources page lists lrp.lt / lrv.lt.

## Charter check

- **§1.3 no verdicts.** Nothing is counted, scored or ranked. Test asserts the
  DDL has no metric-shaped column. No party is shown: decrees do not state one,
  and a coalition agreement was not read.
- **§1.1 unknown as unknown.** Missing ministry row → „Ministro įrašo neturime".
  Missing member link → no mark, and the legend says what that means.
- **§1.4** one register, one route, one reader.
- **§1.5** no published metric changed; no methodology entry needed.
- **§1.7** rendered at 1360 px and 390 px against a local API with the real
  register. Found and fixed by eye: „ir Seimo narys" on a woman's tile.

## Not done, and why

- **Numbers from the Constitution** (ten days to sign, votes to override a
  veto, who may propose a law). I could not fetch the Constitution's text from
  an official host today, so the page states only what lrp.lt and lrv.lt state.
- **Seimas committees on the map.** No verified committee list in the data.
- **Party of each minister.** Not in any source read.
- **Government-submitted bills and vetoed laws** (steps 2 and 3). The decree
  register for the term was read (titles, dates, numbers); vetoes are
  identifiable by title. Not ingested yet.
- **Keeping it current.** The register is a hand-seeded migration. A change of
  minister needs a new migration until a decree ingest exists.
- Production gets migration 050 on the next daily sync (06:00). Until then the
  page says it has no data.

## LT-COPY inventory (all need native review)

Every string in `dashboard/src/views/ValdziaView.tsx` and the `AREAS` titles,
hints and President lines in `dashboard/src/utils/valdzia.ts`; the new entry
in `SourcesView.tsx`; nav label „Valdžia". Statements about powers follow
lrp.lt and lrv.lt wording closely; the rest is mine.

## Suites

Dashboard **471** (was 455). Backend **469 passed, 1 skipped** (six new). The
previous RESUME entry says 472 backend; that figure does not reconcile with
today's run minus the six new tests and was probably miscounted by me.
