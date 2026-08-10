# How to apply the V.4 kit

This kit implements **Phase 0 (ops resurrection) + Phase 1 start (trust floor)** of
`docs/V4-MASTER-PLAN.md`. Every file mirrors its target path in the repo.

## 1. Merge the branch, then lay the kit on top
```bash
git checkout main && git merge cleanup/create-pipeline   # branch is strictly better
# copy kit files into the repo root (paths already mirror the repo)
cp -r v4-kit/* /path/to/OpenSeimas/
```

## 2. What each file does
| Kit file | Repo path | Purpose |
|---|---|---|
| `docs/V4-MASTER-PLAN.md` | `docs/V4-MASTER-PLAN.md` | Canonical plan. Then `git mv docs/V4-build-plan-*.md docs/archive/v4-drafts/` |
| `LICENSE` | `LICENSE` | AGPL-3.0 (full FSF text). Add your copyright line at the bottom if you wish |
| `.github/workflows/ci.yml` | same | Postgres-backed backend tests + dashboard vitest/build on every PR |
| `.github/workflows/refresh_db.yml` | same | 30-min materialized-view refresh (OpenPlanter job removed) |
| `.github/workflows/daily_sync.yml` | same | Monorepo-aware daily sync + topic tagging + export |
| `render.yaml` | `render.yaml` (root) | Monorepo deploy (`rootDir: Seimas.v2`). **Delete `Seimas.v2/render.yaml`** |
| `Seimas.v2/migrations/017_trust_floor.sql` | same | Trust tables: provenance, corrections, methodology, edit history, replies, Tau output |
| `Seimas.v2/backend/routes_trust.py` | same | Public + admin trust endpoints |
| `Seimas.v2/tests/test_trust.py` | same | 7 tests following the `backend.core` monkeypatch convention |

## 3. Wire the router (one edit)
In `Seimas.v2/backend/main.py`:
```python
from backend.routes_trust import router as trust_router
...
app.include_router(trust_router)
```

## 4. Delete the dead CI location
```bash
git rm -r Seimas.v2/.github   # workflows there are invisible to GitHub (issue #3) — closes #3
```

## 5. Secrets & infra checklist
- [ ] GitHub repo secret `DB_DSN` set (Actions → Secrets)
- [ ] Render: replace the expired free Postgres (or move to Neon/Supabase and set
      `DB_DSN` manually in the Render service instead of `fromDatabase`)
- [ ] Render blueprint now points at repo root with `rootDir: Seimas.v2`
- [ ] Uptime monitor on `https://seimas-api.onrender.com/health` and `/api/meta/freshness`
- [ ] Nightly `pg_dump` backup cron (the DB is the only copy of months of ingested data)
- [ ] `python3 apply_migrations.py` → applies 017; `pytest tests -q` green

## 6. Verify
```bash
curl https://seimas-api.onrender.com/health                 # {"status":"ok",...}
curl https://seimas-api.onrender.com/api/meta/freshness     # per-domain freshness
curl https://seimas-api.onrender.com/api/trust/corrections  # [] — empty log, table live
```
