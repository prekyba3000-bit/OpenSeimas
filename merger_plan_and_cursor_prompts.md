# Seimas.v2 × OpenPlanter — Merger Strategy & Cursor Agent Prompts

---

## Reliability & portability (canonical)

These rules align this document with the OpenSeimas execution plan. Agents should follow them even when not repeated in every prompt.

- **Shared `.env` symlinks:** Always use **absolute** paths in `ln -sf` (as in Prompt 0). Relative targets break easily on **macOS** and when the workspace is opened from different working directories.
- **Stage 0 memory checkpoint:** After cloning, add a minimal **“OpenPlanter integration — started”** section to `Seimas.v2/memory-bank/activeContext.md` (workspace root path, Prompt 0 done, next: Phase 1 / optional parallel Phase 3). **Cursor Prompt 5** then expands this into the full “Operation OpenPlanter Integration” narrative.
- **Forensic tool wrappers:** Each `.openplanter/tools/seimas_*.py` must support **`--dry-run`**: exit 0 and print JSON such as `{"status": "dry_run", "mps_analyzed": 0}` (or the analogous count field) **without** connecting to PostgreSQL, so developers can verify imports without `DB_DSN`.
- **GitHub Actions:** The `openplanter_pipeline` job uses `continue-on-error: true`. Confirm **`OPENAI_API_KEY`** exists in the repo’s **Actions secrets** before expecting CI to run the agent; otherwise the job may fail or no-op quietly while `refresh_view` still passes—check workflow logs after the first push.
- **Wiki task data source:** Prefer HTTP to the leaderboard API; if the response is not 2xx or times out (e.g. Render free tier asleep), **fall back to `psql` using `DB_DSN`** to obtain the same flag list.
- **OpenPlanter graph UI:** Implement `OpenPlanter/frontend/src/api/SeimasProvider.ts` (not `SeiamasProvider.ts`), **configurable Seimas API base URL**, and **loading / error / empty** states—do not show an empty graph on network failure; distinguish errors from “200 with zero nodes”.

---

## Prompt 0 — Local Workspace Setup (Run This First)

This prompt must be executed **before all others**. It clones both repositories into a unified monorepo directory on your machine, installs all dependencies for both projects, creates the shared environment file, and verifies that every tool in the stack is reachable. Use **one** workspace root for every path in Prompt 0 (including **absolute** symlinks in STEP 7). The paths below use `/home/julio/Documents/OpenSeimas/` as the example — substitute your own absolute path everywhere if different.

