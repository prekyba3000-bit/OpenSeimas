# OpenSeimas — Monorepo

Single Git repository for the **Seimas.v2** Lithuanian Parliament transparency platform (FastAPI + React + PostgreSQL).

**V.4 ("Observatory pivot") is in preparation.** The former second component — **OpenPlanter** (recursive LLM investigation agent) — was retired in the V.4 cleanup: its product role is replaced by Kimi Code as the agent layer, its prompts live on as Kimi skills (`.kimi-code/skills/`), its forensic tool wrappers moved to `Seimas.v2/tools/`, and its generated wiki content is archived in `docs/wiki-archive/`. The full pre-cleanup state is preserved on branch `archive/v3` and tags `v3-final` / `v3-archive`.

**Previous standalone remotes (for history / comparison):**

- `Seimas.v2` was `https://github.com/prekyba3000-bit/Seimas.v2.git`
- `OpenPlanter` was `https://github.com/ShinMegamiBoson/OpenPlanter.git`

## Structure

| Directory | Description |
|---|---|
| `Seimas.v2/` | Lithuanian Parliament transparency platform (FastAPI + React + PostgreSQL) |
| `Seimas.v2/tools/` | Forensic engine CLI wrappers (Benford, chrono, phantom) + wiki identity validator |
| `packages/` | Shared TypeScript contracts (`open-seimas-contracts`) |
| `docs/` | ADRs, V.4 build-plan drafts, wiki archive, project history |
| `.kimi-code/skills/` | Kimi Code skills: `seimas-pipeline` (data refresh), `seimas-mp-wikis` (forensic wiki generation) |
| `.env` | Shared credentials file (never commit this) |
| `.env.template` | Credential template — copy to `.env` and fill in values |

## Quick Start

1. Fill in `.env` with your real credentials.
2. Start the backend: `cd Seimas.v2 && source .venv/bin/activate && uvicorn backend.main:app --reload`
3. Start the React dashboard: `cd Seimas.v2/dashboard && npm run dev`
4. Run the data pipeline: use the `seimas-pipeline` Kimi skill, or run the ingest scripts manually (see `Seimas.v2/pipeline_report.md` format).

## Git / monorepo

- **Remote:** `https://github.com/prekyba3000-bit/OpenSeimas` (branch `main`).
- V.4 cleanup work happens on `cleanup/create-pipeline`; V.3 is archived on `archive/v3`.

## Merger Plan (historical)

See `docs/history/merger_plan_and_cursor_prompts.md` for the V.3-era Seimas.v2 × OpenPlanter integration rationale, and `Seimas.v2/memory-bank/` for project context.

## Dashboard install note

If `npm install` fails on peer dependency conflicts, use:

`cd Seimas.v2/dashboard && npm install --legacy-peer-deps`
