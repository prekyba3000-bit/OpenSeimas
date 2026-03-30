# Progress: Seimas v.2

## 2026-03-24 - Operation OpenPlanter Integration

- [x] **Phase 1 — Workspace setup:** Seimas.v2 + OpenPlanter unified workspace, venvs, dashboard install, shared env / symlinks, bootstrap checks.
- [x] **Phase 2 — Agentic orchestration:** `.openplanter/settings.json`, forensic tool wrappers + JSON descriptors, `prompts/seimas_pipeline.md`, CI hook for OpenPlanter pipeline after DB refresh; `orchestrator.py` deprecated in favor of OpenPlanter.
- [x] **Phase 3 — Graph API:** `GET /api/v2/openplanter/graph` (Cytoscape payload, caching), CORS for OpenPlanter/Tauri; desktop frontend wired to Seimas graph source.
- [x] **Phase 4 — Wiki generation:** `prompts/generate_mp_wikis.md`, `dashboard/public/wikis/` + `.gitignore`, `WikiPanel` on MP profile; `techContext` / memory updated for API and wiki behaviour.

## 2026-02-24 - Operation Agentic Mind

- Installed project-level foundational rules in `.cursor/rules/`:
  - `00-project-context.mdc`
  - `01-code-standards.mdc`
  - `10-backend.mdc`
  - `11-frontend.mdc`
- Installed project-level skills in `.cursor/skills/`:
  - `run-ingest-pipeline` (+ executable `scripts/run.sh`)
  - `update-memory-bank`
  - `hero-engine`
  - `seimas-data-forensics`
  - `deploy-to-render`
- Configured persistent MCP memory server via `.mcp.json`.
- Added `.cursor/memory.json` to `.gitignore` to avoid committing personal memory state.

### Key Decisions

- Rules split into 2 always-on files (project context, code standards) and 2 glob-scoped files (backend/frontend) to reduce prompt noise.
- Skills are project-scoped to make workflows shareable across contributors.
- Memory refresh process is codified as a reusable skill to enforce continuity after major operations.

### Files Changed

- `.cursor/rules/*.mdc`
- `.cursor/skills/**`
- `.mcp.json`
- `.gitignore`
- `memory-bank/activeContext.md`
- `memory-bank/progress.md`

## Completed
- [x] Clean Build v.2 Core Architecture.
- [x] Git Repository & Remote Setup (Origin Master).
- [x] Claude-Beads Workflow Registration.
- [x] NGI Zero Commons Fund Application (Submitted).
- [x] Security & Accessibility Hardening (defusedxml, WCAG).
- [x] Legacy Artifact Cleanup (Archived chaotic remnants).
- [x] Full Project Dependency Suite Installed (pandas, bs4, defusedxml, etc.).
- [x] Taskade Integrated Duo Setup (Installed v.4.6.14).

## In Progress
- [/] NGI Zero Alignment Tasks (Accessibility & Security Audits).
- [/] NGI Zero Commons Fund application preparation.

## Future Work
- [ ] Implement robust database connection pooling in Python scripts.
- [ ] Add unit tests for name normalization and data linking.
- [ ] Create a dashboard frontend for visualization.
- [ ] Automate pipeline execution via CRON or similar.
