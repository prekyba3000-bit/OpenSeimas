---
name: openplanter-integration
description: Explains Seimas.v2 + OpenPlanter merger — .openplanter layout, running seimas_pipeline and wiki tasks, and adding a new forensic tool. Use when configuring agents, CI, graph export, or forensic CLI wrappers.
---

# OpenPlanter integration (Seimas.v2)

Seimas.v2 uses **OpenPlanter** as the **active pipeline orchestrator** for the full ingest + forensic refresh. The legacy **`orchestrator.py`** script is **deprecated** (see its file header); prefer task prompts under **`.openplanter/prompts/`**.

## What lives in `.openplanter/`

- **`settings.json`** — Names the workspace and sets **`tools_dir`** (`.openplanter/tools`) and **`prompts_dir`** (`.openplanter/prompts`) so the agent discovers wrappers and markdown tasks.
- **`prompts/seimas_pipeline.md`** — Step-by-step system task: run root ingest/link/votes scripts, then **`python .openplanter/tools/seimas_*.py`**, and produce **`pipeline_report.md`**. It forbids editing application source during the run.
- **`prompts/generate_mp_wikis.md`** — Optional research task: flag low-integrity MPs, use **`subtask`** / **`web_search`**, write **`dashboard/public/wikis/<mp_id>.md`** and **`index.json`** with strict evidence rules.
- **`tools/_bootstrap.py`** — Loads **`.env`** (and parent **`.env`**), maps **`DB_DSN`** → **`DATABASE_URL`** when needed, prepends **`skaidrumas/`** to **`sys.path`**.
- **`tools/seimas_<engine>.py`** — Small CLIs that call **`skaidrumas`** analysis code and print **one JSON object per line** on stdout (`status`, counts or error). Use **`--dry-run`** to validate imports without a DB.
- **`tools/seimas_<engine>.json`** — Tool metadata for OpenPlanter (name, description, parameter schema) so the agent can invoke the matching script.

## Interactive UI (preferred for humans)

OpenPlanter’s primary interface is a **terminal UI**, not the Seimas React dashboard. By default the CLI launches the **Textual** app when dependencies are installed: **chat pane**, trace stream, and **wiki knowledge graph** panel (`openplanter-agent` without **`--headless`**). The dashboard’s **`WikiPanel`** is only for **serving** generated markdown to end users in the browser.

**Requirements:** a real TTY (run from your terminal app, not a non-interactive job). Install Textual extras if needed: **`pip install "openplanter-agent[textual]"`** (or **`pip install -e ".[textual]"`** from the OpenPlanter repo).

**Launch (example, HF router):**

```bash
cd /path/to/Seimas.v2
set -a && source ./.env && set +a
/path/to/OpenPlanter/.venv/bin/openplanter-agent \
  --provider openai \
  --base-url "https://router.huggingface.co/v1" \
  --openai-api-key "$HF_TOKEN" \
  --model "Qwen/Qwen2.5-72B-Instruct" \
  --reasoning-effort none \
  --workspace .
```

Then type your objective or paste task text in the UI. Use **`--textual`** to force Textual (fails fast if Textual is missing). Use **`--no-tui`** for a plain line-based REPL.

**Automation (cron / CI)** should keep **`--headless`** and **`--task "$(cat …)"`** so no TTY is required.

## Run the pipeline manually (OpenPlanter CLI, headless)

From the **Seimas.v2 repository root**, with **`DB_DSN`** set and OpenPlanter installed on your machine:

```bash
openplanter-agent --task "$(cat .openplanter/prompts/seimas_pipeline.md)" --workspace . --headless
```

Adjust flags if your OpenPlanter build uses different option names; the important part is **task text** = contents of **`seimas_pipeline.md`** and **workspace** = repo root (where **`ingest_seimas.py`** and **`.openplanter/tools/`** exist).

For wiki generation, point **`--task`** at **`.openplanter/prompts/generate_mp_wikis.md`** instead (ensure API/keys and write access to **`dashboard/public/wikis/`**).

## Hugging Face serverless models (OpenAI-compatible)

OpenPlanter’s OpenAI client **appends `/chat/completions`** to whatever you pass as **`--base-url`**. The **`--model`** value is sent **in the JSON body**, not as part of the host path.

- **Stable base (current HF):** **`https://router.huggingface.co/v1`**. The client calls **`https://router.huggingface.co/v1/chat/completions`** with **`model: "org/repo"`** in the JSON payload. Hugging Face has deprecated **`https://api-inference.huggingface.co`** for this flow (**`410`** — “use router.huggingface.co instead”).
- **Wrong:** embedding the model id (or extra path segments) inside **`--base-url`**. That produces broken URLs (e.g. doubled **`/chat/completions`**) and **`404`**s.

**Chat models only:** the router **`/v1/chat/completions`** endpoint requires a model HF exposes as a **chat** model. If you see **`400`** with **`model_not_supported`** / “not a chat model”, pick a chat-capable id from the Hub/router for this API, or use another provider (Ollama, OpenRouter, etc.) for OpenPlanter.

Example (wiki task; load **`HF_TOKEN`** from your monorepo **`.env`**):

```bash
cd /path/to/Seimas.v2
set -a && source ./.env && set +a
/path/to/OpenPlanter/.venv/bin/openplanter-agent \
  --provider openai \
  --base-url "https://router.huggingface.co/v1" \
  --openai-api-key "$HF_TOKEN" \
  --model "p-e-w/Mistral-Nemo-Instruct-2407-heretic-noslop" \
  --reasoning-effort none \
  --task "$(cat .openplanter/prompts/generate_mp_wikis.md)" \
  --workspace . \
  --headless
```

Use **`--reasoning-effort none`** if the endpoint rejects reasoning parameters.

## Add a new forensic engine as an OpenPlanter tool

1. **Implement analysis** under **`skaidrumas/`** (or reuse an existing module) with a clear entry function that performs DB work and returns a summary.
2. Add **`.openplanter/tools/seimas_<name>.py`** — Copy the pattern from **`seimas_benford.py`**: `argparse` with **`--dry-run`**, call **`load_env()`** / **`ensure_skaidrumas_path()`**, run the engine, **`print(json.dumps({...}))`** with **`"status": "ok"`** on success; on failure emit JSON error and non-zero exit.
3. Add **`.openplanter/tools/seimas_<name>.json`** — Define the tool **`name`**, human **`description`**, and **`parameters`** (often an empty object if the script takes no args).
4. Update **`.openplanter/prompts/seimas_pipeline.md`** — Insert a numbered step that runs **`python .openplanter/tools/seimas_<name>.py`** with the same success criteria as the other engines (exit `0`, stdout JSON **`"status": "ok"`** when applicable).
5. **Register in OpenPlanter** if your install requires an explicit tool manifest beyond the JSON files (follow OpenPlanter docs for your version).
6. **Verify** with **`python .openplanter/tools/seimas_<name>.py --dry-run`** and a real run against a test database.

## Related API and UI

- **`GET /api/v2/openplanter/graph`** — Cytoscape JSON for the OpenPlanter / Tauri graph view (see **`memory-bank/techContext.md`**).
- **`WikiPanel`** — Serves **`/wikis/{mp_id}.md`** from **`dashboard/public/wikis/`** when present.
