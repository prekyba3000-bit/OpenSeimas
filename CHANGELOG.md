# Changelog

Public-facing and API-breaking changes. Internal refactors live in the git
history; this file exists so an API consumer, a journalist, or a future
maintainer can see what the platform stopped saying and when.

## 2026-08-31 — The wall of shame is removed

A panel titled **„Gėdos siena"** was published on the transparency hub. It
listed the fifteen lowest-attendance members of the Seimas, ranked **#1 to
#15**, by name and photograph, each with a euro figure headed
`wage_unearned_eur` — the salary that member had supposedly not earned — and a
combined total of €83,618.58.

It was regenerated from the database and committed to this repository every
day by the scheduled sync.

**This should never have been published.** It is a ranking of named people
under a label that calls them shameful, carrying a derived claim that they took
money they did not deserve. The platform's own first rule is that it never
publishes anything readable as a verdict on a person, and this was not a
borderline reading — the panel was titled after the judgement it was making.

It was also wrong on its own terms. It counted a member present only if they
voted that day, which is the attendance methodology retired on 2026-08-26. The
same page therefore showed Inga Ruginienė at 42.6% in the ranking and 44% in
the panel directly above it.

**Removed:** the panel, the component, the generator (`export_stats.py`, now a
stub explaining why), the daily commit that published it, and the data file.

**Not removed:** attendance itself. Every member's attendance is published on
their profile with its denominator, its coverage note and a „Kaip
skaičiuojama?" drawer. The evidence stays. The ranking was the part that had to
go.

**Why it survived three previous cleanups.** The heroes-villains retirement,
the integrity-index demotion and the loyalty de-ranking all searched source
code and API read paths. This reached readers through a static JSON file in
`public/`, fetched directly by a component, so no grep over read paths ever
touched it. A guard now scans everything shipped from `public/` for ranking and
judgement keys, because a file served to a browser reaches a reader exactly as
an API response does.

It was found by opening the page and reading the headings.

## 2026-08-21 — Verdicts leave the public API

**Breaking.** The API now ships evidence and descriptive dimensions. It ships
no verdicts.

### Removed from all responses

- **`alignment`, `level`, `xp`, `xp_current_level`, `xp_next_level`,
  `artifacts`** — an RPG layer attached to named members of parliament, one MP
  per row, carrying labels like `"Lawful Good"`. Nothing in the app rendered
  them, but they were public and the media kit invites external API use.
- **`final_integrity_score`, `base_risk_score`, `base_risk_penalty`** — the
  composite. Demoted rather than deleted: still computed, and the full formula
  is published on the methodology page. It no longer crosses the wire.
- **`score_consistency` (wire key `STA`)** — removed unrendered composite
  field: a second aggregation, mixing attendance with amendment counts, with no
  consumer on any surface. It was not in the original audit of composite-bearing
  surfaces precisely because nothing displayed it.

### Renamed

- **`attributes` → `dimensions`**, and its keys from RPG abbreviations to what
  they measure:

  | was | now |
  | --- | --- |
  | `STR` | `legislative_activity` |
  | `WIS` | `experience` |
  | `CHA` | `visibility` |
  | `INT` | *(removed — the composite)* |
  | `STA` | *(removed — see above)* |

  `metrics_provenance` is rekeyed to match, so the "hidden until a populated
  source backs it" rule survives the rename.

### Retired

- **`GET /api/accountability/heroes-villains`** now returns 404. It sorted
  named members of parliament into „heroes" and a „watchlist" using
  `100 - risk_score + attendance * 0.15`. A tombstone comment in
  `routes_forensics.py` records what it did and why it went.

### Also

- **`GET /api/mps`** — `attendance` is now `number | null`. It was
  `COALESCE(attendance_percentage, 0)`, which served `0.0` for the four members
  whose mandate covers fewer than three sitting days. Null means "no
  publishable figure", not zero.
