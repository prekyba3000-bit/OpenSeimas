# Valdžia — „Kas ir kada ėjo pareigas", the register on one time axis

2026-11-17. Request from the human: "something cool about Valdžia, visually".
Offered three forms (a timeline of offices, an animated law-flow diagram, a
decree calendar); the human chose the timeline.

## Recon (§1.8)

Read `/api/government` from production, so nothing here comes from memory:

- Three Governments. XIX: mandate 2024-12-12, resigned 2025-08-04. XX: mandate
  2025-09-25, resigned 2026-06-23. XXI: no mandate date in the register;
  started work 2026-07-14.
- Prime Ministers carry their appointment date (`from_date`): 2024-11-21,
  2025-08-26, 2026-06-30. Ministers carry one only when they replaced someone
  mid-term (two rows, both 2025-11-11).
- 83 decrees in the four listed kinds (26 treaty, 5 veto, 18 bill, 34
  nomination), 2024-11-04 → 2026-11-09.

No new data, no wire change, no backend change.

## What was built

- `utils/valdziaTimeline.ts`: `buildTimeline` turns the register into bars
  (one person, one post, one Government) on a month-aligned axis, plus the
  decrees. Its rules:
  - A bar starts on the holder's own date where the register has one (PM
    appointment, mid-term replacement), otherwise on the Government's mandate,
    else its start of work.
  - It ends where the next holder starts, or when the Government resigned. The
    current Government runs to today (Vilnius date).
  - **The gap between a resignation and the next Government's start stays
    empty.** The register does not say who held the posts then, so nothing is
    drawn there (§1.1). A thin line crosses the gap only when the same person
    holds the same post on both sides (the same name rule as `keptPost`).
  - A post whose start or end is unknown is counted (`undated`), never drawn at
    a guessed date. The page names the count.
- `components/ValdziaTimeline.tsx`, placed after the map and before the decree
  lists:
  - Rows: PM + 14 ministries. Four lanes under them: treaties, vetoes, bills,
    nominations. Lanes are told apart by position and label, not colour.
  - Government spans tinted; quarter gridlines; a today line.
  - Pressing a bar picks the person. The pick state is shared with the cabinets
    table, which already highlights by name. Their bars turn honey, everyone
    else dims, and a curve joins their posts in date order (Ruginienė: social
    security → PM → social security; Savickas: economy → energy). The same
    path is written out in words under the chart.
  - Hover or focus shows dates and title. Each decree dot links to its PDF;
    there is no link where lrp.lt has no file.
  - A name is printed in a bar only if it fits, else the surname, else
    nothing. A label is never clipped; every bar has the full text in its
    accessible name.
  - Narrow screens scroll the plot sideways under a pinned label column.
- `shortName` moved into `utils/valdzia.ts` so the view and the timeline share
  one.

## Charter check

- **§1.3 no verdicts.** Bar length is time; no duration, count, rank or score
  is printed. A test asserts no accessible name carries a duration. The legend
  says „Juostos ilgis rodo tik laiką."
- **§1.1 / §1.2.** Undated posts are counted and named. With the decree
  register unread, no lanes are drawn and the page says so. Lanes are not left
  empty, which would read as "no decrees".
- **§1.4.** Reads the same `/api/government` payload as the rest of the page.
- **§1.5.** No published metric changed; no methodology entry.
- **§1.7 rendered audit**, against production data at 1360 px (light, dark,
  with a person picked) and at 390 px. Screenshots are in
  `docs/screenshots/valdzia-timeline/`. Found and fixed by eye:
  - The today line showed the UTC date (11-16 after midnight in Vilnius). It
    now uses the Vilnius date.
  - On a phone the label column took half the screen. It is now narrower and
    pinned.
- Not mine, seen during the audit: at 390 px the document is 511 px wide on
  `/dashboard/valdzia` with or without the timeline. `body` clips it, so it
  does not scroll. Recorded, not chased.

## LT-COPY inventory (all need native review)

Every string in `components/ValdziaTimeline.tsx`: the heading, intro, lane
names (Sutartys, Veto, Projektai, Skyrimai), legend lines, hover hint, „iki
šiol", „šiandien", the undated note. Month abbreviations in
`utils/valdziaTimeline.ts`.

## Suites

Dashboard **490 passed**. 16 tests are new here (10 for the helper, 6 for the
component). The last RESUME entry says 473; 473 + 16 = 489, and I have not
traced the extra one. `tsc --noEmit` clean, `vite build` built. Backend
untouched.
