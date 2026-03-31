# ADR 0001: Monorepo workspaces (npm)

## Status

Accepted

## Context

The repository ships multiple frontends ([`Seimas.v2/dashboard`](../../Seimas.v2/dashboard), OpenPlanter desktop webview, optional Figma tooling) and needs shared TypeScript contracts without copy-paste. There was no root workspace.

## Decision

- Use **npm workspaces** at the repository root ([`package.json`](../../package.json)) because the dashboard already uses npm and `package-lock.json`; team familiarity and a single lockfile at root reduce friction.
- **Phase 1 workspaces:** `packages/*` and `Seimas.v2/dashboard`.
- **Deferred:** Add [`OpenPlanter/openplanter-desktop/frontend`](../../OpenPlanter/openplanter-desktop/frontend) when we need shared imports there; Tauri build paths and separate CI should be validated first.

## Workspace package naming

- Shared library: **`@open-seimas/contracts`** ([`packages/open-seimas-contracts`](../../packages/open-seimas-contracts)).
- Dashboard workspace package name remains **`dashboard`** (npm `-w dashboard`).
- The dashboard declares the dependency as **`file:../../packages/open-seimas-contracts`** so npm versions that do not support the `workspace:*` protocol still link the workspace package reliably.

## CI / local commands

From repo root:

| Goal | Command |
|------|---------|
| Install all workspaces | `npm install` |
| Dashboard dev | `npm run dev -w dashboard` |
| Dashboard build | `npm run build -w dashboard` |
| Dashboard test | `npm run test -w dashboard` |

Existing workflows under [`Seimas.v2/.github/workflows/`](../../Seimas.v2/.github/workflows/) may keep running `npm ci` / `npm run build` **inside** `Seimas.v2/dashboard` until they are updated to root `npm ci` + `-w dashboard` (follow-up).

## Install notes

- If npm reports peer dependency conflicts (common with the Vitest stack), use **`npm install --legacy-peer-deps`** at the repo root.
- **Vitest** may be hoisted to the root `node_modules` while `jsdom` stayed under the dashboard workspace; the root [`package.json`](../../package.json) includes **`jsdom`** in `devDependencies` so fork workers can resolve it.

## Consequences

- Contributors run `npm install` once at the repo root before working on the dashboard.
- Path and Vite `server.fs.allow` must permit resolving `packages/*` (see dashboard Vite config).
