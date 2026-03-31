# ADR 0004: List virtualization policy

## Status

Accepted

## Context

Parliamentary datasets (votes, MPs, contracts) can grow large enough to stress the DOM. The council mandates virtualization for long lists.

## Decision

- Library: **`@tanstack/react-virtual`** (aligns with TanStack Query).
- **Threshold:** Any view that can exceed **~100** rendered row/card nodes in the default UX path should use virtualization or pagination (votes already paginate API-side; the client may still hold hundreds after “load more”).
- **Layout:** Prefer a **single scroll parent** with fixed or `max-height` and `overflow: auto`; virtualizer `getScrollElement` targets that parent. **Table** views: virtualize `<tbody>` rows only; keep `<thead>` sticky outside the virtual window.
- **Pilot (implemented):** [`VotesListView`](../../Seimas.v2/dashboard/src/views/VotesListView.tsx) — virtual list of `VoteCard` rows with estimated row height and `measureElement` where needed later.

## Deferred

- [`MpsListView`](../../Seimas.v2/dashboard/src/views/MpsListView.tsx) uses a **multi-column grid** of cards; virtualizing grids is a separate pattern (column-aware virtualizer or CSS column refactor). Track in backlog.
- [`StebsenaView`](../../Seimas.v2/dashboard/src/views/StebsenaView.tsx) table virtualization when row counts justify it.

## Consequences

- Slightly more complex list code (refs, estimated sizes).
- Improves scroll performance for long vote lists after repeated “load more”.
