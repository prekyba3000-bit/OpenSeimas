# Three defects behind one unvalidated endpoint

2026-09-05. The task was to give `/api/stats`, `/api/mps` and `/api/votes/{id}`
runtime schemas, because they went through `request<T>()` with a TypeScript type
and nothing else. A TypeScript type is erased at build time, so it asserts
nothing about what arrives: when the wire and the interface disagreed, nothing
failed — the value rendered wrong.

Writing the schemas found two live wire mismatches. Writing the *guard* for the
schemas found two more defects that had nothing to do with the three endpoints.

## 1. The declared type and the wire already disagreed

Both created by the faction work of 2026-09-04, both invisible to the compiler:

| Endpoint | Declared | Actually sent |
| --- | --- | --- |
| `/api/mps` | `party: string` | `null` for **9 of 148** members |
| `/api/votes/{id}` | `votes[].party: string` | `null`, same members |

The nine are the Speaker, who steps out of his faction for the term, and the
eight former members who left theirs when their mandate ended. Nothing broke,
because nothing was checking.

## 2. `str(None)` is `'None'` — six call sites

`votes.sitting_date` is a nullable column and every date this API sends was built
with a bare `str()`. A null date would have arrived as the four characters
„None" sitting in a date slot: a plausible-looking value, which §1.1 forbids more
strictly than it forbids a gap.

Zero rows are null today. That is what makes it the kind of defect that ships —
it waits for the first one. Fixed as a class (`_date_or_none`) rather than at the
one call site the fixtures happened to expose, because the failure class is
„`str()` applied to a nullable column" and it had six instances.

Auditing the columns behind every schema'd endpoint at the same time found two
more fields declared non-null against nullable columns: `press_releases[].date`
and `.title`. `speeches` marks exactly two columns NOT NULL — `id` and
`speech_type` — so everything the activity panel reads from it can be null. A
single such row would have blanked that panel.

## 3. The public payload carried scores about named members

The new guard asks a question no parse can answer: **which keys does the client's
zod schema silently drop?** A schema that parses successfully has already thrown
away everything it did not declare, and that is how `metrics_provenance` was
emptied and three dials disappeared in production.

Its first run reported eleven dropped keys on the profile. Six were verdict-shaped
and live on `/api/v2/heroes/{id}` for every named member:

```
metrics.risk_score                      metrics.social_bonus
metrics.high_risk_alerts                forensic_breakdown.raw_forensic_penalty_sum
metrics.forensic_penalties              forensic_breakdown.capped_forensic_penalty
```

Charter §1.3 forbids a composite about a named person „on any public surface **or
in any public API payload**". Nothing rendered them — the client schema had been
dropping them all along — but the media kit invites external API use, so an
integrator could have built the league table this platform refuses to build.

### Why the existing guard did not catch it

`test_no_verdicts_on_the_wire.py` reads `HeroProfileResponse.model_fields` and
asserts no RPG or composite key is declared. It passed, correctly: the model
declares `metrics` and `forensic_breakdown` as `Dict[str, Any]`. The response
model filtered the top level, and **nothing filtered one level down**. The guard
checked the shape of the box, not the contents.

`raw_forensic_penalty_sum` and `capped_forensic_penalty` escaped `public_breakdown`
for a smaller reason: it drops keys by the `_composite_` prefix, and those two were
written without it.

The fix mirrors the existing pattern — a `public_metrics()` projection beside
`public_breakdown()` — and the guard is rewritten to walk the *built payload*
recursively rather than the model's field list.

`total_forensic_adjustment` deliberately survives: `StebsenaView` reads it and
`mpProfileSchema` requires it, so dropping it would blank a page rather than
clean a payload. Whether an „adjustment" belongs on a public payload at all is a
surface decision, not a projection one, and is left open here.

## 4. Attendance published 0.0 % for members it knew nothing about

The same fixture that exposed the verdict keys had been carrying this line since
the day it was committed:

```json
"attendance_percentage": 0.0,
"party_loyalty": null,
```

A payload built from a database that finds nothing, reporting that a member
attended 0 % of sittings. Two `COALESCE(metric, 0)` in read paths — the thing
§1.4 forbids by name — feeding a resolver that ended `float(v1_value or 0)`:

```sql
COALESCE(s.attendance_percentage, 0) AS attendance_percentage   -- ×2
```

```python
return float(v1_value or 0)      # absent data and a measured zero, collapsed
```

Not reachable today: `mp_stats_summary` and `mp_attendance_v2` both cover all 148
members, and the four members below the three-sitting-day floor are correctly
suppressed to `null` by `eligible_days`. It becomes reachable the moment a member
exists in `politicians` before the matviews cover them — a newly sworn-in
replacement between refreshes, which this project has already seen once.

The consequence is the worst thing this platform can assert about a named person.
„0,0 % dalyvavimas" does not read as *we have no data*; it reads as *they never
showed up*.

The fixture had been recording it in the repo the whole time. It was read as a
shape and never as evidence — which is charter §1.7 in miniature, and the reason
the trust-floor test now asserts attendance explicitly rather than only
`party_loyalty`.

## What changed in the harness

- **`count(*)` returns 0, not NULL.** The stub modelled every aggregate as NULL
  over an empty set. Postgres draws the line per column: `count` is 0, `sum` /
  `max` / `min` / `avg` are NULL. `/api/stats` is five COUNTs and a subtraction,
  so the unfaithful stub made an empty database look like it crashed the
  endpoint. The second invented crash this file has produced; the rule now lives
  in code (`_count_aliases`) rather than in a warning comment.
- **Golden comparison round-trips through JSON.** The test compared Python
  objects, so `{None: 1}` matched `{None: 1}` and looked fine — while the wire
  carries `{"null": 1}`, because a JSON object key cannot be null. That exact
  serialisation shipped the „null" faction row on the vote page. The contract is
  the bytes, so the fixtures record the bytes.
- **`rows_for`**, so a list endpoint can degrade to *one maximally-null row*
  rather than `[]`. An empty list is shape-compatible with every schema and
  tests nothing. `degraded-mps.json` is now a member with no faction, no photo,
  no attendance and no vote mode; `degraded-vote.json` reproduces the real
  `{"null": {"null": 1}}` shape the live endpoint serves for the 5,286 votes
  whose per-member choices are absent.

## Counts

306 → **319 dashboard**, 247 → **254 backend**. tsc unchanged at 11, all vendored
`ui/`.

## Open

- `total_forensic_adjustment` is still a per-person aggregate on the public
  payload, at value 10 for every active member. Rendered by `StebsenaView`.
  Retiring it is a surface change and needs a design note first.
- `metrics.bills_*` and `metrics.amendments_*` are all 0.0 while `legislation`
  holds 0 rows. They are allowlisted as undeclared rather than rendered, so no
  surface shows the zeroes — but the P4 question of which source is canonical is
  what actually settles them.
