# Evidence-first profiles — §2.1 recon

**Status: awaiting review. No implementation started.**

Branch `feat/evidence-first-profiles`, cut from `main` at `fce625d` —
after the `/api/mps` resolver fix was merged and deployed, per the gate.

## The recon table

Reachability is computed from the import graph out of `main.jsx`, not by
grep, because grep has already missed dead files twice on this project.

| # | Surface | File | How the composite is used | Proposed replacement |
| --- | --- | --- | --- | --- |
| 1 | MP profile — score block | `components/MpProfileCard.tsx:104` | Renders `forensicBreakdown.finalIntegrityScore` as „Galutinis vientisumo balas" (currently 100 for most) | Delete the block. Formula → methodology page. |
| 2 | MP profile — header bar | `views/MpProfileView.tsx:193` → `components/IntegrityBar.tsx` | `readMpDimension(profile,'integrity')` drawn as „Skaidrumo indeksas" | Delete from header. Four dials replace it (see conflict A). |
| 3 | Leaderboard grid | `views/StebsenaView.tsx` | Renders `integrity` as one of six sortable dimension columns | Drop the `integrity` column; keep per-dimension sorting with the NULL group (§2.3). |
| 4 | Transparency hub — index list | `views/SkaidrumasHubView.tsx:417` | `{item.integrity_score}` from `/api/accountability/heroes-villains` | Replace with the dimension the row is actually about, or remove the column. |
| 5 | Transparency hub — watchlist | `views/SkaidrumasHubView.tsx:449` | Same endpoint, `risk_score`-ordered | Needs a decision — see conflict C. |
| 6 | API — per-MP | `backend/hero_engine.py:582,1352` | `final_integrity_score = clamp(100 + base_risk_penalty + total_forensic_adjustment)` | Keep computing; mark deprecated in schema (§2.4). |
| 7 | API — accountability | `backend/routes_forensics.py:155,186-187` | `integrity_score` computed *and* used as the sort key for „heroes" | See conflict C. |
| — | Android shell | `android-app/.../MainActivity.java` | No native views; the Capacitor shell loads the same React app | Nothing separate to change; 360px checks cover it. |
| — | OG / print metadata | `index.html`, `MainLayout.tsx` | No composite in either | No change. |
| — | `components/ForensicExplainer.tsx` | dead (no importer) | `finalIntegrityScore` | Leave; it is in the dead-code workstream. |

## Four conflicts — I need decisions before implementing

### A. There are six dimensions live, not four

`CIVIC_DIMENSION_ORDER` in `utils/mpLegacyDimensions.ts`:

```
attendance · partyLoyalty · experience · legislativeActivity · visibility · integrity
```

§2.2.3 names four: *legislative activity, experience, visibility, consistency*.
Three map cleanly. The other three do not:

- **`integrity`** is the composite itself — it dies, taking the count to five.
- **`consistency`** is not a live dimension name. The nearest is
  `partyLoyalty` („Partijos lojalumas"). If that is the intent, say so and
  I will rename it — but *renaming a published metric is itself a
  methodology change*, so it needs its own `methodology_versions` entry.
- **`attendance`** is not in your list of four, yet invariant 4 is about
  it and §2.2.4's trajectory strip plots it.

**Decision needed:** is the target four dials
(`legislativeActivity, experience, visibility, partyLoyalty`) with
attendance living only in the trajectory strip? Or five, with attendance
keeping a dial as well? I have not guessed.

### B. There is no composite-sorted leaderboard to remove

§2.3 says *"remove the composite-sorted leaderboard"*. The leaderboard is
ordered `ORDER BY display_name ASC` ([routes_heroes.py:129](Seimas.v2/backend/routes_heroes.py:129))
and `rank` is just the row's alphabetical position — it is not derived
from the composite at all.

So the §2.3 work reduces to: drop the `integrity` column, and add the
NULL-exclusion + „Nepakanka duomenų" group to the existing per-dimension
sorting. **Confirm that is the intent**, or tell me what you believed was
composite-sorted so I can find the surface you meant.

### C. `heroes-villains` is the real verdict machine, and §2 does not mention it

[routes_forensics.py:155](Seimas.v2/backend/routes_forensics.py:155) computes
`integrity_score = 100 - risk_score + attendance*0.15`, then sorts
members into **„heroes"** and a **„watchlist"** by it. This is a podium
and a wooden spoon, in an endpoint whose name says so out loud, feeding
two live panels on the transparency hub.

By §0's reasoning this is a stronger candidate for retirement than the
profile number — it is a ranked moral verdict on named people. But §2
never names it, so I will not act unilaterally.

**Decision needed:** does heroes-villains die, get re-framed as
signal-specific lists (e.g. „low attendance", „unusual amendment
timing"), or stay?

### D. The API ships an RPG morality layer

`/api/v2/heroes/leaderboard` returns, per MP:

```
alignment: "Lawful Good"   level: 3   xp: 4008   artifacts: [...]
```

**Nothing renders these** — I checked every reachable component. But they
ship in every response, so any third-party consumer sees a D&D morality
label attached to a named politician. That is the §0 problem in its
purest form and it is also gamification, which the redesign brief already
banned.

**Decision needed:** remove from the payload (a breaking API change,
needs the changelog note §2.4 mentions), or leave as dead weight?

## Retirement vs demote — my recommendation

**Demote, not retire**, for `final_integrity_score`.

The 14-day notice rule attaches to retirement. Demotion — the number
stops being headlined but stays computed, documented and available — is
the honest description of what §2.4 actually asks for: *"the composite
formula itself moves to the methodology page with its full published
formula"*. A metric that still exists and is still explained has not been
retired; it has stopped being the headline.

That also lets the change ship now rather than on 4 September, which
matters because it currently reads `100` for most members — a
suspiciously clean number that invites more trust than it has earned.

I would still add a `methodology_versions` entry (attendance-style:
`announced_at` = today, `effective_from` = today) recording the
presentation change, so the governance trail exists either way. If you
want retirement instead, say so and the 14-day clock starts.

## What I have not done

No implementation, no file changes beyond this document. Awaiting
decisions on A–D.
