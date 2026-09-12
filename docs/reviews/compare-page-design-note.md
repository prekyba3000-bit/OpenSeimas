# Compare page — design note

2026-09-12. Written before any further code, because the risk here is not
that the page is missing. **It is live, and it is a verdict machine.**

The charter (P6) and the torch-pass treat this as the largest unbuilt
product, with `contextBand` shelved awaiting it. Recon of the tree on
`main` at `f8eef7f` says otherwise: `/dashboard/compare` has been shipping
a pairwise „Suderinamumo balas" to production. The unbuilt piece is the
*honourable* compare — not the route.

This note maps what is actually there, names the failure class, and
proposes three ways to rebuild. No implementation until a human picks.

---

## Recon (what is actually live)

### The picker (`ComparisonView.tsx`)

A two-column member picker on `/dashboard/compare` (nav label
„Palyginimas"). It loads `GET /api/mps?status=active` and excludes the
other column's selection. Keyboard access was repaired 2026-09-08
(triggers are buttons; Escape closes; the exit animation that left a
hidden 140-option listbox in the tree was removed). A centred **VS**
badge sits between the two names.

The UI never offers a third or fourth member. The empty state invites
the reader to „analizuotumėte jų balsavimo suderinamumą".

### The API (`GET /api/mps/compare`)

`backend/routes_public.py` `compare_mps`. Query string `ids=a,b[,c,d]`.
Allows 2–4 UUIDs; 400 below 2 or above 4; 404 if any id is missing.

Returned shape (no Pydantic model, no zod parse on the client — a
TypeScript interface only):

```
{ mps, alignment_matrix, divergent_votes }
```

**Alignment.** For every pair, `COUNT(*)` of votes where **both** rows
have `vote_choice IS NOT NULL`, and `SUM` of equal choices. Ratio
`agreed / total`, three decimals. If `total` is 0: **`alignment = 0`**.
Diagonal is `1.0`.

That predicate is **not** `_CHOICE_RECORDED` (the single participation
predicate the profile and leaderboard now share). Compare uses a looser
`IS NOT NULL`. Same class as the list/profile disagreement: two
definitions of „took part" will eventually disagree about the same two
people.

**Divergences.** Distinct votes where any two of the requested members
recorded different non-null choices, newest 10, titles clipped at 80
characters with `"..."`. Per-vote choices are a map of id → raw
`vote_choice`. No coverage count of how many overlapping recorded
votes exist in total. No status for a missing choice on that vote
(the map is only the requested members' rows; a null in the render
path would print as empty).

N+1: one query per matrix cell, plus one per divergent vote. Untested:
`Seimas.v2/tests/` has **zero** references to this route.

### What the page does with that payload

`AlignmentScore` takes `alignment_matrix[0][1]`, multiplies by 100, and
paints it:

- ≥ 80 → `text-vote-for` (the colour of a „Už")
- ≥ 50 → secondary
- < 50 → `text-destructive`

Label: **„Suderinamumo balas"**. Body: **„Didesnis balas reiškia
stipresnį politinį suderinamumą."** A 120px ring, the percentage in
`text-5xl`. Then up to ten „Naujausi skirtumai". If that list is empty,
the card is omitted entirely — agreement and „we found no rows" are
indistinguishable.

`noVerdictsOnSurfaces.test.ts` **exempts** this surface by basename:

```
const DEAD = /AlignmentScore|MpSelector|Header\.tsx/;
```

The guard that exists to stop a new composite appearing does not look
at the one already on the compare page. `test_no_verdicts_on_the_wire.py`
does not mention `alignment_matrix`. Static-data forbidden keys include
`/score$/i` — they never ran against this JSON because it is not a
file in `public/`.

### `contextBand` (built, unused by any view)

`dashboard/src/utils/contextBand.ts`, covered by
`contextBand.test.ts`. It does not rank. Given a member's number and a
peer list it returns `{ percentile, population }` or `null`.

Rules already in the helper, which this page must not weaken:

1. A member with no publishable figure → `null` (unknown, not 0).
2. Null peers are dropped from the **population**, not treated as zero.
3. Fewer than **10** comparable peers → `null`.
4. `bandFromProfiles` reads through `readMpDimension` so a dial and a
   band cannot disagree about the same member.

Labels (working copy, already on the LT worksheet §8) are comparative
verbs: „Dalyvauja dažniau nei *p* % kolegų (iš *n*)". „Patyrusesnis"
and „Aktyvesnis teisėkūroje" read as *better*, not as *more of a
measured quantity*. That is a copy problem even before layout.

No view imports the helper except its test. Stebėsena already loads
the full leaderboard (the ≥10-peer set). The compare page currently
loads only the active roster summary, which is not enough to band the
five dimensions.

### Nearby surfaces (so this page does not duplicate them)

| Surface | What it already does |
| --- | --- |
| MP profile | Five dials, denominators, „Kaip skaičiuojama?" drawers. No band. |
| Stebėsena | Chamber table, default name order, dimension sort with a labelled NULL group. Trophy icon still in the file. This is already the place a hostile reader goes to rank. |
| Topic chips on a profile | How *one* member voted on a subject, as 27/86, no stance %. |
| `Header.tsx` | Dead (Storybook only). English „ANALYZE" / hash routes. Not in `main.jsx`. |

---

## The thing this must not become

**A score about two named people.** „Suderinamumo balas 87 %" with a
green ring is the same failure class as `final_integrity_score` and
the wiki `risk_level`: an aggregation that a reader completes as a
verdict. Colouring it with the vote-for / vote-against palette tells
them agreement is virtue. The copy says so in words.

Charter §1.3: no score, rank, grade, or label about a named person on
any public surface **or API payload**. A pairwise percentage is a
score about two named people. Shipping it as `alignment_matrix` is
the payload half of the same rule.

Worse than a leftover RPG key, because this one **is** rendered, and
the surface guard was written to look away.

Secondary failures, same family:

- **`total = 0` → `0`.** Unknown overlap rendered as 0 % compatibility.
  Charter §1.1. Same disease as `COALESCE(metric, 0)`.
- **Clipped titles** on the only evidence list. A hostile reader cannot
  check the vote from the row.
- **VS** as chrome. The page's job becomes a match, not a library.
- **Side-by-side percentiles** (if we naively drop `contextBand` onto
  this layout). „80 % of colleagues" next to „40 % of colleagues"
  under two photographs *is* a ranking. The helper's comment is true
  in isolation and false on a VS page.

Comparing two people is allowed. **Declaring a winner, a grade, or a
compatibility** is not.

---

## What it can honourably be

Two different reader questions have been stuffed into one route:

1. **„How did these two vote on the same questions?"** Evidence. Unique
   to this page. The topic chips cannot do it; the profile cannot do it
   for a pair.
2. **„Where does this number sit among colleagues?"** Context. That is
   `contextBand`. It needs ≥10 publishable peers, which this picker
   does not load, and it is about *one* member and a population, not
   two members and each other.

Honourable compare answers (1) with facts that have denominators, and
refuses to turn those facts into a ring. (2) belongs either on the
profile dial (peers can be the leaderboard already fetched by
Stebėsena) or in a *one-person* „among colleagues" mode that never
puts two percentiles on the same row.

A useful compare page looks like the topic chips, doubled: **M of N**
overlapping recorded choices matched; the other N−M are listed, each
a vote with two actual choices and a link. No colour scale. No
„political compatibility". If N is 0, the page says there is nothing
to compare — never 0 %.

It does not say they are allies. Matching on „susilaikė" is a recorded
sameness, not a friendship.

---

## Three approaches

### A — Retire the score; keep pairwise vote evidence (recommended)

Remove `alignment_matrix` from the public payload and delete
`AlignmentScore`. Keep two pickers. Serve, for the pair:

- `overlap_n` — votes where **both** satisfy `_CHOICE_RECORDED`
  (one predicate; §1.4).
- `same_choice_n` — of those, equal recorded choice.
- `missing` / `unpublished` kept distinct from „chose differently"
  (a vote where one recorded a choice and the other did not is **not**
  a divergence of position; it is a coverage fact).
- A list of divergences (different recorded choices), newest first,
  **unclipped titles**, each row linking to the vote page. The list
  states its own cap („10 of D", or paginate).
- If `overlap_n = 0`: unknown state, no number.

Do **not** print `same_choice_n / overlap_n` as a percentage on this
page. 87/100 and 87 % are the same screenshot. Print the two counts
and the sentence that they are not a participation rate and not a
stance (the topic-chip copy already solved this).

`contextBand` does **not** go on this layout. Putting it next to two
names recreates the podium. The helper's home under this approach is
the profile dial drawer (or a caption under each dial), where the
population is the chamber and the second person is not on screen.
That **deviates from charter P6's „compare page is its home"** on
purpose: recon found the compare page is already the most
rank-shaped surface we have. Stebėsena already has the peer set.

**Why this one:** it is the smallest change that stops the live
verdict, it is the only compare the data actually supports, and it
does not open a second ranking next to Stebėsena.

### B — One person among colleagues (make compare the band's home)

Replace the VS picker with a single member (or keep two pickers but
only ever *render* one at a time). Load the leaderboard (or a thin
peer-values endpoint that is the same resolver). For each of the five
dimensions, show the existing dial plus `contextBandLabel` when the
helper returns non-null; otherwise the same unknown reason the dial
already uses (`NO_FACTION_NO_FIGURE_LT`, `NEVER_TOOK_SEAT_NO_FIGURE_LT`,
attendance suppression).

No pairwise votes. No matrix. The live score goes away.

**Cost:** we lose the one thing a compare route is for — two people's
shared votes. A reader who came to see Šimonytė vs. their district
member gets a percentile instead. Also: percentile 0 and ~99 remain
screenshotable as last and first; the helper does not bucket. If we
take B we should coarsen the label (e.g. thirds, with population) so
nobody is „the 0 %".

**When B is right:** if the human's goal is specifically to land
`contextBand` and they are willing to move pairwise votes to a later
page.

### C — Two people, five dials each, bands under both

The tempting product. Two photographs, ten numbers, two bands per
dimension. Readers will subtract. Even with identical type and no
chevron, it is a ranking with extra steps — the same reason the diary
note refused a meeting count.

Reject unless the human explicitly accepts a subtractable layout. If
forced, the non-negotiables are: no winner chrome, no colour by
magnitude, no delta row, no `alignment_matrix`, unknown stays unknown,
and a guard that the page does not compute `a - b` or `a > b` on
named members' dimensions.

---

## Recommendation

**A**, plus a later, separate decision on where `contextBand` is shown
(profile drawer vs. a one-person mode). Do not implement C. Do not
leave the current ring up while we „add bands around it".

Treat the live score as a production defect that reached readers, in
the same series as the share card and the wiki risk labels. When A
ships: a corrections entry (plain, no names of who was compared),
drop `alignment_matrix` from the wire, delete the `DEAD` exemption
for `AlignmentScore`, and extend the wire-verdict guard so a pairwise
score cannot return by renaming.

Wire-shape change: backend and frontend in one quiet-hour pair of
deploys, verified on the live page (not only the suite). The current
client will not schema-fail if the matrix is missing — it has no
zod — so a backend-first deploy would throw at `matrix[0][1]` until
the frontend lands. **Ship the client that stops reading the field
first, then remove it from the API** (same two-step used for
`total_forensic_adjustment`).

---

## Open decisions (do not pick silently)

1. **A, B, or C.** Recommendation is A.
2. **May the page show `same / overlap` as a percentage at all?**
   Recommendation: no. Counts only.
3. **Where does `contextBand` render?** Profile dial vs. one-person
   compare mode vs. never on a two-person screen. Recommendation:
   not on a two-person screen; profile drawer is enough and already
   has the methodology habit.
4. **Coarsen percentiles** (thirds) before any surface uses them?
   Recommendation: yes, if they go on a public page at all.
   „Dažniau nei 80 %" is already a podium in a sentence.
5. **Corrections entry** for the live compatibility score?
   Recommendation: yes, when it is removed. It is the same disease
   the log already names.
6. **Two members only**, even though the API allows four. Four people
   make a matrix; a matrix is a ranking. Recommendation: 400 if more
   than two, to match the honourable UI.
7. **Copy of the Priėmimas-style gloss** does not apply here; all new
   LT is working copy (`LT-COPY`) and waits on the same native pass
   as the worksheet. The current `comparisonView.*` strings are live
   and unreviewed.

Not in scope for this page: Stebėsena's remaining trophy/rank chrome;
Android deep-links; publishing summaries; legal name; dead `ui/`.

---

## If A is chosen — implementation shape (still not this commit)

1. Recon of production: curl two known members, confirm the ring
   still serves, record the payload. Read-only.
2. Tests first: overlap uses `_CHOICE_RECORDED`; `overlap_n = 0`
   returns nulls not zeros; a vote with one null choice is not a
   divergence; titles are not clipped; `alignment_matrix` absent;
   surface guard no longer exempts `AlignmentScore`; no
   `100 - x` / `a > b` on dimension fields in `ComparisonView`.
3. Client that stops rendering the ring, then API that stops sending
   it.
4. Methodology note for the overlap counts (what `_CHOICE_RECORDED`
   includes, that matching abstentions count as same choice, that
   this is not faction loyalty and not a stance).
5. Rendered-surface audit: empty overlap, one never-took-seat, one
   no-faction, a pair with no divergences in the cap, a pair with
   many, keyboard path, 360px.
6. RESUME + LT-COPY inventory.

STOP if the implementation starts highlighting which of the two
numbers is larger.

---

## Conflicts with earlier docs (repo wins)

- HANDOFF / RESUME (2026-09-08 tail) call this the largest *unbuilt*
  product. The route is built. The honourable version is not.
- `evidence-first-profiles.md` parked bands here because „no surface
  in §2 has ≥10 peers in view". Stebėsena does. The compare picker
  does not, until it fetches the leaderboard.
- Charter P6: compare is `contextBand`'s home. This note recommends
  moving that home rather than putting bands on a VS layout. If the
  human prefers to keep P6 literally, take **B**, not C.
