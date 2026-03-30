# Tech Context: Seimas v.2

## Stack
- **Language**: Python 3.x
- **Database**: PostgreSQL (with UUID extension)
- **Version Control**: Git / Beads (bd)
- **Licensing**: **Free and Open Source Software (FOSS)** - MIT/GPL (Compatible with NGI Zero)

## Key Dependencies
- `subprocess`: For orchestrating script execution.
- `psycopg2` / `sqlalchemy`: For database interaction.
- `requests` / `defusedxml`: For secure scraping and API calls.
- `beautifulsoup4`: For HTML parsing in linking scripts.
- **OpenPlanter** (external repo / sibling clone): agent runtime that executes task prompts from `.openplanter/prompts/`, invokes `run_shell` against this repo, and can register tools from `.openplanter/tools/*.json`. Not a Python package pinned inside Seimas.v2; install and run the OpenPlanter CLI from its own project (see `.cursor/skills/openplanter-integration/SKILL.md`).

## OpenPlanter integration

Workspace configuration lives under **`.openplanter/`** at the Seimas.v2 repo root:

| Path | Role |
|------|------|
| **`settings.json`** | Workspace metadata: `workspace_name`, `description`, **`tools_dir`** (`.openplanter/tools`), **`prompts_dir`** (`.openplanter/prompts`). |
| **`prompts/seimas_pipeline.md`** | System task: ordered ingest + link + votes + optional assets + forensic engine CLIs; writes **`pipeline_report.md`**; no edits to application source during the run. |
| **`prompts/generate_mp_wikis.md`** | System task: identify low-integrity MPs (API / DB fallback), research via **`web_search`**, emit markdown to **`dashboard/public/wikis/<mp_id>.md`** and **`index.json`**. |
| **`tools/_bootstrap.py`** | Shared `REPO_ROOT`, `load_env()` (`.env` + parent), `DATABASE_URL` sync from `DB_DSN`, `sys.path` for **`skaidrumas`**. |
| **`tools/seimas_*.py`** | Thin CLIs: load env, call skaidrumas analysis engines, print **single-line JSON** to stdout (`status`: `ok` \| `error` \| `dry_run`). Support **`--dry-run`** for import validation without DB. |
| **`tools/seimas_*.json`** | OpenPlanter tool definitions (`name`, `description`, JSON Schema parameters) pointing agents at the matching `.py` entrypoints. |

Forensic engines exposed this way today: **Benford**, **chrono**, **phantom** (see `seimas_benford.py`, `seimas_chrono.py`, `seimas_phantom.py`). CI may invoke the same steps or the full OpenPlanter task after database refresh.

## Development Environment
- Linux-based environment (Julio's workspace).
- Primary repo root: `/home/julio/Documents/OpenSeimas/Seimas.v2/` (legacy note: older clones may live under `/home/julio/.gemini/antigravity/scratch/transparency_project/`).

## HTTP API (v2) — reference

Public JSON endpoints used by the React dashboard and OpenPlanter. Base URL is deployment-specific (e.g. `https://seimas-api.onrender.com`); local dev typically proxies or sets `VITE_API_URL`.

| Method | Path | Purpose | Notes |
|--------|------|---------|--------|
| `GET` | `/api/v2/heroes/leaderboard` | Active MPs as hero profiles (level, XP, `attributes`, `forensic_breakdown`) | Query: `limit` (1–200, default 20); server-side cache. |
| `GET` | `/api/v2/heroes/{mp_id}` | Single MP hero profile | `mp_id` is UUID; 404 if unknown. |
| `GET` | `/api/v2/openplanter/graph` | **Cytoscape.js graph export** for OpenPlanter: enriched parliamentary graph | JSON: `{ "nodes": [...], "edges": [...], "generated_at" }`. **Node `category` values:** `politician`, `phantom_entity` (`id` `entity:<code>`), `party` (`id` `party:<hash>`), `committee`, `wealth_declaration` (`id` `wealth:<uuid>` from `mp_assets` or `assets`), `interest` (`interest:<uuid>` from `interests`), `legislation` (`vote:<votes.id>`). Optional node `detail` (subtitle for declarations/votes). **Edge `label` values:** `phantom_network`, `belongs_to`, `serves_on` (optional `role`), `filed_wealth_declaration`, `declared_interest`, `voted_on` (optional `vote_choice`). Votes capped (`OPENPLANTER_GRAPH_MAX_VOTE_NODES`), wealth/interest rows capped. Rate-limited; cached **~300 seconds** (`OPENPLANTER_GRAPH_CACHE_SEC`). |

## Forensic “Wiki” reports (dashboard)

- **UI:** `dashboard/src/components/WikiPanel.tsx` loads `GET /wikis/{mp_id}.md` (static files from `dashboard/public/wikis/` after Vite build). Rendered on the MP profile below `HeroCard` (`MpProfileView` / `MpProfileLayout`).
- **Generator (OpenPlanter):** Task prompt `.openplanter/prompts/generate_mp_wikis.md` — flags low-integrity MPs, researches via API + `web_search`, writes `dashboard/public/wikis/<mp_id>.md` and `dashboard/public/wikis/index.json`. Generated `*.md` files are gitignored; folder kept via `dashboard/public/wikis/.gitkeep`.
- **“Live” behaviour:** The panel appears automatically when a matching `.md` file exists for that MP’s UUID; until then the section is omitted (component returns `null`).

## Compliance & Standards
- **Accessibility**: Targeted WCAG 2.1 AA compliance for end-user interfaces.
- **Security**: Mandatory independent audits for production-ready components.
- **Standardization**: Commitment to open protocols and institutional reuse.