```
You are a setup agent on a Unix-like system (Linux or macOS). These shell steps are not written for native Windows; use WSL2 or translate paths/commands yourself. Your task is to bootstrap the unified OpenSeimas workspace by cloning two repositories, installing their dependencies, and verifying the environment.

Workspace root for this run (must match every step below, including ln -sf targets): /home/julio/Documents/OpenSeimas/

Do not ask for confirmation before any step. Execute everything sequentially. If a step fails, print the error clearly and attempt the most likely fix before moving on.

---

STEP 1 — Create the workspace root

Run:
  mkdir -p /home/julio/Documents/OpenSeimas
  cd /home/julio/Documents/OpenSeimas

---

STEP 2 — Clone Seimas.v2

Run:
  git clone https://github.com/prekyba3000-bit/Seimas.v2.git Seimas.v2

After cloning, verify the directory exists:
  ls Seimas.v2/backend/main.py

If the file is missing, print "ERROR: Seimas.v2 clone failed" and stop.

---

STEP 3 — Clone OpenPlanter

Run:
  git clone https://github.com/ShinMegamiBoson/OpenPlanter.git OpenPlanter

After cloning, verify the directory exists:
  ls OpenPlanter/agent/__main__.py

If the file is missing, print "ERROR: OpenPlanter clone failed" and stop.

---

STEP 4 — Set up Seimas.v2 Python environment

Run:
  cd /home/julio/Documents/OpenSeimas/Seimas.v2
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt

Also install the skaidrumas analysis dependencies (scipy, sklearn, networkx, rapidfuzz, loguru):
  pip install scipy scikit-learn networkx rapidfuzz loguru sqlalchemy

Verify FastAPI is installed:
  python3 -c "import fastapi; print('FastAPI OK:', fastapi.__version__)"

Deactivate the venv after:
  deactivate

---

STEP 5 — Set up OpenPlanter Python environment

Run:
  cd /home/julio/Documents/OpenSeimas/OpenPlanter
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -e .
  pip install textual networkx

Verify the CLI entry point is available:
  openplanter-agent --help

If the command is not found, run:
  pip install -e ".[textual]"

Deactivate the venv after:
  deactivate

---

STEP 6 — Set up the Seimas.v2 React dashboard

Run:
  cd /home/julio/Documents/OpenSeimas/Seimas.v2/dashboard
  npm install

Verify the build works:
  npm run build 2>&1 | tail -5

If the build fails due to a missing environment variable (VITE_API_URL), create the file:
  echo 'VITE_API_URL=https://seimas-api.onrender.com' > .env.local

Then retry:
  npm run build 2>&1 | tail -5

---

STEP 7 — Create the shared .env template

Create the file /home/julio/Documents/OpenSeimas/.env.template with the following content (do not fill in real values — this is a template):

  # ── Seimas.v2 Backend ──────────────────────────────────────────
  DB_DSN=postgresql://user:password@host:5432/seimas
  SYNC_SECRET=change-me-to-a-random-string

  # ── OpenPlanter LLM Providers ──────────────────────────────────
  OPENAI_API_KEY=sk-...
  ANTHROPIC_API_KEY=sk-ant-...
  OPENROUTER_API_KEY=sk-or-...

  # ── OpenPlanter Search & Embeddings ────────────────────────────
  EXA_API_KEY=exa-...
  VOYAGE_API_KEY=pa-...

  # ── Seimas.v2 Frontend ─────────────────────────────────────────
  VITE_API_URL=https://seimas-api.onrender.com

Then create the actual .env file by copying the template:
  cp /home/julio/Documents/OpenSeimas/.env.template /home/julio/Documents/OpenSeimas/.env

Add a note at the top of the .env file:
  # Fill in your real credentials before running any scripts.
  # Never commit this file to git.

Create symlinks so both sub-projects can find the shared .env. Use exactly these absolute paths (required for portability, especially on macOS):
  ln -sf /home/julio/Documents/OpenSeimas/.env /home/julio/Documents/OpenSeimas/Seimas.v2/.env
  ln -sf /home/julio/Documents/OpenSeimas/.env /home/julio/Documents/OpenSeimas/OpenPlanter/.env

---

STEP 8 — Memory bank continuity checkpoint

Update Seimas.v2/memory-bank/activeContext.md with a short new section (e.g. "## OpenPlanter integration — started") stating:
  - The unified workspace root path (/home/julio/Documents/OpenSeimas/)
  - That Prompt 0 (bootstrap) is complete
  - Next: run Cursor Prompt 1 (and optionally Prompt 3 in parallel after clones exist)

This lets a future Cursor session resume without re-reading this entire document.

---

STEP 9 — Create the workspace README

Create the file /home/julio/Documents/OpenSeimas/README.md with the following content:

  # OpenSeimas — Unified Workspace

  This directory is the monorepo root for the merged Seimas.v2 × OpenPlanter civic intelligence platform.

  ## Structure

  | Directory | Description |
  |---|---|
  | `Seimas.v2/` | Lithuanian Parliament transparency platform (FastAPI + React + PostgreSQL) |
  | `OpenPlanter/` | Recursive LLM investigation agent (Python CLI + Tauri desktop) |
  | `.env` | Shared credentials file (never commit this) |
  | `.env.template` | Credential template — copy to .env and fill in values |

  ## Quick Start

  1. Fill in `/home/julio/Documents/OpenSeimas/.env` with your real credentials.
  2. Start the Seimas.v2 backend: `cd Seimas.v2 && source .venv/bin/activate && uvicorn backend.main:app --reload`
  3. Start the React dashboard: `cd Seimas.v2/dashboard && npm run dev`
  4. Run the OpenPlanter agent: `cd OpenPlanter && source .venv/bin/activate && openplanter-agent --workspace ../Seimas.v2`

  ## Merger Plan

  See `Seimas.v2/memory-bank/` for the full project context and the `.openplanter/` directory (created in Phase 1) for the integration configuration.

---

STEP 10 — Final verification

Run the following checks and print a summary table of results:

  1. python3 /home/julio/Documents/OpenSeimas/Seimas.v2/.venv/bin/python -c "import fastapi, psycopg2, defusedxml; print('Seimas.v2 backend deps: OK')"
  2. python3 /home/julio/Documents/OpenSeimas/OpenPlanter/.venv/bin/python -c "import rich, prompt_toolkit; print('OpenPlanter agent deps: OK')"
  3. ls /home/julio/Documents/OpenSeimas/Seimas.v2/dashboard/dist/index.html && echo "Dashboard build: OK" || echo "Dashboard build: NOT FOUND"
  4. ls /home/julio/Documents/OpenSeimas/.env && echo ".env file: OK" || echo ".env file: MISSING"

Print a final summary:
  "=== OpenSeimas workspace is ready at /home/julio/Documents/OpenSeimas/ ==="
  "Next step: fill in .env with your credentials, then run Cursor Prompt 1."
```

