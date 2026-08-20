# Gate B — the structural rebuild, before merge

Phase 2 is done. The skin was approved at Gate A; this is what changed
underneath it. Screenshots in `docs/screenshots/jaukumas-gate-b/`.

## Commits

| Commit | What |
| --- | --- |
| `80e28be` | `/api/meta/last-sitting-day` — the one thing the wireframe needed that no endpoint served |
| `9ff19ce` | The landing, rebuilt: primacy strip, three stats, freshness line |
| `a647172` | Seat map: three encodings, persistent legend, member search |
| `f258c11` | Votes list grouping, and nav 11 → 7 |

163 dashboard tests green (31 new), 111 backend tests green (5 new).

## The landing, before and after

`before-landing-desktop-light.png` → `after-landing-desktop-light.png`

Reading order is now primacy → context → recency.

**Added — the last sitting day.** „2026 m. liepos 14 d. · 61 balsavimas ·
127 dalyvavo“, from a new endpoint. The wireframe also asked for
„5 priimta · 2 atmesta“; that is not there, because `votes.result_type`
is NULL on all 5,279 rows and the LRS feed publishes no pass/fail
field. The endpoint returns `outcomes: null` and the strip renders
nothing rather than „0 priimta“, which would read as *nothing passed
that day*. Tests pin both directions, so the line starts reporting
outcomes the moment the column is populated.

The last sitting was 37 days ago, so the recess note is showing. It
says how long it has been and deliberately **not** when sittings
resume — the return date is a fact about the future that no source here
carries, and guessing it is the same failure as a fabricated outcome.

**Cut — four stat cards to three.** „743 233 individualūs balsai“ left
the landing for the methodology page, where being able to check every
one of them is the point. Each remaining card gained the per-person
reading that makes it mean something (~38 balsavimai vienam nariui) and
a „Šaltinis“ link.

**Deleted — SISTEMOS BŪSENA.** Three hardcoded literals asserting
health nobody checked. Now one freshness line from a real timestamp,
which says „Duomenys gali būti pasenę“ past 36 hours and „Atnaujinimo
laikas nežinomas“ when there is no timestamp — because a missing
timestamp is not the same as up to date.

**Deleted — VEIKLOS SUVESTINĖ.** Five individual votes by five
individual members answers a question you ask about an MP, not about
parliament.

**Moved — „Gėdos siena“.** Not deleted. It is the same subject as the
low-attendance warnings on the transparency hub and now sits directly
below them.

## The seat map, decoded

`after-seatmap-frakcijos-light.png`, `-balsavimas-`, `-dalyvavimas-`

141 coloured dots used to mean one thing, with the legend in a floating
overlay that disappeared in exactly the mode the landing uses. Three
encodings now, each stating itself in a sentence above the map:

| Mode | Caption | Legend (real values) |
| --- | --- | --- |
| Frakcijos | „Spalva — frakcija.“ | LSDP (48) · TS-LKD (26) · Nemuno aušra (19) · … |
| Balsavimas | „Spalva — kaip narys balsavo: *[vote title]*“ | Už (89) · Nedalyvavo (51) |
| Dalyvavimas | „Spalva — ar narys balsavo paskutinę posėdžio dieną.“ | Dalyvavo (127) · Nedalyvavo (13) |

Absence is always derived from presence, never asserted. The source
records choices; a member with no row did not vote „Prieš“.

The microphone on a drawn rostrum is gone — it implied a live session
the app has no data for.

**„Rask savo narį“ is a name search, not a district lookup.**
`constituency_number`, `constituency_name` and `election_type` are NULL
for all 148 members: migration 010 created the columns and nothing ever
filled them. Backlogged, and flagged as serving October 2028 directly —
"who is *my* MP" is the first question a first-time voter asks, and the
platform currently cannot answer it.

## The votes list

`after-votes-desktop-light.png`

Grouped by sitting day; shared openings collapse under one header. The
identifier („(Nr. XVP-1766)“) is on its own line and is never clamped —
the two-line clamp applies only to the wordy part, because it was
cutting titles mid-token and the identifier is the one thing telling
two otherwise identical votes apart. Badges appear only when outcomes
vary; right now none do, so none are drawn.

The grouping is presentation only: `flattenVotes` returns every input
row exactly once, in the order given, and a test holds it there.

## Navigation

Eleven destinations, four visible plus „Daugiau“. Nothing removed —
verified in the browser that opening the group still reveals all eleven
and every route resolves. The group opens itself when you are already
on a page inside it.

## Two data problems this work found

Both were invisible until something rendered them honestly.

**1. The same faction under two spellings.** Giving every legend entry
a real label produced five reading „?“ — spelling variants of parties
already mapped: „Lietuvos socialdemokratų partija“ (5 members) next to
„…partijos frakcija“ (48), „Liberalų sąjūdis“ (2) next to „Liberalų
sąjūdžio frakcija“ (9), and so on.

They are deliberately **not** merged in the UI. Party membership and
faction membership are different things in the Seimas, and folding them
together would assert that 53 members sit with LSDP when the data says
48 do and 5 carry a string nobody has checked. Each keeps its own
honest label; the fix belongs at the source.

**2. 584 vote titles are truncated at exactly 200 characters.** Found
because the grouped list prints identifiers separately and some rows
had none to print — the stored title stops mid-token:
`…nimo“ pakeitimo“ projektas (Nr. XVP-17`.

832 of 5,279 titles do not end in `)`; 584 are exactly 200 characters,
which is a cap, not a coincidence. Checked the live results XML for an
affected vote — it carries no title element at all, so the value comes
from the agenda feed. Whether LRS caps it or something on our side does
is **not yet confirmed**; that needs one agenda fetch for a known
`posedzio_id`, which I could not reach by probing. ~11% of votes are
affected, and for those a citizen cannot tell from the list which
motion they are looking at.

## Deviations from the spec, and why

| Spec asked for | Shipped | Why |
| --- | --- | --- |
| Strip shows „5 priimta · 2 atmesta“ | Omitted | No source publishes vote outcomes |
| Recess line „posėdžiai grįš rugsėjį“ | „prieš 37 dienas“ | The return date is not in any source |
| „Rask savo narį“ by district | By name | Apygarda columns are empty for all 148 |
| Badges on anomalies | None drawn | Every outcome is null, so none discriminate |
| Real seating adjacency | Index order | No seating-position data exists |

Every one of these is the same rule: a design element whose data does
not exist gets an honest alternative and a backlog entry, never
invented content.

## Still open before merge

- The methodology page renders `**bold**` literally in version-history
  entries. Content-layer bug, predates this work.
- Android APK not yet rebuilt against the new theme — that is Phase 4,
  post-merge.
- The tally backfill is prepared and still deliberately unrun.

## The ask

Look at the before/after landing pair first, then the three seat-map
modes. If this is right, I merge to main, Vercel deploys, and Phase 4
starts: APK rebuild, emulator verification, production smoke, the
invariant audit, and the three-layer self-correction entry.
