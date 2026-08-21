# Backlog

Work that is real, scoped, and not yet scheduled. Each item states why it
matters and what it depends on. Items sort by the ADR 0007 question: **does this
serve October 2028?**

Decisions live in `docs/adr/`; the plan lives in `docs/V4-MASTER-PLAN.md`.

---

## Scheduled — first actions after the Jaukumas branch merges

### 1. Run the vote-tally backfill
Prepared on `feat/jaukumas-redesign` (migration 022, ingest mapping,
`pipeline/backfill_vote_tallies.py`) but deliberately **not run**: it must land
after the outcome rendering is live, so 5,279 votes' worth of tallies arrive
into a UI that can already display them.

- apply migration 022 on production
- run the backfill in the background with progress logging
  (`python -m pipeline.backfill_vote_tallies`, ~30 min at 3 req/s, resumable)
- verify a sample of ~20 votes by hand against `lrs.lt`

### 2. File the self-correction — name the pattern, not just the instances
The public corrections log should carry one entry describing **three layers of
the same disease: displays asserting what they did not know.**

1. **The null→DEFERRED fallback.** Every vote rendered „Atidėta" because
   `result_type` is NULL and the mapping fell through to a default. 5,279
   assertions that the Seimas deferred a vote, on no evidence.
2. **The `nepriimta`/`priimta` substring trap it was hiding.** `"nepriimta"`
   contains `"priimta"`, and the old code tested for `priimta` first — so the
   moment real outcomes arrived, *rejected* votes would have rendered as passed.
   The first bug concealed the second: with everything falling through to
   DEFERRED, the broken branch never ran.
3. **The health panel that asserted status it never checked.** `CONNECTED`,
   `ONLINE`, `AUTOMATINĖ` were hardcoded string literals on the landing page,
   next to real data, reporting system health nothing had queried.

All three are fixed. The entry is stronger for naming the pattern: a display
that fills an empty slot with a plausible default is the platform's
characteristic failure mode, and the trust floor exists to catch exactly it.

---

## Workstreams

### Dead-code removal — 16 unreachable components
`src/components/` contains sixteen components imported by nothing:
`Admin_Server_Status`, `AlignmentResultCard`, `CommandPalette`,
`ComponentBreakdown`, `ConflictAlertModal`, `DivergingBar`, `DocCard`,
`ForensicExplainer`, `MenuTrigger`, `Party_Clan_Profile`, `SeatingMap`,
`SessionOverview`, `SwipeableVoteItem`, `TokenHandOff`, `VerticalPowerMeter`,
`VoteStatusIcon` (plus `MobileVoteStrip`, reachable only from
`SwipeableVoteItem`, which is itself dead).

They are listed in `src/i18n/noEnglishLeaks.test.ts` so the leak guard stays
meaningful for live code.

**Before deleting, read each one for fabricated content.** These files are where
the project's earlier habits are preserved intact, and they have already proved
it: the leak guard found `"Voted FOR"` in `ConflictAlertModal`, and
`SeatingMap`/`ComponentBreakdown` both hardcode "141". Deleting them silently
would throw away evidence of what the live code might still be doing. Each
should be checked for hardcoded numbers, invented statuses and English strings,
and anything found should be grepped for in reachable code **before** the file
goes.

**Two more found during the redesign**, by walking the import graph from
`main.jsx` instead of grepping: `components/VotesListView.tsx` (superseded by
`views/VotesListView.tsx`, which is the routed one) and `VoteListCard.tsx`,
which only `components/VotesListView.tsx` imports. That is eighteen, and the
count should be re-derived from the import graph rather than trusted, because
this list was built by grep and grep missed a whole pair.

Depends on: nothing. Serves 2028 indirectly (smaller surface, faster review).

### Apygarda (constituency) data is entirely absent
Migration 010 added `constituency_number`, `constituency_name` and
`election_type` to `politicians`. All three are NULL for all 148 rows —
the columns were created and never populated.

This is why „Rask savo narį" on the landing is a **name** search rather than
the district lookup the redesign asked for. A district input needs somewhere
to look the district up, and inventing one would be the exact failure the
project exists to avoid.