---

## Part 1: Architectural Vision

The merger does not dissolve either project into the other. Instead, it establishes a **layered architecture** where each system occupies a clearly defined role:

> **Seimas.v2** becomes the domain-specific data and scoring engine — the source of truth for Lithuanian parliamentary data, forensic analysis, and Hero Engine profiles.
>
> **OpenPlanter** becomes the autonomous reasoning and investigation layer — the agent that orchestrates the pipeline, interprets the data, builds the knowledge graph, and generates human-readable evidence documents.

The combined system can be thought of as a **civic intelligence platform** with four distinct strata:

| Layer | System | Responsibility |
|---|---|---|
| **Data Ingestion** | Seimas.v2 (`ingest_*.py`) | Pull raw data from Seimas, VRK, VMI APIs into PostgreSQL |
| **Forensic Analysis** | Seimas.v2 (`skaidrumas/analysis/`) | Run Benford, Chrono, Phantom Network, Vote Geometry, Loyalty engines |
| **Agentic Orchestration** | OpenPlanter (CLI agent) | Manage the pipeline, handle errors, enrich data via web search |
| **Visualisation & Reporting** | OpenPlanter (Tauri desktop) + Seimas.v2 (React dashboard) | Knowledge graph, Hero leaderboard, Wiki reports |

The key architectural decision is that **no code is deleted from either project**. The merger is achieved by adding a `.openplanter/` configuration directory to the `Seimas.v2` repository and adding a `seimas-mode` data source to the OpenPlanter frontend.

---

## Part 2: Phased Execution Strategy

### Phase 1 — Workspace Integration & Tool Exposure

**What it achieves:** OpenPlanter gains the ability to natively invoke Seimas.v2's forensic engines as first-class tools, without any manual scripting.

The `Seimas.v2` repository receives a new `.openplanter/` directory that acts as the configuration root for OpenPlanter when it is pointed at this workspace. Inside this directory, Python wrapper scripts expose the forensic engine functions as CLI-invocable commands, and corresponding JSON tool-definition files describe these commands to the OpenPlanter LLM in the format it expects. This means the agent can write `run_shell("python .openplanter/tools/seimas_benford.py")` and receive structured JSON output from the Benford analysis engine — the same output that currently feeds the Hero Engine's `INT` score.

**Deliverables:** `.openplanter/tools/seimas_benford.py`, `.openplanter/tools/seimas_chrono.py`, `.openplanter/tools/seimas_phantom.py`, and their corresponding `.json` tool definition schemas. Each Python wrapper must support **`--dry-run`** (exit 0, JSON `{"status": "dry_run", ...}` without opening a DB connection) for setup verification when `DB_DSN` is unavailable.

---

### Phase 2 — Agentic Pipeline Orchestration

**What it achieves:** The static, linear `orchestrator.py` is superseded by an OpenPlanter agent that can reason about pipeline failures, retry steps, and produce a structured report.

A master system prompt (`.openplanter/prompts/seimas_pipeline.md`) is written for OpenPlanter that defines the full standard operating procedure for a Seimas data refresh. The agent follows the same sequential steps as the current orchestrator (Ingest MPs → Link VRK → Ingest Votes → Run Forensics), but it can now read error logs, identify the root cause of a failure (e.g., a changed API endpoint), attempt a fix using `edit_file`, and retry — all without human intervention. At the end of each run, it writes a `pipeline_report.md` summarising what was ingested, what forensic anomalies were detected, and which MPs changed alignment tier.

