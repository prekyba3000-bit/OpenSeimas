# MP diary (`ad_sn_darbotvarkes`) — design note

2026-08-25. Written before any ingest, because the risk here is not technical.

## What the feed actually contains

Measured on a random sample of 30 of 140 active members, plus three read in
full:

| | |
| --- | ---: |
| Members with a diary | **30 / 30** — it is universal |
| Events per member | min 225 · median 377 · max 1,901 |
| Sample total | 15,384 events |
| Events resembling an external meeting/reception | **1,000 (6.5%)** |
| Members with at least one such event | 24 / 30 |

Extrapolated to the chamber: roughly **50,000 events**, of which perhaps
**3,500** are external contacts.

Fields per event: `pradžia`, `pabaiga`, `vieta`, `pavadinimas`. `vieta` is
frequently blank — 509 of 1,073 filled for the member with the fullest diary,
**0 of 552** for a backbencher.

## The thing this must not become

**Roughly 93% of the diary is the parliamentary calendar** — „Seimo rytinis
posėdis", „Komiteto posėdis", „Frakcijos pasitarimas". For one backbencher,
66% committee sittings and 34% plenary, with not a single external meeting and
no location on any row. His diary is the sitting schedule, which we already
hold from `ad_sp_eiga` and the registration feed.

So a count of diary events measures **office, not effort**. The 1,901-event
member is not eight times more diligent than the 225-event member; they chair
more bodies. The Speaker's diary is long because the Speaker receives
delegations. Publishing „Susitikimų skaičius: 1901" beside a name would be a
verdict assembled from an institutional artefact, and it would be read as
diligence by every reader who did not open the methodology drawer.

**Decision: the diary never feeds a dial, and no count of it is displayed.**
This is a §1.3 case — a composite-in-waiting — and it is being refused before
it is built rather than retired after.

## What it can honourably be

An **evidence timeline** on the member's own page: what this person's
parliamentary week actually looked like, in their own institution's words,
with dates. No number at the top. No comparison to other members. No ranking,
no percentile, no band.

That is genuinely new depth and it is the first thing on the platform that
answers "what does an MP actually *do* all day" rather than "how did they
vote". It needs no metric to be worth reading.

## Open problems before any ingest

1. **The external-meeting subset is the interesting 6.5%, and keyword
   classification is fragile.** „Susitikimas" catches some; a delegation
   reception titled „Baltų vienybės dienos minėjimas" is invisible to it. If
   we ever separate internal from external, the classifier's error rate has to
   be measured and published, or the split must not be shown at all. Safer
   first version: no classification, just the timeline.
2. **Blank `vieta` is common and must render as unknown**, not as an empty
   line implying no location existed.
3. **Volume is ~50,000 rows** — larger than `speeches` (8,106) and a real
   addition to page-load cost. Needs pagination on the surface and a per-member
   index in the schema.
4. **Freshness is unknown.** How quickly a diary is updated after an event, and
   whether past events are ever edited, has not been measured. If entries
   change retroactively, a snapshot manifest per member per fetch is the only
   way to notice.
5. **The office confound applies to the timeline too**, though far less
   sharply than to a count. A Speaker's calendar looks busier because it is.
   The surface should say what the diary is — the member's official
   parliamentary calendar as published by the Seimas — so nobody reads length
   as virtue.

## Recommendation

Build it as a paginated, per-member evidence timeline with no aggregate number
anywhere, after measuring point 4. Do not ingest until the freshness question
is answered, because a diary that is silently rewritten upstream is a
correctness problem we would discover from a reader rather than a test.

---

## Freshness answered (2026-08-31)

The note above held the ingest on one question: are settled entries rewritten
upstream? Baseline 2026-08-27, compared 2026-08-31.

**Answer: rarely, but not never. 3 of 140 members in four days.**

| | |
| --- | ---: |
| settled past rewritten | **3** |
| grew (new events only) | 40 |
| unchanged | 97 |
| unreadable | 0 |

In all three the settled count *rose* — 673→674, 720→721, 545→547 — so the feed
**adds past-dated entries late** rather than editing existing ones. An
insert-once ingest would miss them permanently and never notice.

### The first answer was wrong, and the error is the more useful finding

The first comparison reported **38** rewritten. It was an artifact of my own
measurement: the settled window is defined as "ended more than 7 days ago", so
its cutoff moves with the calendar. The baseline hashed events before
2026-08-20; the comparison run hashed events before 2026-08-24. Events in that
four-day band became settled between the runs, changed the hash, and were
counted as rewriting.

Comparing now pins the cutoff to the baseline's, so both sides describe the same
events. 38 → 3.

Worth keeping, because the failure was silent and confident: a moving definition
compared against a fixed snapshot manufactures change out of nothing but elapsed
time. The tool reported a clean, plausible, badly wrong number, and the only
reason it was caught is that the direction looked odd — settled counts should
not rise for 27% of members in four days.

### What this means for the ingest

Re-fetch and reconcile, not insert-once — but cheaply. ~2% of members per four
days gain a late past-dated entry, so the volume is small. The sitting-state
pattern from the floor-speech ingest applies directly: track what was read,
re-read a bounded recent window plus anything whose fingerprint moved, and skip
the rest.

The design decision in the note above is unchanged and unaffected: the diary is
an evidence timeline, never a count, whatever its freshness behaviour turns out
to be.
