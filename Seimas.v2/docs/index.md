# Skaidrus Seimas - Project Documentation Index

> **Generated**: 2026-02-04  
> **Workflow**: BMAD `document-project`  
> **Scan Level**: Full Initial Scan

## 📋 Documentation Contents

### Core Documentation

| Document | Description | Path |
|----------|-------------|------|
| **Project Context** | Critical rules and patterns for AI agents | [project-context.md](./project-context.md) |
| **Database Schema** | SQL schema definition | [../schema.sql](../schema.sql) |

### Configuration Files

| File | Purpose |
|------|---------|
| [nixpacks.toml](../nixpacks.toml) | Railway deployment configuration |
| [railway.json](../railway.json) | Railway service settings |
| [requirements.txt](../requirements.txt) | Python dependencies |
| [dashboard/package.json](../dashboard/package.json) | Node.js dependencies |

---

## 🏛️ Architecture Summary

**Type**: Monolithic full-stack web application

```
┌─────────────────────────────────────────────────────────┐
│                     Railway Deploy                       │
├─────────────────────────────────────────────────────────┤
│  FastAPI (Python)                                       │
│  ├── /api/* → REST endpoints                            │
│  └── /* → Static React SPA (dashboard/dist/)            │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL (Railway managed)                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Components

### Backend (`/backend`)
- **Framework**: FastAPI
- **Database**: PostgreSQL with `psycopg2` connection pooling
- **Entry Point**: `backend/main.py`

### Frontend (`/dashboard`)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **Testing**: Storybook 8.5 + Vitest

### Data Pipeline (root `*.py` scripts)
- **Orchestrator**: `orchestrator.py`
- **MP Ingestion**: `ingest_seimas.py`
- **Vote Ingestion**: `ingest_votes_v2.py`
- **Asset Ingestion**: `ingest_assets.py`

---

## 🎯 Key Features

1. **MP Comparison Tool** - Compare voting records of 2-4 MPs
2. **Vote Explorer** - Browse and filter parliamentary votes
3. **MP Profiles** - Individual politician pages with voting history
4. **Dashboard** - Real-time statistics and activity feed

---

## 📂 Directory Map

```
transparency_project/
├── backend/              # Python FastAPI backend
├── dashboard/            # React/Vite frontend
│   ├── src/
│   │   ├── views/        # Page components
│   │   ├── components/   # Reusable UI
│   │   └── stories/      # Storybook
│   └── tests/            # Frontend tests
├── docs/                 # Documentation
├── tests/                # Backend tests
├── scripts/              # Utility scripts
├── _bmad/                # BMAD methodology config
└── _bmad-output/         # BMAD artifacts
```

---

## 🔗 Related Documents

- [BMAD Workflow Status](../_bmad-output/planning-artifacts/bmm-workflow-status.yaml)
- [AGENTS.md](../AGENTS.md) - Agent configuration