**Deliverables:** `.openplanter/prompts/seimas_pipeline.md`, updated `.github/workflows/refresh_db.yml` to invoke OpenPlanter headlessly instead of the old orchestrator. Before relying on CI, ensure **`OPENAI_API_KEY`** is set in the repository **Actions secrets**; with `continue-on-error: true`, a missing key may not block `refresh_view`—verify logs on the first workflow run.

---

### Phase 3 — Knowledge Graph & API Unification

**What it achieves:** The OpenPlanter desktop app's Cytoscape.js knowledge graph is populated with live Seimas data, rendering MPs, parties, and phantom network edges in a single interactive visualisation.

The Seimas.v2 FastAPI backend receives a new endpoint — `/api/v2/openplanter/graph` — that serialises the current database state into the Cytoscape.js node/edge JSON format. MP nodes carry their Hero Engine alignment as a colour category, their `integrity_score` as a size weight, and their `current_party` as a cluster group. Phantom Network edges connect MP nodes to corporate entity nodes, with `hop_count` encoded as edge thickness. Faction alignment edges connect MPs who vote together above a threshold despite being in different parties (shadow coalitions from `loyalty_graph.py`).

On the OpenPlanter side, the frontend receives a new "Seimas" provider option in the sidebar. When selected, the graph pane fetches from this endpoint instead of from a local workspace file, enabling real-time graph updates as the pipeline runs. The provider must use a **configurable API base URL** (env / Tauri config / existing settings pattern), expose **loading**, **error** (non-blocking; retry + message—never silently show an empty graph on failure), and **empty** (200 OK, zero nodes) states, and render **`politician`** nodes using alignment, party, and integrity metadata.

**Deliverables:** New FastAPI endpoint in `backend/main.py`; `OpenPlanter/frontend/src/api/SeimasProvider.ts` (correct spelling—the name `SeiamasProvider.ts` in earlier drafts was a typo); updated graph component (`GraphPane` or equivalent—discover by search) wired to that provider.

---

### Phase 4 — Autonomous Forensic Wiki Generation

**What it achieves:** OpenPlanter acts as an investigative journalist, producing markdown "Wiki" documents for each high-risk MP that combine database evidence with live web research — documents that are then served directly from the Seimas.v2 React dashboard.

A recursive OpenPlanter task (`.openplanter/prompts/generate_mp_wikis.md`) instructs the agent to first identify all MPs with an Integrity score below a configurable threshold (default: 40), using the public leaderboard API when available and **falling back to `psql` + `DB_DSN`** if HTTP is not 2xx or times out (e.g. cold Render instance). For each flagged MP, it spawns an independent `subtask` that performs the following investigation: it reads the MP's `forensic_breakdown` from the Seimas API, identifies the highest-penalty engine (e.g., Phantom Network with a `-30` procurement hit), uses `web_search` to find Lithuanian-language news articles about the MP and the flagged entity, and synthesises the database evidence and web findings into a structured markdown document. The document is written to `dashboard/public/wikis/{mp_id}.md`. The React dashboard's `MpProfileView.tsx` is updated to check for the existence of this file and render a "Forensic Investigation Report" panel if it exists.

**Deliverables:** `.openplanter/prompts/generate_mp_wikis.md`, updated `MpProfileView.tsx` to render wiki content, and a `WikiPanel.tsx` component.

---

## Part 3: Cursor IDE Agent Prompts

The following prompts are ready to be pasted directly into the Cursor IDE agent. They are ordered sequentially and each builds on the output of the previous. Each prompt is self-contained and includes the full context the agent needs to execute without ambiguity.

---

### Cursor Prompt 1 — Phase 1: OpenPlanter Workspace Setup & Tool Wrappers

