# Workspace overview

This file summarizes the main projects and how to run them locally.

**OpenPlanter (agent)**:
- Location: Documents/OpenSeimas/OpenPlanter
- Manifest: Documents/OpenSeimas/OpenPlanter/pyproject.toml
- Entrypoint: `openplanter-agent` (console script) / `python -m agent`

Quick start (development):

```bash
cd Documents/OpenSeimas/OpenPlanter
python -m venv .venv
source .venv/bin/activate
pip install -e .
openplanter-agent   # or: python -m agent
```

**Seimas.v2 (API & scripts)**:
- Location: Documents/OpenSeimas/Seimas.v2
- Dependencies: Documents/OpenSeimas/Seimas.v2/requirements.txt
- Entrypoints: `python main.py` (runs `uvicorn`), Docker CMD runs `gunicorn backend.main:app`.

Quick start:

```bash
cd Documents/OpenSeimas/Seimas.v2
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
# or production-like: gunicorn backend.main:app --bind 0.0.0.0:10000 -k uvicorn.workers.UvicornWorker --workers 2
```

**Dashboard (frontend)**:
- Location: Documents/OpenSeimas/Seimas.v2/dashboard
- Manifest: Documents/OpenSeimas/Seimas.v2/dashboard/package.json

Quick start (dev):

```bash
cd Documents/OpenSeimas/Seimas.v2/dashboard
npm ci
npm run dev
```

**OpenPlanter Desktop frontend**:
- Location: Documents/OpenSeimas/OpenPlanter/openplanter-desktop/frontend
- Manifest: Documents/OpenSeimas/OpenPlanter/openplanter-desktop/frontend/package.json

Quick build:

```bash
cd Documents/OpenSeimas/OpenPlanter/openplanter-desktop/frontend
npm ci
npm run build
```

**Docker**:
- OpenPlanter Dockerfile: Documents/OpenSeimas/OpenPlanter/Dockerfile
- Seimas.v2 Dockerfile: Documents/OpenSeimas/Seimas.v2/Dockerfile

**Tests**:
- OpenPlanter tests: Documents/OpenSeimas/OpenPlanter/tests (pytest)
- Dashboard tests: Documents/OpenSeimas/Seimas.v2/dashboard (vitest, Playwright)

Run OpenPlanter tests:

```bash
cd Documents/OpenSeimas/OpenPlanter
pytest -q
```

---

If you want, I can run tests, start a service, or produce a short README for a specific component next.
