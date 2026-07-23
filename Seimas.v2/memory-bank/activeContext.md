# Active Context: Seimas v.2

## V.4 CLEANUP (2026-07, branch `cleanup/create-pipeline`) — READ FIRST

The V.3 → V.4 "Observatory pivot" cleanup was executed with Kimi Code. **Everything below the "V.3 era" line is historical context, not current state.**

What changed:
- **OpenPlanter retired.** Its role is replaced by Kimi Code as the agent layer. Pre-cleanup state preserved on branch `archive/v3`, tags `v3-final` / `v3-archive`.
- **Prompts → Kimi skills:** `.openplanter/prompts/seimas_pipeline.md` → `.kimi-code/skills/seimas-pipeline/SKILL.md`; `generate_mp_wikis.md` → `.kimi-code/skills/seimas-mp-wikis/SKILL.md`.
- **Forensic tools moved:** `.openplanter/tools/` → `Seimas.v2/tools/` (seimas_benford/chrono/phantom, validate_wiki_identity).
- **Wiki content archived:** `docs/wiki-archive/` (openplanter-wiki + mp-wikis).
- **Deleted (V.3 legacy):** OpenPlanter tree, `.openplanter/`, Figma/, design-system/, drizzle alternate stack, gaming-HUD prototype components (`Live_Spectator_HUD`, `KillFeed`, `DashboardMissionControl`, `*Showcase.tsx`, etc.), `orchestrator.py`, Taskade sync, `analyze_*.py`, `sync_real_mps.py`, one-off SQL/data dumps, graphiti MCP layer (moved to `~/Documents/OpenSeimas-v4-graveyard/`).
- **Still live (deliberately kept for now):** hero engine + `/api/v2/heroes/*` (powers the current deployed dashboard — remove when the V.4 frontend/API lands), shadcn `ui/` kit, share-card renderer (re-skin planned).
- **V.4 direction drafts** from several models live in `docs/V4-build-plan-*.md`. A voter-guidance product direction emerged during the same period (see root `AGENTS.md` draft by another agent) — reconcile with the Observatory strategy before building.

## Current Focus (V.3 era — historical)
Stabilize the Hero Parliament platform as a transparent, auditable system with persistent agent context and operational runbooks. **Primary orchestration for data and forensic refresh is OpenPlanter** (see below). *(Superseded: orchestration is now the `seimas-pipeline` Kimi skill.)*

## Recent Changes
- **Operation OpenPlanter Integration** is complete (all four phases). Details: [Operation OpenPlanter Integration](#operation-openplanter-integration).
- Operation Hero Parliament: added hero engine, `/api/v2/heroes/{mp_id}`, HeroCard integration.
- Operation True Score: introduced direct-data schema expansion (`speeches`, `committee_memberships`, `bills_authored_count`) and ingestion scripts.
- Operation Glass Box: calibrated forensic penalties, added `forensic_breakdown`, and score explainability UI.
- Operation Agentic Mind: installed project rules, skills, MCP memory config, and memory maintenance workflow.

## Operation OpenPlanter Integration

End-to-end merger of Seimas.v2 with OpenPlanter for agent-driven pipelines, graph export, and optional forensic wiki generation. Unified workspace parent: `/home/julio/Documents/OpenSeimas/` (Seimas.v2 + OpenPlanter). See repo root `merger_plan_and_cursor_prompts.md` for the original prompt sequence.

### Phase 1 — Workspace setup
- Monorepo-style layout with Seimas.v2 and OpenPlanter clones, Python venvs, dashboard install (`npm install --legacy-peer-deps`), shared `.env` / symlinks, and bootstrap verification.

### Phase 2 — Agentic orchestration
- **`.openplanter/`** workspace: `settings.json` (workspace name, `tools_dir`, `prompts_dir`), forensic **CLI wrappers** under `.openplanter/tools/` (`seimas_benford.py`, `seimas_chrono.py`, `seimas_phantom.py`, shared `_bootstrap.py`) with JSON tool descriptors (`*.json`).
- **`prompts/seimas_pipeline.md`**: canonical ordered pipeline (ingest, link, votes, optional assets, forensic engines, report). Intended to be run by the OpenPlanter agent via `run_shell`.
- **CI**: GitHub Actions workflow includes an OpenPlanter pipeline job after DB view refresh where applicable.
- **`orchestrator.py`**: **deprecated** — superseded by OpenPlanter + `seimas_pipeline.md`; kept for local debugging and fallback only (see file header).

### Phase 3 — Graph API
- **`GET /api/v2/openplanter/graph`**: Cytoscape-style JSON (`nodes`, `edges`, `generated_at`) for active MPs and phantom-network links; server-side cache (~300s). CORS updated for OpenPlanter / Tauri origins as needed.
- **OpenPlanter desktop** (`openplanter-desktop` frontend): Seimas graph provider, source selector, styling aligned with integrity/alignment signals.

### Phase 4 — Wiki generation
- **`prompts/generate_mp_wikis.md`**: task spec for flagging low-integrity MPs (API / DB), `subtask` per MP, `web_search`, evidence-backed markdown, `write_file` to `dashboard/public/wikis/<mp_id>.md` and `index.json`.
- **Dashboard**: `WikiPanel.tsx` on MP profile (`MpProfileView`); static assets under `dashboard/public/wikis/` (`.gitkeep`, `*.md` gitignored).

## Current State
- Backend hero scoring and forensic explainability are implemented in `backend/hero_engine.py`.
- Leaderboard and hero profile APIs are integrated (`/api/v2/heroes/leaderboard`, `/api/v2/heroes/{mp_id}`, `LeaderboardView.tsx`, `MpProfileView.tsx`).
- **OpenPlanter is the active pipeline manager** for the full ingest + forensic sequence documented in `.openplanter/prompts/seimas_pipeline.md`. **`orchestrator.py` is deprecated** in favor of that flow.
- **Graph export** for OpenPlanter is live at **`GET /api/v2/openplanter/graph`**.
- **Forensic wikis** are optional static markdown consumed by `WikiPanel` when files exist under `dashboard/public/wikis/`.
- Ingestion pipeline scripts and migrations remain in-repo; persistent guidance in `.cursor/rules/`, `.cursor/skills/`, and `memory-bank/`.
- MCP memory is configured via `.mcp.json`; local memory file is ignored in git.

## Next Steps
1. **Deploy OpenPlanter** to a persistent host (or runner) so **`seimas_pipeline.md`** (and optionally **`generate_mp_wikis.md`**) can run on a schedule without a developer laptop.
2. Add **`OPENAI_API_KEY`** (or equivalent provider key required by OpenPlanter) to **Render** (and any other deployment) **environment variables** for agent runs in production.
3. **End-to-end test** the **Tauri** OpenPlanter desktop app against the deployed **`/api/v2/openplanter/graph`** endpoint (URL config, CORS, payload shape, and graph rendering).
4. Run migrations and full ingest pipeline on a configured DB (`DB_DSN`) and validate row populations after automated runs.
5. Convert API responses to explicit Pydantic response models in FastAPI endpoints where it pays off.
6. Add or extend API and UI tests for forensic breakdown, leaderboard integrity indicators, and graph/wiki surfaces.