```
You are working inside the Seimas.v2 repository. We are integrating it with the OpenPlanter investigation agent (https://github.com/ShinMegamiBoson/OpenPlanter).

OpenPlanter discovers tools by reading JSON schema files from a `.openplanter/tools/` directory in the workspace root. When the agent calls `run_shell`, it can invoke any of these tools as CLI commands.

Your task is to set up the OpenPlanter workspace integration for Seimas.v2:

1. Create the directory structure:
   - `.openplanter/`
   - `.openplanter/tools/`
   - `.openplanter/prompts/`

2. Create `.openplanter/tools/seimas_benford.py`:
   - This script is a CLI wrapper for `skaidrumas/analysis/benford_engine.py`.
   - It must call `run_benford_analysis()` and print the result count as JSON: `{"status": "ok", "mps_analyzed": N}`.
   - It must support `--dry-run`: exit 0 and print JSON without connecting to the database, e.g. `{"status": "dry_run", "mps_analyzed": 0}`.
   - It must load `DB_DSN` from the environment (using `python-dotenv` if a `.env` file exists).
   - Add a `if __name__ == "__main__"` guard.

3. Create `.openplanter/tools/seimas_chrono.py`:
   - Same pattern as above but wraps `run_chrono_analysis()` from `skaidrumas/analysis/chrono_forensics.py`.
   - Output: `{"status": "ok", "profiles_written": N}`.
   - Same `--dry-run` contract: `{"status": "dry_run", "profiles_written": 0}`.

4. Create `.openplanter/tools/seimas_phantom.py`:
   - Wraps `run_phantom_analysis()` from `skaidrumas/analysis/phantom_network.py`.
   - Output: `{"status": "ok", "links_detected": N}`.
   - Same `--dry-run` contract: `{"status": "dry_run", "links_detected": 0}`.

5. For each of the three scripts, create a corresponding JSON tool definition file in `.openplanter/tools/`:
   - `seimas_benford.json`, `seimas_chrono.json`, `seimas_phantom.json`.
   - Each JSON file must follow the OpenAI function-calling schema format with `name`, `description`, and `parameters` fields.
   - The `name` must match the script name (e.g., `seimas_benford`).
   - The `description` must explain what the tool does in one sentence.
   - All three tools take no required parameters (DB_DSN is loaded from the environment).

6. Create `.openplanter/settings.json` with the following content:
   ```json
   {
     "workspace_name": "Seimas.v2",
     "description": "Lithuanian Parliament transparency platform with forensic analysis engines.",
     "tools_dir": ".openplanter/tools",
     "prompts_dir": ".openplanter/prompts"
   }
   ```

After creating all files, verify: (1) each wrapper with `--dry-run` exits 0 and prints valid JSON; (2) when `DB_DSN` is available, each wrapper runs without `--dry-run` and returns `status: ok`. Fix import path issues (the scripts in `skaidrumas/analysis/` use relative imports from `storage.db` — ensure the wrapper adds the correct `sys.path` entry before importing).
```

---

### Cursor Prompt 2 — Phase 2: Agentic Pipeline Orchestration Prompt

```
You are working inside the Seimas.v2 repository. The `.openplanter/` directory has already been created (Phase 1). We now need to create the master orchestration prompt that will replace `orchestrator.py`.

Your task is to write the OpenPlanter system prompt and update the GitHub Actions workflow:

1. Create `.openplanter/prompts/seimas_pipeline.md`:

   Write a comprehensive system prompt for the OpenPlanter agent. The prompt must:

   - Define the agent's role: "You are the Seimas Data Orchestrator. Your job is to keep the Seimas.v2 PostgreSQL database up to date and run forensic analysis on the data."
   - Define the pipeline as a numbered sequence of steps. For each step, specify the exact `run_shell` command to use and the success condition to check:
     - Step 1: `python ingest_seimas.py` — success if exit code 0.
     - Step 2: `python link_vrk.py` — success if exit code 0.
     - Step 3: `python ingest_votes_v2.py` — success if exit code 0. This step is slow; allow up to 10 minutes.
     - Step 4 (optional): `python ingest_assets.py` — non-critical; log warning if it fails but continue.
     - Step 5: `python .openplanter/tools/seimas_benford.py` — run the Benford forensic engine.
     - Step 6: `python .openplanter/tools/seimas_chrono.py` — run the Chrono-Forensics engine.
     - Step 7: `python .openplanter/tools/seimas_phantom.py` — run the Phantom Network engine.
   - Define the error handling policy: if a critical step (1–3) fails, use `read_file` to read the last 50 lines of stdout, diagnose the error, attempt to run `python repair_project_ids.py`, and retry once.
   - Define the final reporting step: after all steps complete, use `write_file` to create `pipeline_report.md` in the workspace root. The report must include: timestamp, steps completed, steps failed, total MPs in DB (query via `run_shell` with `psql`), and a list of any new forensic anomalies detected (MPs whose forensic penalty changed since the last run).
   - Include a strict instruction: "Do not modify any source code files during this pipeline run. Your only write permissions are to `pipeline_report.md`."

2. Update `.github/workflows/refresh_db.yml`:
   - Add a new job `openplanter_pipeline` that runs after the existing `refresh_view` job.
   - The new job must install OpenPlanter (`pip install -e .` from the OpenPlanter repo, or via a pinned release tag).
   - It must then run: `openplanter-agent --task "$(cat .openplanter/prompts/seimas_pipeline.md)" --workspace . --headless --provider openai`
   - Add `OPENAI_API_KEY` to the required secrets list in the workflow file.
   - Set `continue-on-error: true` so that a pipeline failure does not block the existing materialized view refresh.
   - Before merging, confirm `OPENAI_API_KEY` is actually configured in the repository GitHub Actions secrets; after the first push, inspect workflow logs so a missing or invalid key does not go unnoticed.

3. Add a comment at the top of the original `orchestrator.py` file:
   ```python
   # DEPRECATED: This script is superseded by the OpenPlanter agentic pipeline.
   # See .openplanter/prompts/seimas_pipeline.md for the current orchestration logic.
   # This file is retained for local debugging and fallback use.
   ```
```

