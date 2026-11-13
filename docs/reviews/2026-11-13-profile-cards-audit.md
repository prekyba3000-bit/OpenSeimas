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
3. ~~Voter-guide code in the tree~~ — **removed** (`4c152fa`), with the
   guard exemption that hid it. The skip-list of
   `test_voter_guide_scoring_recommender_is_prohibited_and_absent` named the
   recommender's own files; it now exempts only the ingestion audit.
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
  on TCP 443 from this machine over three interfaces **and from 8 of 8
  outside locations** (check-host.net: ID, IR, MD, NL, SE, SG, US×2). The
  rest of `lrs.lt` answers every non-browser request with a Cloudflare
  challenge. This is the source's outage, not a block on this IP. Nothing to
  fix here; the sync resumes when the host does.
- Views last refreshed 7 November. The gate is holding correctly:
  `metric_backing_source_stale` fails with 3 rows.
- The local Postgres the pre-push hook needs is down, which is why
  `a9f7aad` (portraits) had not been pushed.

## Second pass, same day

- **Benford read "clean" for people nobody analysed.** „Ką rodo patikros" on
  the profile showed „Požymių nerasta — Benfordo dėsnio analizė" for every
  member. `benford_analyses` holds no rows; the per-member path turned "no
  row" into `status: clean`, while the list path said `unavailable` for the
  same person. Now `unavailable` on both. Test:
  `tests/test_benford_unanalysed_is_not_clean.py` (fails without the fix).
- **Not changed, needs your call: `loyalty_bonus`.** The same panel shows
  „Požymių nerasta — Sutapimas su frakcija", from a status that is `warning`
  when a member votes against their faction 10–40 % of the time and `clean`
  otherwise, and the wire still carries `bonus` and `penalty` keys. An
  earlier review kept the sub-objects as evidence (`hero_engine.py:950`). A
  warning/clean label on how independently a named person votes reads as a
  verdict to me (§1.3).
- **Seven unused public routes removed.** `/api/mp/{int}/declarations`,
  `/procurement`, `/lobbyist-meetings`, `/committee-speeches`,
  `/campaign-donors` (all answering `count: 0` over tables never ingested,
  for any integer), `/api/mps/{id}/procurement` (500 for everyone) and
  `/api/mps/{id}/amendment-speed`. No client called them. This closes item 4
  except `/supplier-links`, which serves real rows and stays for the redesign.
  The migration-048 tables are untouched.
- **Assets card copy (item 5, partly):** the heading and description named
  VMI and annual declarations; the rows are VRK candidate declarations.
  Now „Deklaruotas turtas (VRK)" / „pagal VRK kandidato deklaraciją".
  `LT-COPY: needs native review`. The big figure still lacks its own label.

## Third pass — every public page read as a hostile reader

Rendered all twelve public routes from production and read the text.

### The largest finding: „Sutapimas su frakcija" was two numbers

The profile dial and the list column read `mp_stats_summary.party_loyalty`.
The card under the dial, the hub and `/api/forensics/loyalty` read the
`faction_alignment` view, which migration 037 rebuilt so it could be
published. Measured in production across 140 active members:

| | |
|---|---|
| members with both figures | 121 |
| of those, figures differ | 121 |
| differ by more than 2 points | 110 |
| differ by more than 5 points | 90 |
| widest gap | 47.55 on the dial, 94.34 in the view |
| dial figure where the view says `faction_too_small` | 18 |

In place since 1 September. No test compared the two, because the permanent
agreement test compares list with profile, and both read the same wrong
source.

Fixed: one reader of the view (`_read_faction_alignment`), used by the
profile and the list. The fallback query that recomputed agreement a third
way is deleted. Checked end to end on a seeded database: view, profile and
list agree for a dissenting member (66.67), a member under the 20-vote floor
(none) and a member in no faction (none) — where the retired column said
100 and 0. Migration 049 carries the methodology entry (`party_loyalty` v2)
and two corrections entries, written in final form under §2.

### Also fixed

- **Hub, „Lankomumas žemiau 60 %".** Listed the five lowest attenders
  whatever their figure: members at 60 % and 65 % were named under that
  heading. Now only members under the threshold (`belowAttendance`, tested).
- **Assets card removed.** `declarations-feasibility.md` rules „Never a
  total" and the sources page says declarations are not shown; the card
  showed one euro figure as a headline. `/api/mps/{id}/assets` stays.
- **Sessions:** „X kadencijos sesijų apžvalga (2024–2028)" → „2024–2028 m.
  kadencijos sesijų apžvalga". „X" was never a kadencija number.
- **Sources:** named `attributes.INT` as an API field. It left the wire in
  September.
- **Methodology:** removed „Wiki ataskaitos" (the feature was withdrawn on
  6 September as a charter incident) and „Tyrėjų įrankiai / OpenPlanter"
  (deleted). Added the version history for „Sutapimas su frakcija".

### Read, not changed — yours to decide

1. **Hub headline:** „Neįmanoma būti suktam." and, lower, „Forensic Engines —
   Penki varikliai. Nulinis fluffas. Kiekvienas variklis atakuoja specifinį
   korupcijos vektorių", with the per-member faction-agreement list rendered
   as engine 03 beneath it. Every named member sits under the words
   „korupcijos vektorių". This is the most verdict-shaped thing left on the
   site, and it is copy, so I did not rewrite it.
2. **The under-60 list itself.** Correct now, but it is a named list selected
   by a low figure, with a warning icon; its first two entries are the Prime
   Minister and a minister. An earlier review kept it as a criterion.
3. **Methodology** still describes Benford, chronology and „Fantominis
   tinklas" in the present tense („Tikriname", „Siejame"). None has ever run.
   „Kiti vieši rodikliai" names „pastovumo", which is not one of the five.
   „Balsavimo geometrija — papildomas metodikos tekstas bus čia."
4. **Landing:** „Kelias: MP → balsai → palyginimas" and a visible
   placeholder, „Vietoje stock nuotraukos — neutralus blokas…".
5. **Overview:** „5,883" uses an English thousands separator; „~42 balsavimai
   vienam nariui" is 5,883 ÷ 140, which describes nothing.
6. **Stebėsena** says „Tai ne reitingas" above sort buttons for every column.

### Found by re-reading my own deploy

After the faction fix went live, the dial for the 18 small-faction members
read „Rodiklis bus rodomas, kai bus įkelti šaltinio duomenys" — the generic
fallback, promising data that is already loaded. The figure was right to be
absent; the reason was wrong. Now `factionFigureReason` gives the no-faction
sentence or a suppression sentence, never the fallback.

## LT-COPY inventory, 2026-11-13 (all need native review)

| Where | String |
|---|---|
| `utils/mpLegacyDimensions.ts` | „Skaičiaus nerodome: frakcijoje balsavo mažiau nei dešimt narių arba palyginamų balsavimų yra mažiau nei dvidešimt." |
| `views/MethodologyView.tsx` | „Metodikos versijos: sutapimas su frakcija" |
| `views/SessionsView.tsx` | „2024–2028 m. kadencijos sesijų apžvalga" |
| `migrations/049` (published) | methodology `party_loyalty` v2, title and body |
| `migrations/049` (published) | correction `faction-agreement-two-figures` |
| `migrations/049` (published) | correction `profile-cards-unchecked-claims` |
