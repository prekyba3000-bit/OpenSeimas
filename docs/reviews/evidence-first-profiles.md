# Evidence-first profiles — §2.1 recon

**Status: decisions received; implementation in progress.**

| | |
| --- | --- |
| Branch | `feat/evidence-first-profiles`, green, pushed, **not merged** |
| Last commit | `3ca4a6b` |
| Tests | 122 backend · 182 dashboard |

⚠️ **The backend and frontend must deploy together.** `bd51a34` changes the
wire format (`attributes` → `dimensions`, composite and RPG fields removed);
`3ca4a6b` is the client that reads the new shape. Merging one without the
other blanks the three chamber-relative dials.

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

## Decisions received (2026-08-21)

**A** — Five dials: attendance, partyLoyalty, experience, legislativeActivity,
visibility. `integrity` dies. Attendance gets both a dial and the trajectory
strip, from the same resolver. `partyLoyalty` keeps its published name; its
drawer states what it measures (faction-line conformity) and what it does not.

**B** — Default `ORDER BY display_name ASC` stays; drop the integrity column;
user-sorted dimension columns exclude NULL rows into a labelled „Nepakanka
duomenų" group below. No 0.0 cell anywhere. Permanent fix for
corrections-instance #4.

**C** — Retire heroes-villains entirely. Replace the two hub panels with
„Naujausi patikrinti balsavimai" and „Pataisymai ir atsakymai". Standalone
corrections entry — different disease from the five-instance one.

**D** — Remove the RPG layer *and* `risk_score` / `integrity` from public
responses. Rule: the public API ships evidence and descriptive dimensions;
verdicts ship nowhere.

**Retirement vs demote** — demote, as recommended. Formula to the methodology
page, `methodology_versions` entry for the trail, ship now. Methodology note
acknowledges the calibration defect (the composite reads 100 for most members).

### A note on where D and A met

Three of the five dials read from the RPG `attributes` block, so deleting it
outright would have broken decision A. D also says the API *should* ship
descriptive dimensions — so the block was **renamed, not removed**:
`STR/WIS/CHA` → `legislative_activity` / `experience` / `visibility`. Two
fields went with the rename: `INT` (the composite) and `STA`
(`score_consistency(attendance, amendments)` — a second aggregation that no
surface ever rendered).

## Done so far

| Commit | What |
| --- | --- |
| `bd51a34` | **D + C (backend).** RPG layer off the wire; composite behind a `public_breakdown()` boundary; `/api/accountability/heroes-villains` retired with a tombstone; bulk leaderboard stops sorting by `(level, xp)`. 6 new tests. |
| `3ca4a6b` | **A (client).** Five dimensions; `integrity` removed from the type, the labels, the order, the profile header, the profile card and the leaderboard column; `IntegrityBar` deleted; gamification types removed. |

## Still to do

1. §2.2 — profile restructure: identity + mandate, recent record, the five
   dials with denominator + coverage + „Kaip skaičiuojama?" drawer, the
   attendance trajectory strip (gaps render as gaps), corrections & replies.
   Needs a backend addition for per-month attendance.
2. §2.3 — leaderboard „Nepakanka duomenų" group; context bands.
3. C (frontend) — replace the two hub panels.
4. Methodology page: composite formula, plain-language explanation, calibration
   note; `methodology_versions` entry.
5. Standalone corrections-log entry for the verdict machine.
6. §3 tests 1–7, including the import-graph guard and 360px checks.
7. §4 verification + screenshots.

## Original conflict analysis (retained for the record)

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

---

# Implementation report (§4)

Complete. Branch `feat/evidence-first-profiles`, 205 dashboard / 127
backend tests green, contrast report unchanged (no new colours).

## The recon table, closed

| # | Surface | What replaced the composite |
| --- | --- | --- |
| 1 | MP profile score block | Deleted; formula on the methodology page |
| 2 | MP profile header bar | Deleted with `IntegrityBar` |
| 3 | Leaderboard integrity column | Dropped; NULL rows lifted into „Nepakanka duomenų" |
| 4 | Hub index list | Panel removed — it was `100 − attendance` mislabelled |
| 5 | Hub watchlist | Replaced by „Pataisymai ir atsakymai" |
| 6 | API per-MP | Demoted behind `public_breakdown()` |
| 7 | API accountability | Endpoint retired, 404 |
| — | Android shell | No native views; 360px checks cover it |
| — | OG / print | Never carried a composite |

## What the verification pass found that the recon did not

**A composite invented in place.** „Skaidrumo indeksas" on the hub ranked
named members by `100 − attendance`, under a label naming a different
metric. It used none of the strings the audit searched for — it was found
by looking at the rendered page at 1400px. The §3.1 guard now also
asserts no surface computes `100 − <metric>`.

That is the second time this branch a defect was found by rendering
rather than grepping (the first: 31% of votes crashing two pages). Worth
recording as a method, not an anecdote.

## Deviations from §2, and why

| Spec | Shipped | Why |
| --- | --- | --- |
| „Four dimension dials" | Five | Decision A. `integrity` was the composite; attendance keeps a dial *and* the strip |
| „Remove composite-sorted leaderboard" | Dropped the column; kept alphabetical default | It was never composite-sorted — `ORDER BY display_name ASC`, rank was positional |
| Context bands on comparison surfaces | Helper built and tested; not yet placed on a surface | No surface in §2 asks for one that also has ≥10 comparable peers in view. Available for the compare page |