---

### Cursor Prompt 3 — Phase 3: Knowledge Graph API Endpoint

```
You are working in the OpenSeimas monorepo. Items 1–4 are in the Seimas.v2 repository; item 5 is in the OpenPlanter repository (sibling `OpenPlanter/`). Expose parliamentary data in a format OpenPlanter's Cytoscape.js frontend can consume.

Your task:

**Seimas.v2 — backend (items 1–4):** add a new graph export endpoint to `backend/main.py`:

1. Add the following endpoint to `backend/main.py` after the existing `/api/v2/heroes/leaderboard` endpoint:

   `GET /api/v2/openplanter/graph`

   This endpoint must:
   - Use the existing `get_db_conn()` context manager and `check_rate_limit()` function.
   - Query the `politicians` table joined with the hero engine scoring logic to build the node list.
   - For each active politician, create a node object:
     ```json
     {
       "data": {
         "id": "<mp_uuid>",
         "label": "<display_name>",
         "category": "politician",
         "party": "<current_party>",
         "alignment": "<hero_alignment>",
         "integrity_score": <int_score_0_to_100>,
         "xp": <xp_value>,
         "level": <level_value>
       }
     }
     ```
   - For the `alignment` and `integrity_score` fields, call the existing `calculate_hero_profile(mp_id, cursor)` function from `backend/hero_engine.py`. Cache the results in the existing `_leaderboard_cache` dict to avoid recomputing on every request.
   - Query the `indirect_links` table (if it exists — use `_table_exists()`) to build the edge list. For each row in `indirect_links`, create an edge:
     ```json
     {
       "data": {
         "id": "phantom_<indirect_link_id>",
         "source": "<mp_uuid>",
         "target": "<target_entity_code>",
         "label": "phantom_network",
         "hop_count": <hop_count>,
         "has_procurement_hit": <bool>
       }
     }
     ```
   - If `indirect_links` does not exist, return an empty edges array without error.
   - Return the full payload as: `{"nodes": [...], "edges": [...], "generated_at": "<iso_timestamp>"}`.

2. Add the new endpoint path to the `ALLOWED_ORIGINS` CORS configuration so that the OpenPlanter Tauri desktop app (which runs on `tauri://localhost`) can access it. Add `"tauri://localhost"` to the `ALLOWED_ORIGINS` list.

3. Add a `GET /api/v2/openplanter/graph` entry to the API documentation table in `memory-bank/techContext.md`.

4. Write a unit test for the new endpoint in `tests/test_api.py`. The test must mock the database connection and assert that:
   - The response status code is 200.
   - The response body contains both `nodes` and `edges` keys.
   - Each node in `nodes` has a `data.category` equal to `"politician"`.

**OpenPlanter — desktop frontend (item 5):**

5. In the **OpenPlanter** repository (`OpenPlanter/`), implement the Seimas graph client and UI (can be the same PR as Seimas changes or a follow-up, but specifications are fixed here):
   - Add `frontend/src/api/SeimasProvider.ts` that fetches `GET {baseUrl}/api/v2/openplanter/graph`, parses `{ nodes, edges, generated_at }`, and reads **baseUrl** from existing app configuration patterns (env / Tauri / settings), not hard-coded only.
   - Integrate with the graph view component used by the desktop app (search the codebase for the Cytoscape graph pane—e.g. `GraphPane`—and wire the provider there). Required UX: **loading** state while fetching; **error** state on network or non-2xx (show message + retry; do not silently render an empty graph); **empty** state when the response is 200 with zero nodes; style `politician` nodes using alignment, party, and integrity fields from the payload.
   - Manually verify: happy path, simulated failure (offline or 500), and CORS against `tauri://localhost` when hitting a deployed or local Seimas API.
