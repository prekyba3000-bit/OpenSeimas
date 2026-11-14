# Open-data votes as a second source — recon

2026-11-14. `apps.lrs.lt` has been unreachable since ~6 November and votes are
frozen at 5 November. The Seimas Chancellery also publishes votes through the
state open-data API (`get.data.gov.lt/datasets/gov/lrsk/balsavimai/`), which is
still updating. This note records a read-only comparison. No code or data
changed.

## Source

- `Balsavimas` — one row per vote: `balsavimo_id`, `kadencijos_id`,
  `balsavimo_pradzia`, `darb_klausimas`, `uz`, `pries`, `susilaike`, a
  `suvestine` link to lrs.lt.
- `IndividualusBalsavimai` — one row per member per vote: `balsavimo_id`,
  `seimo_narys` (upper-case name), `rezultatas`, `iraso_laikas`,
  `seimo_nario_id` and `asmens_id` (hashed strings, not the lrs.lt integers).
- Freshness when read: latest vote 2026-11-12 16:13; **148 votes after
  2026-11-05**.

## Comparison, sitting of 2026-11-05 (the last day we hold)

| Check | Result |
|---|---|
| Vote IDs | 111 in each, identical sets (`balsavimo_id` = `votes.seimas_vote_id`) |
| Vote time | identical in the two sampled (`balsavimo_pradzia` = `voted_at`) |
| Tallies for/against/abstained | 70 comparable, **0 differ** |
| Votes with no tally | 41 in open data are `null`; ours store 0/0/0 for the same 41 |
| Individual rows | open data 5,555; ours 15,540 |
| Choices by kind | 4,208 / 678 / 669 in both (`1` = Už, `2` = Prieš, `3` = Susilaikė) |
| Joined by vote + name | 5,232 pairs, **0 disagree** |

## What does not line up

1. **Members who did not vote are absent.** Our 9,985 rows with a NULL choice
   (the lrs.lt XML lists every member for every vote) have no counterpart.
   The open data records only a cast choice. Anything that reads those rows
   (participation, attendance-adjacent figures) would see a different
   denominator for days ingested from this source.
2. **No usable member ID.** `seimo_nario_id` is hashed. The only join is the
   name. 323 open-data rows did not join by exact normalised name. Treating
   a hyphen as a space joins 5,513 of 5,555 with 0 disagreements; the open
   data writes double surnames without the hyphen. The remaining 42 rows are
   one member, printed „JAROSLAW NARKIEWICZ", whose name we store in another
   spelling. Our 140 members that day have no duplicate normalised names.
   **The hashed ID is stable and one-to-one**: 111 hashed IDs, none mapping to
   more than one of our members and no member with two. A hashed-ID table
   built from days both sources cover would therefore identify members without
   relying on names afterwards — on the evidence of one day.
3. **`null` versus 0/0/0** on the 41 untallied votes. Ours says zero; the
   open data says nothing. §1.2 favours the open data's reading, which is a
   separate question about what we already store.
4. Only one sitting day was compared. `Pasiulymas` (initiated bills) returned
   records with the member shown as „CENZŪRUOTA"; not examined further.

## Decisions before any ingest

- Whether a name join is acceptable identity for votes within one term
  (the same objection held `link_vrk.py` back on 2026-09-06). A hashed-ID to
  member table built from the days both sources cover would avoid it.
- What to store for members with no row: nothing, or a NULL-choice row for
  every seated member. The second is an inference from the roster, not a
  source record.
- Whether days ingested from this source are marked as such, and re-read from
  lrs.lt when it returns (the choice-drift table already exists for that).

## Later the same day: ingesting these votes would not release the views

Checked what holds the 30-minute refresh before building anything. Two
`block_publish` checks are failing on production:

- `metric_backing_source_stale` — registrations, floor speeches and authored
  bills have had no successful fetch in 50 hours. All three are lrs.lt.
- `three_way_reconciliation` — see `RESUME.md`; caused by the decree ingest
  and unrelated to votes.

And one would start failing: `sitting_day_without_registrations` blocks
publication for any sitting day that has votes but no registrations.
Registrations exist only on lrs.lt; the open-data catalogue for the Seimas
Chancellery has no such dataset. Votes for 6–12 November from this source
would therefore add a third blocking failure and publish nothing.

That gate is deliberate (attendance must not be computed over days whose
registrations are missing), so the fallback is **not built**. The comparison
above stands as evidence that the source is sound; it becomes useful only if
registrations get a second source too, or if the gate is redesigned to
publish votes while holding attendance — a methodology decision, not hygiene.
