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

## Testing upgrade (2026-09-04)

Three defects in this session were found only by opening a page. The suites were
green through all of them, and the reason is the same each time: every fixture in
the suite was **written by hand**, and nobody hand-writes the awkward case.
`provenanceContract.test.ts` already went through `parse` correctly — and still
could not have caught this, because its payload says `party: "P"`.

Two layers were added, both working from evidence rather than imagination.

**`contracts/wire-nullability.json`** — every payload path the backend may send
as null, declared once with a reason, read by both suites.

**`contracts/fixtures/heroes-*.json`** — real payloads captured from production
by `scripts/refresh_wire_fixtures.py`, for members chosen by awkward *property*
rather than by name: no faction, former member, suppressed attendance, and one
ordinary member as a control. Selecting by property means the set survives the
Speaker changing or a member leaving.

| Layer | File | Catches |
| --- | --- | --- |
| Python | `tests/test_wire_contract.py` | A null in a real payload the contract does not declare — a widening someone forgot to write down. Also stale declarations naming fields that no longer exist. |
| TypeScript | `dashboard/src/services/wireContract.test.ts` | A declared null the zod schema still rejects. Parses each real payload as-is, then nulls each declared path in turn. |

Both were verified by reintroducing the two shipped bugs. Restoring
`party: z.string().optional()` and `independent_voting_days_pct: z.number()`
fails **12 tests**, including three real payloads that no longer parse at all.
Removing `mp.party` from the contract fails the Python layer. A guard nobody has
watched fail is not a guard.

One honest gap: if a backend field becomes nullable and nobody refreshes the
fixtures, the Python layer has nothing new to notice. Refreshing is one command
and the daily sync could run it, but that loop is not wired yet — and pretending
otherwise would repeat the mistake of trusting a green suite.

### Closing the staleness gap

The layers above still sampled: fixtures are captured from real members, so a
field that goes null only under conditions no current member is in stays
invisible until someone refreshes them. That is a gap that quietly widens.

`tests/test_degraded_payload.py` closes it by exploring the null-space instead
of sampling it. It hands the real `calculate_hero_profile` a cursor that finds
the member and nothing else, which is what a fresh database, a failed backfill
or an unrefreshed materialized view actually look like. **No database, no
network** — it runs on every `pytest` and cannot go stale.

The degradation is modelled honestly: `id`, `display_name` and
`full_name_normalized` are NOT NULL in the schema, so the member row exists.
A payload in which a member has no name would be a fantasy, and declaring
`mp.name` nullable to satisfy it would weaken a real contract.

It found a live-adjacent defect immediately. The degraded payload **did not
parse**: `mp.active` and `mp.photo` derive from `is_active` and `photo_url`,
both nullable columns, and the schema demanded a boolean and a string. No row
has either null today — which is precisely why no hand-written fixture ever
tried it, and why one such row would have blanked that member's profile with
the suites green.

The generated payload is committed as `contracts/fixtures/heroes-degraded.json`
and compared against a fresh build, so a change in payload shape fails the
Python suite instead of surprising the client. Four guards-on-the-guard keep the
check from rotting into a no-op: the fixture set must exist, must contain more
nulls than the ordinary member carries, must stay actually degraded (≥10 null
paths), and every declaration must carry a reason.

Sixteen paths are now declared, against nine derived from real members.

### Extending the guard to every validated endpoint

The degraded-payload check initially covered only the profile. The same class
could bite anywhere the client parses a response, so it now covers all four
schemas — `mpProfileSchema`, `mpActivitySchema`, `mpDiarySchema`,
`factionAlignmentSchema` — across seven generated payloads.

Two degradation modes are generated per route, because they mean different
things and the routes branch on them:

- **table absent** — a fresh database, a migration not applied. Several routes
  return an explicit „we cannot tell" shape.
- **table present but empty** — a failed backfill, an unrefreshed matview. More
  dangerous, because the route takes its normal path and produces a
  real-shaped payload full of holes.

`test_absent_and_empty_are_different_payloads` asserts the two are not
identical, which is charter §1.2 checked at the endpoint rather than in a
comment.

**It found the asymmetry it was built to find.** `/api/mps/{id}/activity`
guarded `mp_travel` and `mp_assistants` with `to_regclass` but queried
`speeches` unguarded — so an absent table meant a 500 there and a clean
degradation beside it, and `press_releases: []` could not be told apart from
„we cannot see the table". The function's own comment already stated the rule
it was breaking. Fixed in three places: the route now guards and returns null,
the schema accepts it, and `MpActivityPanel` grew the same three-way branch
travel already had (it did `press.length` and would have thrown on null).

#### Getting the stub honest

Two false findings came out of the first version, both worth recording because
a test that invents bugs is worse than no test:

1. Returning `None` for a `SELECT count(*)` made faction-alignment look like it
   raised on an empty database. Real Postgres returns one row of zeros for an
   aggregate over nothing, so the crash could not happen.
2. The fix disqualified any query containing `GROUP BY` — which matched a
   `GROUP BY` in an unrelated **subquery** and reinstated the same false alarm.

The heuristic now inspects only the select list before the first `FROM`, and is
deliberately biased toward false negatives: a missed crash is a gap, an invented
one sends someone chasing a bug that cannot happen.

The stub also honours the three columns `politicians` marks `NOT NULL`. A
payload where a member has no name is a fantasy, and declaring `mp.name`
nullable to satisfy it would weaken a real contract to make a test pass.

Verified by reverting the `press_releases` schema fix: exactly one test fails,
naming the fixture and the reason.