```

---

### Cursor Prompt 4 — Phase 4: Autonomous Wiki Generation Task

```
You are working inside the Seimas.v2 repository. We want OpenPlanter to autonomously research flagged MPs and generate evidence-backed markdown "Wiki" documents that the React dashboard can display.

Your task is to create the OpenPlanter wiki generation task and update the React frontend to display it:

1. Create `.openplanter/prompts/generate_mp_wikis.md`:

   Write an OpenPlanter task prompt that instructs the agent to:

   - Step 1: Prefer `run_shell` with `curl -s https://seimas-api.onrender.com/api/v2/heroes/leaderboard` and parse the JSON to find all MPs where `integrity_score < 40`. If the HTTP status is not 2xx or the request times out (e.g. Render free tier asleep), fall back to querying the same information via `psql` using `DB_DSN` (document the exact SQL or query approach in the task). Store the list of `{mp_id, display_name, forensic_breakdown}` objects.
   - Step 2: For each flagged MP, use the `subtask` tool to spawn an independent sub-investigation. The subtask prompt must:
     a. Read the MP's full forensic breakdown to identify the highest-penalty engine.
     b. Use `web_search` to search for the MP's name in Lithuanian news sources. Use the query: `"<display_name>" skandalas OR "viešieji pirkimai" OR korupcija site:lrt.lt OR site:delfi.lt OR site:15min.lt`.
     c. If the Phantom Network engine flagged a specific entity (`target_entity_name`), also search: `"<display_name>" "<target_entity_name>"`.
     d. Synthesise the forensic database evidence and the web search findings into a structured markdown document with the following sections:
        - `## Summary` — one paragraph overview of the risk profile.
        - `## Forensic Engine Findings` — table of each engine's penalty and the raw score.
        - `## Web Evidence` — bullet list of relevant news articles with inline links and one-sentence summaries.
        - `## Conclusion` — one paragraph assessing the overall risk level (Low / Medium / High / Critical).
     e. Use `write_file` to save the document to `dashboard/public/wikis/<mp_id>.md`.
   - Step 3: After all subtasks complete, write a master index file to `dashboard/public/wikis/index.json` containing an array of `{mp_id, display_name, risk_level, wiki_path}` objects.
   - Include a strict anti-hallucination instruction: "Every factual claim about an MP must be supported by either a direct database value (cite the field name) or a web search result (cite the URL). Do not infer or speculate. If no web evidence is found, state 'No corroborating web evidence found' in the Web Evidence section."

2. Create `dashboard/src/components/WikiPanel.tsx`:
   - A React component that accepts `mpId: string` as a prop.
   - On mount, it fetches `/wikis/${mpId}.md` from the public directory.
   - If the file exists (HTTP 200), it renders the markdown content using a lightweight markdown renderer (use `react-markdown` if already in `package.json`, otherwise use a simple `<pre>` tag with a note to add the dependency).
   - If the file does not exist (HTTP 404), it renders nothing (returns `null`).

3. Update `dashboard/src/views/MpProfileView.tsx`:
   - Import `WikiPanel` from `../components/WikiPanel`.
   - After the existing `HeroCard` component render, add: `<WikiPanel mpId={mp.id} />`.
   - This ensures the wiki report (if it exists) appears automatically below the hero card on the MP profile page.

4. Update `dashboard/public/wikis/.gitkeep` (create this file) so that the `wikis/` directory is tracked in git even before any wiki documents are generated.

5. Add `dashboard/public/wikis/*.md` to `.gitignore` so that generated wiki documents are not committed to the repository (they are runtime artefacts produced by OpenPlanter).
```

---

### Cursor Prompt 5 — Phase 5: Memory Bank & Cursor Rules Update

```
You are working inside the Seimas.v2 repository. The OpenPlanter integration (Phases 1–4) has been completed. We now need to update the project's persistent memory and Cursor rules so that future AI agents working on this codebase understand the new architecture.

Your task is to update all project documentation to reflect the merger:

