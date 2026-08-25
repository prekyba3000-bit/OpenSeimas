# Upstream source map — verification pass

2026-08-25. Read-only. The source map was compiled elsewhere; per invariant 9
nothing in it backs a decision until it is checked against the primary source.
Four claims were load-bearing enough to test. Three hold, one does not, and the
one that fails is the map's most consequential.

## 1. `lrsk/balsavimai` does NOT supersede our p2b ingest

The map says: *"added June 2026 — supersedes p2b scraping"*, maturity level 4,
with `IndividualusBalsavimai` carrying `asmens_id` — which would have been the
clean join key and a licensed, versioned replacement for walking p2b.

Measured:

```
GET get.data.gov.lt/datasets/gov/lrsk/balsavimai                    → 200, lists 2 models
GET .../balsavimai/Balsavimas?limit(3)&format(json)                 → 200  {"_data":[]}
GET .../balsavimai/IndividualusBalsavimai?limit(3)&format(json)     → 200  {"_data":[]}
```

The models are **registered and empty**. Not 404 — declared, described, and
serving nothing. The API mechanism itself works: the same call shape against
`gov/vtek/pinreg_ataskaitos/AsmuoDeklaracija` returns real rows with real
values, so this is the dataset, not the transport.

This is the third time this exact pattern has appeared in this project — after
our own `legislation` table (0 rows, ingest with no runner) and
`faction_alignment` (matview materialised before its input existed). A schema
published is not a dataset delivered.

**Consequence: our p2b tree-walk remains the only working source of per-member
votes.** No migration away from it, and the `asmens_id` join stays unavailable
from this route.

## 2. Four per-MP p2b endpoints are live, and they are the depth we lack

All verified with `asmens_id=7193`, the example the LRS catalogue itself
publishes:

| Endpoint | Bytes | Records | Fields on each record |
| --- | ---: | ---: | --- |
| `ad_sn_darbotvarkes` | 212,543 | **1,073** | `pradžia`, `pabaiga`, `vieta`, `pavadinimas` |
| `ad_sn_pranesimai_ziniasklaidai` | 49,353 | **187** | `data`, `pavadinimas`, `teksto_nuoroda` |
| `ad_sn_komandiruotes` | 5,208 | **20** | `pradžia`, `pabaiga`, `tipas`, `pavadinimas` |
| `ad_sn_padejejai_sekretoriai` | 1,238 | **6** | `vardas`, `pavardė`, `ar_apygardoje`, `kontakto_rūšis`, `kontakto_reikšmė` |

For **one** member. CC BY 4.0, live, no auth. This is a genuine answer to
"the platform is too shallow" — a dated diary of what a member actually did,
their own published statements with links to full text, and their official
travel.

## 3. A trap that cost me a wrong conclusion

My first pass called all four **dead**, because I appended `&kadencijos_id=10`:

```
?asmens_id=7193                       → 200, 212,543 bytes
?asmens_id=7193&kadencijos_id=10      → 404 "The requested URL ... was not found"
```

An unsupported query parameter produces a **path-level 404**, not a 400 — the
server claims the endpoint does not exist. Anyone probing these with a
plausible-but-wrong parameter will conclude the feed is gone. Call them exactly
as the catalogue publishes them, and record the catalogue's own example URL
next to each endpoint in any ingest we write.

The map's catalogue transcription is accurate: all 25 endpoint names it lists
appear in `lrs.lt/sip/portal.show?p_r=35391`.

## 4. VRK money tables — confirmed unavailable via API

| Dataset | Result |
| --- | --- |
| `vrk/pajamos` (donations) | 404 `ModelNotFound` |
| `vrk/islaidos` (campaign spend) | 404 `ModelNotFound` |
| `vrk/reklama` (political advertising) | 404 `ModelNotFound` |
| `vrk/kandidatai` | 404 `ModelNotFound` |
| `vrk/isrinkti` | 404 `ModelNotFound` |

The map's verdict holds. The money graph is bulk-download-and-diff, not API.
That is a real project, not an afternoon.

## 5. A privacy line to draw before, not after

`ad_sn_padejejai_sekretoriai` returns assistants' **names and direct phone
numbers**. Parliamentary assistants are staff, not elected officials. The
public-interest argument that justifies publishing a member's voting record
does not extend to their secretary's phone number, and republishing it in bulk
and indexed is materially different from it sitting on one LRS page.

If we ingest this feed: store the employment relationship (who works for whom,
constituency office or not), **drop `kontakto_reikšmė` at the parser**, not at
the surface. Data not collected cannot leak.

## 6. Corrections to our own repo

`ingest_speeches.py` targets `ad_sn_pranesimai_ziniasklaidai` and builds its URL
**correctly** (`?asmens_id={id}`, no extra parameters). The endpoint is live and
returns 187 records for the test member. Its historical failure was migration
008's column mismatch, which 008 itself fixed. It has simply never had a runner.
That is a scheduling gap, not a broken script.

## Recommendation

1. **Press releases** — `ingest_speeches.py` is written, correct, and targets a
   live feed. Give it a runner. Cheapest real depth available.
2. **Diary** (`ad_sn_darbotvarkes`) — the highest-value new surface, and the
   nearest machine-readable proxy for contact activity in a country where
   lobbying contacts are legally declarable but not published as data. Needs a
   design note first: a diary is evidence, a *count* of meetings is a metric,
   and a count invites a ranking.
3. **Travel** — small, clean, factual.
4. **Assistants** — only with the contact field dropped at ingest.
5. **Not the money graph** yet. Bulk-download-and-diff for five datasets is its
   own tranche.
