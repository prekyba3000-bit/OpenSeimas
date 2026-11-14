# Four empty forensic engines removed

2026-11-14. Asked by the human after a dead-code survey ("what is not used
means not needed"); the removal below was proposed, then approved.

## Recon (§1.8)

Production, read before any change (`curl https://seimas-api.onrender.com/...`):

| Route | Answer |
|---|---|
| `/api/forensics/chrono` | `{"items":[],"clusters":[]}` |
| `/api/forensics/benford` | `{"items":[]}` |
| `/api/forensics/phantom` | `{"items":[]}` |
| `/api/forensics/vote-geometry` | `{"items":[],"total_analyzed":0}` |
| `/api/forensics/loyalty` | real rows — **kept** |
| `/api/v2/heroes/*` | real rows, feeds the member list and profiles — **kept** |
| `/api/v2/openplanter/graph` | real rows; no caller in `dashboard/src` |

Their tables (`amendment_profiles`, `benford_analyses`, `indirect_links`,
`vote_geometry`, `mp_vote_geometry`, `ownership_edges`) held 0 rows. Nothing
scheduled ever ran the engines that fill them.

`/dashboard/skaidrumas` showed a banner „Penki varikliai. Nulinis fluffas."
and five numbered sections, four of which said „Duomenų dar nėra".

## Removed

- Routes: the four empty forensics routes and `/api/v2/openplanter/graph`.
- Code: `skaidrumas/` (engines), `backend/graph.py`,
  `pipeline/compute_vote_geometry.py`, `pipeline/ingest_opensanctions.py`,
  `pipeline/ingest_cvp_is_procurement.py`, `fetch_graph_mp_summaries` and the
  graph cache constants.
- Page: the banner and the four empty sections. The faction-agreement section
  stays; its heading lost the „03 ·" number.
- Client: the four API functions and their types.

## Deliberately not touched

- **The profile payload.** `hero_engine.py` still reads the empty tables when
  building `forensic_breakdown`; that field is wire contract (fixtures, zod
  schema, `FlagRow`, the methodology page). Changing it is a wire change and a
  methodology question (§1.5, §1.11), not part of this removal.
- **The tables.** Dropping them is destructive (§4.5) and was not approved.
- `pipeline/ingest_amendments.py` — already recorded as superseded in
  `test_every_ingest_has_a_runner.py`; not in the approved list.

## Charter check

- §1.3: nothing new is computed or shown. Four sections that promised
  analysis of named people and showed none are gone.
- §1.5: no published figure changed; these sections never published one.
- §1.11: no payload field renamed or removed. Removed routes had one caller,
  removed in the same commit; the old client caught their failure and showed
  the same empty state, so deploy order does not matter.
- LT copy: no new strings. One heading shortened.

## Suites

Dashboard `tsc --noEmit` exit 0, `vitest run` **459 passed**. Backend on a
fresh database with 52 migrations **486 passed** (487 before; the graph
route's test went with the route).

## Found by reading the live page afterwards (§1.7): the sources box

The Skaidrumas page ended with a hardcoded „Duomenų šaltiniai" box marking six
sources „aktyvus" or „dalinis": data.gov.lt, Seimas XML, VMI + VRK, Registrų
Centras, Rekvizitai, OpenSanctions / ICIJ. Checked the same day:

- `grep -rli` over `pipeline/`, `scripts/`, `backend/` finds no reader for
  data.gov.lt, Rekvizitai, Registrų centras or ICIJ; "vmi" matches one
  unrelated string in `routes_public.py`.
- Production: `open_sanctions_id` is set on 0 of 149 `politicians` rows.
- The real Sources page (`SourcesView.tsx`) says declarations are not
  collected; this page's headline said „deklaracijos ir ryšiai vienoje vietoje".

Fixed, approved by the human: the box is removed and a „Duomenų šaltiniai"
link to the Sources page added to the quick links; the headline now reads
„balsavimai, dalyvavimas ir pasisakymai vienoje vietoje". Corrections entry
`skaidrumas-sources-box-unloaded` in migration 053.

**LT-COPY, needs native review:** the new headline sentence in
`SkaidrumasHubView.tsx`; the corrections entry text in migration 053.

Suites after this: dashboard **459 passed**, `tsc` exit 0; backend
**486 passed** on a fresh database with 53 migrations.
