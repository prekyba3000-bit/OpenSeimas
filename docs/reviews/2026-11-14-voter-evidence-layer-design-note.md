# Voter evidence layer — recon and design note

2026-11-14. Request from the human: a neutral decision-support layer joining
elections (VRK), parliamentary activity (lrs.lt) and official statistics
(dataportal.gov.lt), delivered first as a thin slice for one constituency.
Recon and proposal only. No code, schema or data changed.

## Recon (§1.8)

**Already in the repo and reusable**

- `politicians` carries `election_type`, `constituency_number`,
  `constituency_name`, `vote_share`, `nominating_party`, `vrk_candidate_id`
  (146 of 149 linked on production). Filled by `pipeline/ingest_vrk_results.py`
  from each candidate's VRK page.
- `ConstituencyPicker`, `SeimasMap`, `MpActivityPanel`, `MpProfileView`, the
  „Kaip skaičiuojama?" drawers, `SourcesView`, `methodology_versions`, the DQ
  checks and the freshness gate.
- Issue tags: `vote_topics` 3,209 rows, `legislation_topics` 1,268.
- Ingestion pattern: `pipeline/ingest_*.py`, insert-only, a non-fatal step in
  `daily_sync.sh`, numbered migration, route that answers `available: false`
  when its table is absent (`/api/government` is the latest example).
- Guard: `tests/test_no_verdicts_on_the_wire.py`.

**Sources, as found today**

| Source | State |
|---|---|
| Six portal tables (sd000033, sd000355, sd005410, sd005348, sd005413, sd003524) | All reachable. Each has a JSON endpoint, `POST api.dataportal.gov.lt/namespaces/<org>/tables/<table>_lt/query`; one was queried and returned rows with territory, period, value, unit. |
| VRK `Kandidatai` | Has data (per `ingest_vrk_results.py`, 2026-09-06). `apyg_nr` is where a candidate ran, not where they won. |
| VRK `Rezultatai`, `Isrinkti` | Registered and empty on 2026-09-06. Not re-checked today. No machine-readable historical results. |
| `campaign_donors` | Table exists, 0 rows. |
| lrs.lt | Down since ~6 November; activity frozen at 5 November. |

**Two facts that shape the design**

1. **Statistics are not published per constituency.** Housing prices and
   essential-goods prices cover the five big-city municipalities only; wages
   and deaths are by administrative territory. There are 71 single-mandate
   constituencies, several inside one city and many spanning municipalities.
   A constituency page can show the figures of the municipality it lies in,
   named as that municipality, never as the constituency's own.
2. **There are no 2028 candidates yet.** "Candidates" in a slice built now
   means who ran in 2024.

## Where the request meets the charter

This project has built and removed a voter guide twice (near-miss note of
2026-09-17; removal recorded 2026-11-13). The request's own constraints agree
with §1.3. Four features still need reshaping:

| Requested | Problem | Proposed form |
|---|---|---|
| Candidate and party comparison by issue | Named people side by side on an issue reads as a verdict once anything is summed or ordered (§1.3) | Per issue, the list of votes and each person's recorded choice, with counts and denominators as on the Compare page. No percentage, no ordering by agreement, no input of the reader's own stance. |
| Promise → vote → outcome timeline | No promise source is ingested; judging a promise kept is a verdict; an outcome placed after a vote on one line asserts cause by layout, whatever the caption says | Not in the slice. Revisit with a design note of its own. |
| Party-line voting alongside constituency conditions | Same pairing-implies-cause problem | Both on the page, in separate sections, never on one chart or row. |
| Government-term dashboard with previous-term baseline | A term-versus-term figure reads as that Government's result | Plain time series with term boundaries marked on the axis. No per-term average or delta. |

## Proposed schema (additive)

- `indicators` — key, title, unit, portal dataset id, source URL, methodology
  URL.
- `indicator_values` — indicator key, territory code and name, period, value,
  unit, source's own symbol/flag, source row id, `retrieved_at`.
- `constituency_territories` — constituency number, municipality code,
  `basis_url`. Hand-seeded from VRK boundary descriptions; a CHECK forbids a
  row without its basis, as in migration 050.
- `election_candidates` — election id, constituency number,
  `vrk_candidate_id`, name, nominating party, source URL.
- No results table until a source delivers results.

## Source adapters

- `pipeline/ingest_portal_indicators.py` — the six tables through the query
  endpoint; one row per source row; stores what the request lists (URL,
  territory, period, unit, retrieval time).
- `pipeline/ingest_vrk_candidates.py` — `Kandidatai`.
- Election results — adapter boundary only, reporting "source empty" until
  VRK publishes; nothing hardcoded.

## Thin slice

`/dashboard/apygarda/:nr` for one constituency lying wholly inside one of the
five cities, so all three indicator families exist for it:

1. Who ran in 2024 and who won (existing data plus `Kandidatai`).
2. The incumbent's existing descriptive dimensions, unchanged.
3. Wages, housing and essential-price series for the municipality, with the
   national series, each with source, period and retrieval date.
4. Per issue: the votes and the incumbent's recorded choice.

Historical results before 2024 are reported as unavailable.

## Open before code

- The four reshapings above.
- Which constituency.
- LT copy for a new page adds to an unreviewed worksheet.
