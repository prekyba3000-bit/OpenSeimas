# OpenSeimas

**Make Lithuanian voting choices understandable, relevant, and personally meaningful — through transparent evidence and explainable, non-partisan civic guidance.**

OpenSeimas V.4 is a voter-first civic platform for the Lithuanian Parliament (Seimas), in two modes:

- **Facts mode** — anonymous public evidence explorer: bills in plain Lithuanian, true MP attendance, voting records by topic, provenance on every number.
- **Tau mode** (opt-in) — personalized guidance: 5-question value onboarding (stored on your device), recommendation cards with reasons, confidence, and sources. Deterministic rules, never an LLM deciding content.

**The canonical plan is [`docs/V4-MASTER-PLAN.md`](docs/V4-MASTER-PLAN.md).** Historical versions (V.3 forensic dashboard, OpenPlanter agent) are frozen in `archive/v3` / `docs/wiki-archive/` / `docs/archive/`.

## Structure

| Path | What |
|---|---|
| `Seimas.v2/backend/` | FastAPI API (public, meta/freshness, trust, admin routers) |
| `Seimas.v2/pipeline/` | Consolidated data-ingestion package (`python -m pipeline.cli --list`) |
| `Seimas.v2/migrations/` | Idempotent SQL migrations (`apply_migrations.py`) |
| `Seimas.v2/dashboard/` | React + Vite + Tailwind frontend (Vercel) |
| `packages/open-seimas-contracts/` | Shared TypeScript contracts |
| `docs/` | Master plan, ADRs, archives |

## Quick start

```bash
# Backend (needs PostgreSQL; DB_DSN points at it)
cd Seimas.v2
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DB_DSN="postgresql://user:pass@localhost:5432/seimas"
export SYNC_SECRET="change-me"
python3 apply_migrations.py            # schema + all migrations, idempotent
uvicorn backend.main:app --reload      # http://localhost:8000/docs

# Frontend
cd ../dashboard
npm install --legacy-peer-deps
VITE_API_URL=http://localhost:8000 npm run dev   # http://localhost:5173

# Data ingestion (populate the DB)
cd ..
python3 -m pipeline.cli --list
python3 -m pipeline.cli ingest_seimas
python3 -m pipeline.cli ingest_votes_v2
python3 -m pipeline.cli tag_topics
```

## Tests

```bash
cd Seimas.v2 && PYTHONPATH=. python -m pytest tests -q   # backend
npm run dashboard:test                                   # frontend (from repo root)
```

CI runs both against a fresh Postgres on every PR (`.github/workflows/ci.yml`).

## Deploy

- **API**: Render blueprint at repo root (`render.yaml`, `rootDir: Seimas.v2`). ⚠️ Render *free* Postgres expires after 30 days — see the warning in `render.yaml`; nightly backups run via `.github/workflows/db_backup.yml`.
- **Dashboard**: Vercel, root directory `Seimas.v2/dashboard`, env `VITE_API_URL`.

## License

AGPL-3.0 — see [LICENSE](LICENSE). Data exports are CC BY 4.0 when published.
