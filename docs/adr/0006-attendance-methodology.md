# ADR 0006: How attendance is computed

## Status

Accepted — 2026-08-12. Published as methodology `attendance` v2, announced 2026-08-12,
effective 2026-08-26 (14-day advance notice per V.4 plan §7). Version v1 remains served
until that date and stays permanently readable at `/api/trust/methodology/attendance`.

## Context

Attendance is the most consequential number this platform publishes about an individual.
It is short, it looks objective, and a reader will take it as "how often this person turned
up for work". It is also the number most likely to be quoted back at a member of parliament,
so it has to survive being challenged by that member and by their lawyer.

Until 2026-08-26 the served figure (v1, migration 015) is:

> days on which the member cast a vote ÷ days on which the member appears in the voting data

Three failure modes were demonstrated against production data on 2026-08-12.

**1. The per-member denominator.** The denominator counted only days that member appears in
`mp_votes`, not days the Seimas sat. Liudas Mažylis therefore displayed **100 % attendance,
computed from 5 days out of 93**, ranking above a colleague who attended 66. Vilija
Targamadzė displayed 100 % from 19 days. A reader comparing two members was comparing two
different questions.

**2. Presence inferred only from voting.** A member who is present through a sitting but
abstains from every recorded vote is indistinguishable from one who stayed home. The source
records an empty `kaip_balsavo` attribute for both.

**3. The consensus-sitting artifact.** Sittings decided *bendru sutarimu* record no
individual votes at all — `balsavo="0"`, every `kaip_balsavo` empty. Under a vote proxy such
a day is an absence for all 141 members simultaneously.

## Candidates considered

**A — vote proxy (status quo, v1).** Rejected: the three failure modes above.

**B — registration only.** This is what the V.4 master plan asks for in its own words:
"attendance (from *registration* data, not vote proxies)". Per-member registration data does
exist and was ingested (`p2b.ad_sp_registracijos_rezultatai`, 287 registration events,
40,419 member-rows). We measured what B would publish before adopting it:

| Member | A (votes) | B (registration only) | C (combined, mandate window) |
|---|---|---|---|
| Dainius Kreivys | 86.02 | **45.2** | 88.17 |
| Laurynas Kasčiūnas | 84.95 | **52.7** | 87.10 |
| Agnė Bilotaitė | 70.97 | **46.2** | 72.04 |
| Fleet average | 90.2 | 83.3 | 88.9 |

B was **rejected on evidence**. Registration is a roll call taken at one moment, usually at
the start of a sitting. A member who arrives after it and then votes throughout the day is
recorded as not registered. Publishing "45 %" for a member who demonstrably voted on 86 % of
sitting days would be a more damaging false statement than the one being corrected — and it
would have been made while claiming to follow the plan more faithfully.

**C — combined presence over the mandate window (adopted).**

> sitting days on which the member **registered *or* cast a vote**
> ÷ sitting days falling inside that member's mandate

Registration and voting are two independent kinds of evidence that a person was in the
building; either is sufficient. The mandate window (`data_nuo` / `data_iki` from the members
feed) fixes the denominator so that members are measured only against days they held the seat.

## Decision

Adopt **C**. This departs from the master plan's literal wording, with explicit approval
recorded in the session of 2026-08-12: the plan's *intent* — a number that means what a
reader takes it to mean — outranks its letter, and B demonstrably fails that intent.

### Suppression below three eligible days

Applying C surfaced a second injustice. Four members elected in 2024 hold a mandate of
2024-11-14 to 2024-11-14 — they took the seat and gave it up the same day to hold other
office:

- Vilija Blinkevičiūtė
- Gabrielius Landsbergis
- Virginijus Sinkevičius
- Aurelijus Veryga

Over their single eligible day each would display **0 % attendance**, which reads as "never
turns up" rather than "never served". Attendance is therefore `NULL` when fewer than three
sitting days fall inside the mandate, and the surfaces render their no-data state rather than
a figure: a percentage over one day is not a percentage. Exactly these four members are
affected; the other 144 have a number. Members with a short but genuine tenure keep theirs
alongside the raw counts (Mažylis: 5 of 5).

### What this number does *not* claim

The sources record whether a member was present, never **why** they were absent. Sickness,
parental leave, official travel and simply not attending are identical in the data. V.4 plan
§7 asks for excused absences to be "excluded/annotated"; excluding them is impossible on
these sources, so they are **annotated** — stated in the methodology text and next to the
figure on the member's page. A low attendance figure is a starting point for a question, not
a finding.

## Consequences

- `mp_attendance_v2` (migrations 019, 020) is a materialised view; it must be refreshed by
  the same job that refreshes `mp_stats_summary`.
- `hero_engine.effective_attendance_version()` reads `methodology_versions` and switches
  formulas when the announced `effective_from` passes — **no deployment is required on
  2026-08-26**, and the published methodology is what actually governs the computation.
  Both bulk paths share `attendance_overrides()`, so the leaderboard and the profile cannot
  disagree.
- Expected change on 2026-08-26: Bilotaitė 70.97 → 72.04, Kreivys 86.02 → 88.17,
  Kasčiūnas 84.95 → 87.10, Mažylis and Targamadzė unchanged at 100, four members become blank.
- Anyone may contest this figure through the public corrections form; the report and its
  resolution appear in the public log.

## How to verify this yourself

```bash
curl https://seimas-api.onrender.com/api/trust/methodology/attendance   # v1 and v2 text
curl https://seimas-api.onrender.com/api/v2/heroes/<mp_id>              # metrics.attendance_percentage
```

Sources: `apps.lrs.lt/sip/p2b.ad_sp_registracijos_rezultatai` (registrations),
`p2b.ad_sp_balsavimo_rezultatai` (votes), `p2b.ad_seimo_nariai` (mandate dates). Every
ingest run is recorded in `source_fetches` with its URL, row count and timing.