Work: source the VRK single-mandate results (which apygarda each member won,
and the multimandate list members), populate the columns, then the landing
affordance can become „įrašyk savo miestą → tavo apygardos narys".

Serves October 2028 directly: „who is *my* MP" is the first question a
first-time voter asks, and right now the platform cannot answer it.

### Phantom CSS variables — a second sweep is warranted
The „Jaukumas“ skin found sixteen CSS custom properties referenced by live
components and defined nowhere: `--text-primary`, `--text-secondary`,
`--text-tertiary`, `--glass-border`, `--glass-background`,
`--background-surface`, `--background-elevated`, `--status-success`,
`--status-danger`, `--status-warning`, `--status-success-muted`,
`--status-danger-muted`, `--color-text-ghost`, `--color-text-bright`,
`--font-terminal`, `--font-decree`, `--ease-snap`. An undefined `var()` makes
the whole declaration invalid at computed-value time, so ~49 colour
declarations across `MpCard`, `Button`, `VoteBreakdown`, `MpsListView` and
`StatCard` were doing nothing at all — and `bg-surface` in `Card.tsx` was an
undefined *utility*, meaning every card in the app rendered with no background.

All of the above are fixed. What is left is the general case: **there is no
guard preventing the next one.** A build-time check that every `var(--x)` in
`src/` resolves to a definition would have caught all seventeen at once. Worth
doing before the next skin change, not after.

Depends on: nothing.

### Vote titles are truncated at 200 characters — 584 of them
Found while building the grouped votes list, which prints each vote's
identifier („(Nr. XVP-1766)“) separately so a two-line clamp cannot eat it.
Some rows had no identifier to print, because the stored title stops
mid-token:

```
…nimo“ pakeitimo“ projektas (Nr. XVP-17
```

Measured: 832 of 5,279 titles do not end in `)`. **584 of them are exactly
200 characters long**, which is a cap, not a coincidence. (The remaining ~250
are short titles like „Klausimų grupė“ that genuinely carry no identifier, and
a handful over 200 that the ingest composes itself for package votes.)

Where it comes from: `ingest_votes_v2.py` prefers `klausimo_pavadinimas` from
the results feed and falls back to the agenda feed's `pavadinimas`. Checked
the live results XML for one affected vote (`balsavimo_id=-59981`) — it has no
`BalsavimoRezultataiAntraštė` element and no `klausimo_pavadinimas` at all, so
the value must be the agenda `pavadinimas`. **Not yet confirmed** whether LRS
caps that field at 200 or something on our side does; confirming it needs one
agenda fetch for a known `posedzio_id`, which the probe used here could not
guess.

Why it matters: the identifier is the only thing distinguishing several votes
on the same day that otherwise read identically. Losing it means a citizen
cannot tell which motion they are looking at from the list.

Work: confirm the source of the cap, then either re-request the field
untruncated or resolve titles from the agenda's `registracijos_nr` and
re-ingest. Roughly 11% of all votes are affected.

