# `current_party` held two facts — faction and nomination

2026-09-04. Recorded because the fix changes a published value, and because the
way it hid is worth keeping.

## What was wrong

`politicians.current_party` was built as a fallback chain:

```python
party = iškėlusi_partija or 'Unknown'      # who NOMINATED the member
if faction_resolvable:
    party = faction_name                    # the parliamentary group
```

Two different facts in one column. When resolution succeeded you got the
faction; when it failed you got the nominating party — rendered identically,
with nothing to tell a reader which they were looking at.

The production symptom was 13 distinct values among 148 members where the
Seimas has 7 groups:

```
48  Lietuvos socialdemokratų partijos frakcija     <- faction
 7  Lietuvos socialdemokratų partija               <- nominating party
```

I had this filed for weeks as a **spelling-variant** problem and was one step
from "fixing" it by merging near-identical strings. That would have been wrong
in the worst way: the surface would have looked consistent while still
conflating two facts, and the evidence that anything was off would have been
destroyed. `partyColors.ts` even carried a comment warning against exactly that
merge — correctly — while the real defect sat upstream in the ingest.

## Why resolution failed

The ingest matched one role string:

```python
if "frakcijos nar" in role_norm:      # Frakcijos narys / narė
```

LRS also uses **Frakcijos seniūnas/seniūnė** (faction leader) and **Frakcijos
seniūno pavaduotojas/pavaduotoja** (deputy). Neither contains `frakcijos nar`.

So the members who fell through were not a random 10 — they were the faction
**leaders and their deputies**. The people most unambiguously identified with a
faction were the ones displayed under the party that nominated them.

`padalinio_tipas` could not rescue it: verified against `p2b.ad_seimo_nariai`
on 2026-09-04, that attribute is empty on every `Pareigos` row in the live
feed, so the branch testing it never fired either.

Role counts on faction departments, from the live source:

| Role | Rows |
| --- | --- |
| Frakcijos narys / narė | 136 |
| Frakcijos seniūno pavaduotojas / -a | 33 |
| Frakcijos seniūnas / seniūnė | 13 |

## The rule now

Match the **department name**, and skip roles carrying a `data_iki`:

- 139 of 140 active members resolve, into **7 groups**.
- No member has more than one current faction role, so the rule is unambiguous.
- `„Mišri Seimo narių grupė"` counts: it is a parliamentary group and does not
  contain the word *frakcija*.
- The umbrella node `„Seimo frakcijos"` is excluded — it is a container.
- Internal whitespace is collapsed: the factions feed itself spells one name
  `„Liberalų  sąjūdžio frakcija"` with a double space, and two entries differing
  only by whitespace would render as two factions.

The `data_iki` check is load-bearing. Without it the Speaker keeps the faction
he left.

## The 140th member

**Juozas Olekas**, the current Seimo Pirmininkas. The source records his faction
membership as ending **2025-09-10** while his mandate continues — the Speaker
steps out of their faction.

He has no faction. That is a real state, not a lookup failure, and it now
renders as unknown. Previously it rendered as „Lietuvos socialdemokratų
partija" — who nominated him, and not a group he sits in.

`nominating_party` (migration 039) keeps the fact the old column destroyed.

## Placeholders removed

Three read paths turned the new NULL into the literal string `Unknown` —
English, on a Lithuanian surface, inside public payloads:

- `hero_engine.py` — the profile query and the list query, both
  `COALESCE(NULLIF(current_party, ''), 'Unknown')`. Same failure class as
  `COALESCE(metric, 0)`: an unknown wearing a label that looks like an answer.
- `graph.py` — the MP node in `/api/v2/openplanter/graph`. The party-node and
  `belongs_to` queries beside it already filtered NULL out correctly, so this
  was the only leak.

`FactionsView` had the mirror-image bug: it filtered the no-faction group out of
the chart entirely, so the member vanished and the bar summed to less than the
chamber. The group is now shown and the counts add to 140.

The label is „Frakcija nenurodyta", deliberately not „nepriklauso frakcijai" —
the latter asserts non-membership, true of the Speaker but an over-claim the
first time resolution fails for another reason.

## Deploy note

The migration and the ingest were run against production **before** the code
shipped, so for one deploy cycle `/api/v2/heroes` served `party: "Unknown"` for
the Speaker. My error. The ordering is code first, then data. The window was
visible rather than silent, and the value it replaced was itself wrong, so
nothing was lost — but the ordering is the lesson.

A second lesson from verifying the fix: the first production read after the
deploy still showed „Unknown", and I nearly chased it as a defect. It was a
browser tab that had loaded before the deploy. Re-check in a fresh tab before
believing a rendered surface.

## Verification (production, after both deploys)

```
distinct groups among active members: 8  (was 13)
  52  Lietuvos socialdemokratų partijos frakcija
  28  Tėvynės sąjungos-Lietuvos krikščionių demokratų frakcija
  18  „Nemuno aušros“ frakcija
  13  Demokratų frakcija „Vardan Lietuvos“
  11  Liberalų sąjūdžio frakcija
   9  Lietuvos valstiečių, žaliųjų ir Krikščioniškų šeimų sąjungos frakcija
   8  Mišri Seimo narių grupė
   1  <NULL — no faction>
```

Sums to 140. `nominating_party` populated on 148 of 148. `/api/mps?status=active`
serves `party: null` for the Speaker and no `"Unknown"` anywhere. The factions
page renders „Frakcija nenurodyta" with the group present in the legend.

Tests: 7 for the resolver, 5 for the label, 1 guard asserting no read path
coalesces `current_party` to a placeholder.

## LT-COPY

| File | String |
| --- | --- |
| `dashboard/src/utils/faction.ts` | `NO_FACTION_LT` — „Frakcija nenurodyta" |
