# Changelog

Public-facing and API-breaking changes. Internal refactors live in the git
history; this file exists so an API consumer, a journalist, or a future
maintainer can see what the platform stopped saying and when.

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