Depends on: nothing. Related to [the tally backfill](#) — both are re-reads of
the same 5,279 votes and should run in one pass if possible.

### /api/mps does not apply the attendance overrides
Found while writing `Seimas.v2/scripts/verify_attendance_v2.py`.

The v1 → v2 switch is automatic and well built: `effective_attendance_version()`
reads `methodology_versions`, and `resolve_attendance()` / `attendance_overrides()`
apply both the value swap and the under-3-eligible-days suppression. But only
`hero_engine.py` calls them — the `/api/v2/heroes/*` paths.

`/api/mps` and `/api/mps/{id}` in `routes_public.py` read `mp_stats_summary`
(the v1 view) directly, through
`COALESCE(s.attendance_percentage, 0) AS attendance`. Two consequences from
2026-08-26:

1. The MP **list** will keep serving v1 numbers while the MP **profile** serves
   v2 — the same member reading two different attendances on two pages.
2. That `COALESCE(..., 0)` is the fabricated-zero pattern again: a suppressed
   member (fewer than three eligible sitting days — 4 of them today) is served
   as `0.0`, which reads as *never showed up* rather than *not enough data*.

The verification script checks both explicitly and will name whichever path is
wrong. Fixing it means routing `/api/mps` through the same resolver rather than
reading the summary view, and dropping the COALESCE so null stays null.

Depends on: nothing. Should land before 2026-08-26.

### Party strings — the same faction under two spellings
`politicians.current_party` carries variants that the seat map colours as
separate factions, because they are separate strings:

| Members | String |
| ---: | --- |
| 48 | `Lietuvos socialdemokratų partijos frakcija` |
| 5 | `Lietuvos socialdemokratų partija` |
| 26 | `Tėvynės sąjungos-Lietuvos krikščionių demokratų frakcija` |
| 2 | `Tėvynės sąjunga-Lietuvos krikščionys demokratai` |
| 9 | `Liberalų  sąjūdžio frakcija` (two spaces) |
| 2 | `Liberalų sąjūdis` |
| 19 | `„Nemuno aušros“ frakcija` |
| 1 | `Politinė partija „Nemuno Aušra“` |
| 1 | `Išsikėlė pats` |

The pattern is a party name where a faction name belongs, which suggests the
ingest writes two different source fields into one column.

**This must be settled at the source, not in the UI.** Party membership and
faction membership are genuinely different things in the Seimas — a member can
belong to a party and sit with a different group, or with none — so folding
the variants together in `partyColors.ts` would assert that 53 members sit
with LSDP when the data says 48 do and 5 carry a string nobody has checked.
Until someone confirms what these five rows mean, each string keeps its own
legend entry under its own name.

Work: find where `current_party` is populated in the ingest, determine whether
the variants are the party field leaking in or genuinely unaffiliated members,
and either normalise at ingest or add a separate faction column.

Depends on: nothing. Blocks: an accurate seat count per faction, anywhere.

### Vote outcomes — source gap
`votes.result_type` is NULL on all 5,279 rows because **the LRS source publishes
no pass/fail field** — not in `p2b.ad_sp_balsavimo_rezultatai`, not in the
sitting agenda. Deriving it from `už > prieš` is not available: Seimas
thresholds vary by act type (constitutional laws need 3/5).

Needs a source that states outcomes — the sitting protocol documents, or the
legislative-project registry — before any surface can claim one.

### Every vote carries the discrepancy flag
`source_comment` is non-null on **5,279/5,279** votes: every vote says the
electronic per-MP results disagree with the protocol totals. Either the flag is
boilerplate the source attaches unconditionally, or something systemic is wrong
with the per-MP data. Worth establishing which before the tallies are presented
alongside per-MP records.

### Apygarda (electoral district) data
`constituency_name`, `constituency_number` and `election_type` are **0/148**.
This blocks „Rask savo narį" by district, which ADR 0007 names as
mechanical-friction removal for first-time voters — so it is a 2028 item, not a
nice-to-have. Source: VRK election results.

### Android deep links
Hash routes do not route: `am start -d "https://localhost/#/…"` delivers the
intent but Capacitor loads its own start URL, so the app always opens at `/`.
Needs `@capacitor/app` `appUrlOpen` handling. Blocks shared links opening in the
app, and blocked one Workstream 2 screenshot.

### Former members are unreachable in the app
Every list is active-only (correctly), and with no deep links a former member's
profile has no navigation path in the app, though it is reachable on the web by
URL. Their records matter — votes and attendance denominators depend on them.
Needs a deliberate browse path.

### Play Store release
Sideloading needs none of this: Play Console account (one-time US$25), an App
Bundle rather than an APK, Play App Signing enrolment, a hosted privacy policy
and Data Safety form, store listing assets, content rating, and review time.

### Rotation debt
Credentials that have never been rotated since first issue. One evening's work,
scheduled deliberately rather than after an incident.

---

## Dated

### 2026-08-26 — attendance methodology v2 takes effect
ADR 0006 / methodology `attendance` v2 self-executes on this date; the 14-day
advance-notice banner has been running since 2026-08-12. **Verify on the day**
that the served methodology flips to v2, the banner clears, and the four
members suppressed by the 3-day floor are still suppressed.