1. Update `memory-bank/activeContext.md`:
   - If Prompt 0 already added a short "OpenPlanter integration — started" section, **expand or replace** it with a full `## Operation OpenPlanter Integration` section at the top of the "Recent Changes" list.
   - Document the four phases completed: Workspace Setup, Agentic Orchestration, Graph API, Wiki Generation.
   - Update "Current State" to reflect that `orchestrator.py` is deprecated and OpenPlanter is the active pipeline manager.
   - Update "Next Steps" to include: (a) deploy OpenPlanter to a persistent server for scheduled runs, (b) add `OPENAI_API_KEY` to Render environment variables, (c) test the Tauri desktop app against the new `/api/v2/openplanter/graph` endpoint.

2. Update `memory-bank/techContext.md`:
   - Add OpenPlanter to the "Key Dependencies" section: `openplanter-agent: Recursive LLM investigation agent for agentic pipeline orchestration and wiki generation.`
   - Add a new "OpenPlanter Integration" section that documents the `.openplanter/` directory structure and the four key files: `settings.json`, `prompts/seimas_pipeline.md`, `prompts/generate_mp_wikis.md`, and the tool wrappers.

3. Update `.cursor/rules/00-project-context.mdc`:
   - Add a new bullet under "Core product areas": `OpenPlanter integration for agentic pipeline orchestration, knowledge graph export, and autonomous forensic wiki generation.`
   - Add a new bullet under "Key Repository Structure": `.openplanter/ -> OpenPlanter workspace config, tool wrappers, and agent prompts.`

4. Create `.cursor/skills/openplanter-integration/SKILL.md`:
   - Write a skill document that explains how the OpenPlanter integration works.
   - Include: the purpose of each file in `.openplanter/`, how to run the pipeline manually (`openplanter-agent --task "$(cat .openplanter/prompts/seimas_pipeline.md)" --workspace . --headless`), how to trigger wiki generation, and how to add a new forensic engine as an OpenPlanter tool.

5. Update `memory-bank/progress.md`:
   - Add a new dated entry `## <today's date> - Operation OpenPlanter Integration` with checkboxes for all four phases, all marked as `[x]` complete.
```

---

## Part 4: Execution Order & Dependencies

The five prompts must be executed in the order listed. Each prompt has a dependency on the previous one:

| Prompt | Phase | Depends On | Key Output |
|---|---|---|---|
| Prompt 1 | Workspace Setup | Nothing (start here) | `.openplanter/tools/` — 3 wrappers (with `--dry-run`) + 3 JSON schemas |
| Prompt 2 | Agentic Orchestration | Prompt 1 (tool wrappers must exist) | `.openplanter/prompts/seimas_pipeline.md`, updated GitHub Actions |
| Prompt 3 | Knowledge Graph API | Nothing (independent of Prompts 1–2) | Seimas `GET /api/v2/openplanter/graph` + OpenPlanter `SeimasProvider` / graph UX |
| Prompt 4 | Wiki Generation | Prompt 3 (requires the leaderboard API to be stable) | `.openplanter/prompts/generate_mp_wikis.md` (HTTP + `psql` fallback), `WikiPanel.tsx` |
| Prompt 5 | Memory & Rules Update | All previous prompts complete | Updated memory bank, Cursor rules, new skill file |

Prompts 1–2 and Prompt 3 can be run in parallel (they touch different parts of the codebase). Prompt 4 must follow Prompt 3. Prompt 5 must be the final step.

---

## Part 5: Recommended Cursor Configuration

Before running these prompts, configure the Cursor IDE as follows to maximise agent effectiveness:

| Setting | Recommended Value | Reason |
|---|---|---|
| **Model** | `claude-opus-4-5` or `gpt-4.1` | These prompts require deep code comprehension across two large codebases |
| **Context** | Include `Seimas.v2/`, `OpenPlanter/agent/`, and relevant `OpenPlanter/frontend/` graph/API files | Backend graph endpoint + Tauri/React graph UI may be edited in the same initiative |
| **Cursor Rules** | Enable `00-project-context.mdc` and `01-code-standards.mdc` | Ensures the agent follows the project's existing conventions |
| **Max tool calls** | 40+ | The wiki generation prompt spawns recursive subtasks and may require many tool calls |
| **Web search** | Enabled (if available in your Cursor plan) | Required for Prompt 4's web evidence gathering |
