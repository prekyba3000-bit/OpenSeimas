# Seimas.v2

Skaidrus.Seimas.v.2 is a full-stack transparency dashboard for the Lithuanian Parliament (Seimas), visualizing MP activity, voting records, and attendance.

## Architecture

- **Frontend**: [React + Vite + Tailwind](dashboard/) (Deployed on Vercel)
- **Backend**: [FastAPI + Python](backend/) (Deployed on Render - Docker)
- **Database**: PostgreSQL (Hosted on Render)
- **Data Pipeline**: Python scripts (`ingest_*.py`) running locally or via GitHub Actions.

## Deployment & Automation

### 1. Backend (Render)
The backend is Dockerized and deploys automatically to Render when changes are pushed to `master`.
- **Service**: Web Service (Docker)
- **Env Vars**: `DB_DSN`, `SYNC_SECRET`
- **Security**: Admin endpoints require `Authorization: Bearer <SYNC_SECRET>`.

### 2. Frontend (Vercel)
The dashboard is connected to Vercel and rebuilds on git push.
- **Project Settings**: Root directory `dashboard/`.
- **Environment Variables**:
    - `VITE_API_URL`: Set this to `https://seimas-api.onrender.com` (Your Render Backend URL).
    - This variable is required; frontend startup fails if missing.

### 3. Database Automation (GitHub Actions)
We use GitHub Actions to keep the data fresh without overloading the API.

- **Workflow**: `.github/workflows/refresh_db.yml`
- **Schedule**: Runs every 30 minutes.
- **Action**: Refreshes the `mp_stats_summary` materialized view to pre-calculate transparency stats.
- **Setup Requirement**: You MUST add the `DB_DSN` secret to your GitHub Repository for this to work.
  1. Go to `Settings` > `Secrets and variables` > `Actions`.
  2. Create New Repository Secret: `DB_DSN`.
  3. Value: Your Render PostgreSQL Internal/External URL.

## Local Development

### Backend
```bash
pip install -r requirements.txt
export DB_DSN="postgresql://user:pass@localhost:5432/seimas"
export SYNC_SECRET="change-me"
uvicorn backend.main:app --reload
```

### Frontend
```bash
cd dashboard
npm install
npm run dev
```

### Data Ingestion
To populate the database locally:
```bash
export DB_DSN="..."
python3 ingest_seimas.py  # MPs
python3 ingest_votes_v2.py # Votes (Turbo/Threaded mode)
```
