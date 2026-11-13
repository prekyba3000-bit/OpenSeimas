# Profile cards from the 2 October commit — audit, 2026-11-13

`d52b5d6` ("voter-guide Phase 2…", 60 files) mounted six new cards on every
member profile. No review note covers them. I read them on the live page
(`seimas-v2.vercel.app`, one member, DOM dump) and against production's API
for all 140 active members.

## Removed (commit of this date)

| Card | What the live page showed | Rule |
|---|---|---|
| `MpSupplierLinksCard` | 30 members: an amber card „Tiesioginiai Verslo Ryšiai ir Pirkimai", „4 Sutapimai", listing contracts won by an organisation the member declared — including a former employer's 2023 contracts, before the 2024 election. 110 members: a green badge „Nėra Sutapčių". The same green badge rendered when the request **failed**. | §1.1, §1.2, §1.3 |
| `MpFactionFrictionCard` | „Balsavimo Savarankiškumas": 6.4 % of 3,358 votes, on the same page as the reviewed faction-agreement figure with its own denominator. The query used today's faction for all past votes, had no ten-voter floor, and broke ties arbitrarily. | §1.4, §1.3 |
| `MpChronoSpeed` | „…duomenų šiam nariui neužfiksuota" for 140 of 140 members. The table behind it has never held a row. | §1.2 |
| `MpProcurementCard` | Nothing: `/api/mps/{id}/procurement` returns 500 for everyone (`indirect_links.mp_id` is an integer, the query casts to uuid). | — |

Also removed: the `/api/mps/{id}/faction-friction` route (a second definition
of a published metric on the wire) and the client schemas for all four.
`tests/test_crown_jewels.py` now asserts the only `faction-` route is
`faction-alignment`.

Dashboard tests 460 → 456: the four are `noClickableDivs`' per-file cases for
the deleted files. Backend 470, unchanged in count.

## Left in place, needs a decision

1. **Corrections entry (§1.6) — not written.** These cards were public from
   2 October to today. A draft, for native review before it is published:
   „Nuo 2026 m. spalio 2 d. Seimo narių puslapiuose rodėme korteles apie
   verslo ryšius ir viešuosius pirkimus. Dalis jų teigė „Nėra sutapčių", nors
   duomenų netikrinome. Kita dalis rodė antrą, kitaip skaičiuotą sutapimo su
   frakcija rodiklį. Korteles pašalinome."  `LT-COPY: needs native review`
2. **Supplier links, if they return**, need a design note first: what a
   declared workplace is, the date of the contract against the date of the
   mandate, and no „match" counter.
3. **Voter-guide code is still in the tree** — `pipeline/voter_guide_agent.py`
   (`alignment_pct`, category `more_aligned` for a named member) and
   `dashboard/src/utils/voterGuideEngine.ts`. Neither is routed or imported by
   the app. The near-miss note of 17 September said none of it would be
   committed. `test_voter_guide_scoring_recommender_is_prohibited_and_absent`
   passes because its skip-list names exactly these files.
4. **Unrouted-in-UI endpoints still serving:** `/api/mps/{id}/supplier-links`,
   `/amendment-speed`, `/procurement` (500), and five `/api/mp/{int}/…`
   endpoints over the migration-048 tables, whose ingesters parse nothing.
   They answer `count: 0` for sources never ingested.
5. **`MpAssetsChart` copy** says „VMI / VRK" and „metines"; the rows are VRK
   candidate declarations only. The big figure is „privalomas registruoti
   turtas" alone (0 € for a member who also declared €7,000 cash), and the
   label does not say so beside the number.
6. **`pipeline/fortress_client.py`** fetches through a stealth browser when a
   government site returns a bot challenge. Not used by the daily sync.

## Ops, same day

- Data is frozen at **5 November**. `apps.lrs.lt` (45.146.192.50) times out
  on TCP 80 and 443 from this machine; `www.lrs.lt` answers. The daily sync
  dies at its first fetch and the hourly catch-up retries it.
- Views last refreshed 7 November. The gate is holding correctly:
  `metric_backing_source_stale` fails with 3 rows.
- The local Postgres the pre-push hook needs is down, which is why
  `a9f7aad` (portraits) had not been pushed.
