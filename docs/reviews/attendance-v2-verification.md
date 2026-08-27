# P0 — attendance v2 verification

Run 2026-08-28 against production. **13/13 pass.**

Two days late: the gate was 2026-08-26 and nothing ran it. Recorded here because
a date-locked check that quietly slips is worth less than one that fails loudly.

## Result

| Check | Result |
| --- | --- |
| `methodology_versions` has an attendance v2 row | PASS |
| v2 in force (effective_from 2026-08-26 09:00 UTC) | PASS |
| 14-day advance notice honoured | PASS |
| `effective_attendance_version()` resolves to v2 | PASS |
| every member's `eligible_days` = sitting days inside their mandate | PASS |
| no member present on a day outside their mandate | PASS (0) |
| canary member has a row | PASS |
| canary recomputes to her served value | PASS — 67/94 = 71.28 |
| `/api/v2/heroes` agrees | PASS |
| `/api/mps` agrees — list and profile match | PASS |
| all 4 members under 3 eligible days are NULL | PASS |
| no suppressed member served as 0.0 | PASS |
| 10 random members recompute to served value | PASS |

## The first run failed, and the reason was not the one I expected

Three checks failed on the first attempt: Bilotaitė read 67/**94** = 71.28
against a hard-coded expectation of 72.04 (67/93). Same numerator, denominator
up by one.

Diagnosed read-only before touching anything. **The Seimas sat on 2026-08-25** —
7 votes, 115 members voting — and that day entered every member's denominator.

I then found what looked like the cause and was not. `sitting_registrations`
held **nothing** for 2026-08-25, because `ingest_registrations` had last run on
2026-08-11, **384 hours earlier**, and was on no schedule at all. Attendance v2
counts *registered OR voted*, so a day with votes but no registrations marks
everyone who attended without voting as absent.

I said at that point that up to 25 members were probably understated on a live
page. **That was wrong, and measuring it is what showed it.** After running the
ingest: 115 members present by voting, 115 by registration, **115 by the union**
— the same people. **Zero members were affected.** No published figure was ever
wrong, so no corrections entry is warranted.

The gap was real but latent. It bites on the first sitting where somebody
registers and does not vote, which 2026-08-25 happened not to be.

## Bilotaitė was genuinely absent

`registered = False` in all four registration events that day, and no vote cast.
**67/94 = 71.28 is correct.** The expectation of 72.04 was correct when written,
against 93 sitting days, and a sitting she missed made it stale.

## What changed

1. **`ingest_registrations` now runs in the daily sync**, immediately after
   `ingest_votes_v2` — the ingest that creates the sitting day. Ordering is the
   fix: votes and registrations must land in the same run, before the matview
   refresh. It picked up 291 events and 40,979 member rows; every vote day in
   the term now has registrations.
2. **An eleventh dq check**, `sitting_day_without_registrations`, asserts the
   failure *class*: any sitting day older than two days with votes and no
   registrations. `block_publish`, because refreshing the matview into that gap
   would bake an understated figure into profiles. Two days of grace, since
   registrations legitimately trail their sitting.
3. **The frozen expectation is gone.** The canary's expected value is recomputed
   from her own `days_present / eligible_days` rather than remembered. A frozen
   constant fails for two indistinguishable reasons — the computation broke, or
   the world moved — and the second kind teaches people to edit the number until
   the light turns green. The suite now asserts the relationship on all three
   paths.

## The warning that was already there

`source_freshness` had been erroring on `seimas_registrations` on **every run
for a week**. I reported it as "two genuinely stale feeds" and moved on. Nobody
connected a stale feed to a number on a page — including me, twice, in writing.
The new check closes that gap by asserting the consequence rather than the
symptom.
