# ADR 0003: Client state — TanStack Query (dashboard) vs Zustand (OpenPlanter) and Tauri IPC

## Status

Accepted

## Context

The council requires server-state caching for the public portal and durable, nested client state for multi-hour journalist sessions on the desktop. The web app must not treat the server as optional cache in client stores.

## Decision

### Seimas.v2 dashboard (React)

- Use **TanStack Query (React Query)** for **server-backed reads** (HTTP to FastAPI). Default query options (tunable per query):
  - `staleTime`: **5 minutes** for slowly changing public data (e.g. MP roster).
  - `gcTime`: **30 minutes** (formerly cacheTime).
- **Do not** mirror server lists in global client stores (e.g. Zustand/Redux) except for ephemeral UI (modal open, selected tab).
- **Errors and rate limits:** Centralize `QueryClient` `defaultOptions.queries.retry` and per-query `throwOnError` / UI `onError` for **429** and problem-details bodies (product copy lives in i18n; wiring hooks belong here).

### OpenPlanter desktop (Tauri + React)

- Use **Zustand** (or equivalent minimal store) for **investigation workspace** state: case id, message list, retrieved documents, citations, annotations — **serialized** for persistence where product requires it.
- **Tauri IPC:** Document commands/events in a dedicated ADR section or OpenPlanter doc; complex work runs **off the UI thread** (Rust sidecar / commands); the webview sends commands and receives structured JSON. Follow [`OpenPlanter/CLAUDE.md`](../../OpenPlanter/CLAUDE.md): validate with `cargo tauri dev`, not mocks alone.

## Pilot (dashboard)

- `QueryClientProvider` wraps the app in [`main.jsx`](../../Seimas.v2/dashboard/src/main.jsx).
- **First query:** MP roster via `useQuery` in [`MpsListView.tsx`](../../Seimas.v2/dashboard/src/views/MpsListView.tsx) (`queryKey: ['mps','roster']`, `queryFn: () => api.getMps()`).

## Consequences

- Bundle size increases slightly (`@tanstack/react-query`).
- OpenPlanter store + IPC implementation is **documentation-first** in this tranche; code changes there are a follow-up PR.