## Data limits stated on the page, not just in the code

- Attendance carries „iš 93 posėdžių dienų · 14 mėn. su duomenimis".
- Chamber-relative dials carry no invented denominator; their drawer says
  they are scored against the chamber maximum.
- Two of five dials render the unknown state — their ingests have not run.
- The trajectory strip shows 4 recess gaps and 3 thin months out of 21.

## `LT-COPY: needs native review`

Every string below is machine-written Lithuanian awaiting a native pass.

| File | Strings |
| --- | --- |
| `utils/dimensionExplainers.ts` | All 15 — formula, denominator and „ko nerodo" for each of the five dimensions |
| `utils/attendance.ts` | `ATTENDANCE_UNKNOWN_REASON_LT` |
| `utils/contextBand.ts` | The five band verbs + label template |
| `components/AttendanceTrajectory.tsx` | Panel heading, the „tarpai reiškia" note, tooltip and screen-reader phrasings |
| `components/VerifiedVotesPanel.tsx` | Heading, „Kiekvienas įrašas turi šaltinį", „Visi balsavimai" |
| `components/CorrectionsAndRepliesPanel.tsx` | Heading, „Ką mums pranešė ir ką ištaisėme", empty state |
| `views/MpProfileView.tsx` | „Penki atskiri rodikliai…", the attendance coverage template |
| `views/StebsenaView.tsx` | „Nepakanka duomenų" group header and its count phrasing |
| `views/MethodologyView.tsx` | The whole „Skaidrumo indeksas — kodėl jo neberodome" section |

Two published entries are **not** on this list and were written to be
read as-is: the `methodology_versions` row for `integrity_index` v2, and
the corrections-log entry `verdiktu-skelbimas`. Both are live.

## Governance

- `methodology_versions`: `integrity_index` v2, `announced_at =
  effective_from`, recording that demotion is a presentation change and
  the 14-day rule governs retirement.
- Corrections log: `verdiktu-skelbimas`, resolved. Opens „Skelbėme
  verdiktus apie konkrečius žmones. Tai buvo klaida" and says explicitly
  it was not a UI bug.
- `CHANGELOG.md`: the breaking API changes, including the `STA` line.


---

# Post-merge defect: the schema that stripped provenance

Found by the rendered-surface audit (§1.7) after the merge, not by any
test or grep. Diagnosed read-only before any change.

## The pairing rule held

First hypothesis was a deploy-pairing miss — the wire rename landing with
one side out of step would strand dials exactly as observed. Checked
before touching code:

| Check | Result |
| --- | --- |
| `bd51a34` in `main` | yes |
| `3ca4a6b` in `main` | yes |
| Deployed backend serves renamed keys | yes; no legacy `attributes` |
| Deployed bundle carries renamed keys | yes; zero `STR`/`WIS`/`CHA` |

**The pairing rule passed its first real test.** The coupling note in the
merge message, the quiet hour, and the immediate verification all did
their job. No process lesson to record there — the lesson is elsewhere.

## What actually located it: two of three, not three of three

`readMpDimension` gates `legislativeActivity` and `visibility` on
`hasSource()`. It does **not** gate `experience`. The two that failed
were exactly the two that consult provenance — which ruled out anything
affecting `dimensions` as a whole and pointed straight at the provenance
read path.

Had all three failed, the pairing hypothesis would have survived longer.

## Root cause

The rename moved four things and missed a fifth:

| Layer | Renamed? |
| --- | --- |
| Backend payload | ✅ |
| Backend response model | ✅ |
| Client `WIRE` constant | ✅ |
| Client mapper | ✅ |
| **Client zod schema** | ❌ still `STR/WIS/CHA/INT/STA` |

`z.object()` strips undeclared keys silently:

```
wire  metrics_provenance: {legislative_activity: "direct", …}
after zod parse         : {}
```

`hasSource()` read `undefined`, returned false, and two dials rendered
„no data" for data the API had just sent. `dimensions` survived only
because that sibling schema *was* updated in the same commit — one
renamed, one not.

## Why the tests did not catch it

`mpLegacyDimensions.test.ts` builds its profile object by hand with the
new keys, bypassing `parse` entirely. It was testing the layer *below*
the broken one, and would have passed unchanged through this defect
forever.

The new `provenanceContract.test.ts` goes through `mpProfileSchema.parse`
deliberately, and one case asserts the gate still hides a dimension the
backend marks `unavailable` — so the fix cannot be "turn the gate off".

## The rule this earned

Added to the charter as §1.11: **schemas are wire contract**. Renaming a
wire field means changing the payload, the response model, the client
constant, the mapper *and* the schema — plus a test that goes through
`parse`, not around it.

The schema was also using a closed shape where an open one is correct.
It is now `catchall(z.string())`: a new dimension should reach the client
the moment the backend serves it, not one deploy later.

## Severity

This is the inverse of invariant 1 — not displaying what the data cannot
support, but hiding what it can. Equally serious for the mission: an
„unknown" on a metric we hold teaches a reader the coverage is thinner
than it is, which is a false claim about the record.
