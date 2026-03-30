# OpenSeimas — Monorepo

Single Git repository for the **Seimas.v2** (transparency stack) and **OpenPlanter** (investigation agent) workspace.

**Previous standalone remotes (for history / comparison):**

- `Seimas.v2` was `https://github.com/prekyba3000-bit/Seimas.v2.git`
- `OpenPlanter` was `https://github.com/ShinMegamiBoson/OpenPlanter.git`

This repo replaces nested checkouts with one tree. Old `.git` directories were moved to a sibling folder **`OpenSeimas-nested-git-backup-<timestamp>/`** on the machine that performed the migration (same parent directory as this repo).

## Structure

| Directory | Description |
|---|---|
| `Seimas.v2/` | Lithuanian Parliament transparency platform (FastAPI + React + PostgreSQL) |
| `OpenPlanter/` | Recursive LLM investigation agent (Python CLI + Tauri desktop) |
| `.env` | Shared credentials file (never commit this) |
| `.env.template` | Credential template — copy to `.env` and fill in values |
| `openclaw/` | **Not tracked** — large optional subtree; ignored at monorepo root |

## Quick Start

1. Fill in `/home/julio/Documents/OpenSeimas/.env` with your real credentials.
2. Start the Seimas.v2 backend: `cd Seimas.v2 && source .venv/bin/activate && uvicorn backend.main:app --reload`
3. Start the React dashboard: `cd Seimas.v2/dashboard && npm run dev`
4. Run the OpenPlanter agent: `cd OpenPlanter && source .venv/bin/activate && openplanter-agent --workspace ../Seimas.v2`

## Git / monorepo

- **Remote:** `https://github.com/prekyba3000-bit/OpenSeimas` (branch `main`).
- **Do not commit** `Seimas.v2/.openplanter/sessions/` — traces can include API keys; they are **gitignored**.

## Merger Plan

See `Seimas.v2/memory-bank/` for the full project context and the `.openplanter/` directory (created in Phase 1) for the integration configuration.

## Dashboard install note

If `npm install` fails on peer dependency conflicts, use:

`cd Seimas.v2/dashboard && npm install --legacy-peer-deps`
