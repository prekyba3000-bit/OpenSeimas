# Gate A — the „Jaukumas“ skin, before the structural rebuild

Phase 3 is done. This is the pause the plan calls for: the skin is on,
the structure is untouched, and the question in front of you is only
**„does it feel right?“** — because *„is it wired right?“* was answered
by the test suite before the palette landed.

## How it was sequenced

Two commits, deliberately separate.

| | Commit | What it changed | Tests |
| --- | --- | --- | --- |
| Layer 1 | `18a0c59` | The `dark` class became load-bearing. Split `:root` into light + `.dark`, removed the forced `classList.add('dark')`, wired `prefers-color-scheme` and a three-state toggle. **No colour changed.** | 128 green |
| Layer 2 | `c1ab70e` | Palette, typography, shape. | 128 green |
| Polish | `6842642` | Leaks and caps found while shooting the screenshots. | 132 green |

The split was the point. Layer 1 is behaviour-preserving plumbing that
had to go green *before* the palette sat on top of it, so that any
failure here would be attributable to one layer or the other. Nothing
failed in Layer 1.

## Screenshots

`docs/screenshots/jaukumas-gate-a/`

| Surface | Desktop 1920 | Mobile 360 |
| --- | --- | --- |
| Landing | `landing-desktop-{light,dark}.png` | `landing-mobile-{light,dark}.png` |
| Dashboard | `dashboard-desktop-{light,dark}.png` | `dashboard-mobile-{light,dark}.png` |
| MP profile | `mp-profile-desktop-{light,dark}.png` | `mp-profile-mobile-{light,dark}.png` |
| Methodology | `about-desktop-{light,dark}.png` | — |
| MP list | `mp-list-desktop-light.png` | — |
| Transparency hub | `skaidrumas-desktop-light.png` | — |

Captured from the production build served by `npm run preview`, against
the live API, so what is shown is real data on real content lengths.

## What the skin actually is

**Palette.** Linen, paper, ink, pine, clay. Warm neutrals with the
chroma capped, and no pure red or green anywhere. Three tokens name the
decision that matters — `--vote-for`, `--vote-against`, `--vote-abstain`
— because `bg-primary` at a vote-tally call site reads as "the brand
colour" and hides the choice being made. A vote against something is not
an error state; a vote for something is not a build passing. They
replaced `bg-green-500` / `bg-red-500` / `bg-amber-500`, which is the
palette of a monitoring console applied to a parliament.

**Typography.** Literata for headings, Source Sans 3 for body, both
self-hosted with `latin-ext` so ą č ę ė į š ų ū ž render rather than
falling back mid-word. Sizes follow a 1.25 modular scale on a 16px base,
set on Tailwind's own `--text-*` keys so every existing utility moved
onto the scale without touching a component. 13px is the floor.

**Shape.** Warm shadows tinted with the ink brown, low opacity, no
glows. A card sits on the linen; it does not hover over a void.

**Dark mode** is warm charcoal (`#211E1A`), never blue-black, and is now
reachable — before this branch the `dark` class was decorative and there
was no light theme to switch to.

## Contrast

Measured, not eyeballed: `docs/reviews/jaukumas-contrast.md`, generated
by a script that reads the tokens out of `index.css` and
`partyColors.ts` rather than carrying a copy of them. Every text pair
clears 4.5:1 in both themes; every faction colour clears 3:1 against the
page in both themes.

Five values failed and were changed rather than waived. Two are worth
your attention because they were *already signed off*:

- Plum and moss passed at 3.01:1 — **measured against the card**. A
  faction dot also appears on the page, which is darker, where they were
  2.98 and 2.84.
- Clay passed at 4.00:1 on the **large-text** threshold. It is used for
  13px vote tallies, where that threshold does not apply.

Both are the same mistake: measuring against the easier of two surfaces
the colour actually appears on.

## Things found while doing this, and fixed

These were not on the plan. They surfaced because a light theme shows
you what a dark one hides.

1. **`bg-surface` in `Card.tsx` is an undefined utility.** No
   `--color-surface` exists, so Tailwind emitted nothing and **every
   card in the app had no background at all.** Invisible on dark-on-dark.
2. **Sixteen CSS variables referenced by live components are defined
   nowhere** — `--text-primary`, `--glass-border`, `--status-success` and
   the rest. An undefined `var()` makes the declaration invalid at
   computed-value time, so ~49 colour declarations across `MpCard`,
   `Button`, `VoteBreakdown`, `MpsListView` and `StatCard` were doing
   nothing. This is the same bug as the white-body-text one found in
   Layer 1, at scale.
3. **The sidebar title was `text-white`** on what is now a
   paper-coloured sidebar.
4. **English on a Lithuanian page**, twice: `DataStripVote` printed the
   raw enum („PASSED“) as its verdict badge, and the four forensic
   engine names headed „Kodėl toks balas?“ on every MP profile in
   English. Both are composed client-side. Both are now pinned by the
   leak guard — which is what caught the five *copies* of those names on
   the transparency hub that the first fix missed.
5. **The „Sistemos būsena“ card was mostly hole**, left over from
   removing the three hardcoded status literals.

## Known and deliberately left for Phase 2

- The landing page structure is unchanged — that is Phase 2's whole job.
  The recess-honesty line is deferred to land with the last-sitting-day
  strip, since they share a computed date.
- The methodology page renders `**bold**` markdown literally in the
  version-history entries. Content-layer bug, not a skin one.
- Two more dead files found by walking the import graph rather than
  grepping: `components/VotesListView.tsx` and `VoteListCard.tsx`. The
  dead-code workstream in the backlog now says eighteen, and says to
  re-derive the count from the import graph rather than trust the list.
- There is no guard preventing the next phantom variable. A build-time
  check that every `var(--x)` resolves would have caught all seventeen
  at once. Filed in the backlog.

## The question for you

Look at the six pairs. If the answer is „taip“, Phase 2 rebuilds the
landing structure on top of this. If something in the *feel* is wrong —
the serif, the warmth, the weight of the pine — this is the cheapest
possible moment to say so, because no structure has been built on it
yet.
