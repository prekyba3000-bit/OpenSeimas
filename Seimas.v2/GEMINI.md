# GEMINI Project Context: Seimas.v2

This document provides context for the Seimas.v2 project, a full-stack application designed to enhance transparency and public understanding of the Lithuanian Parliament (Seimas).

## Project Overview

Seimas.v2 is a web application that ingests, analyzes, and visualizes data related to members of parliament (MPs), their voting records, assets, and potential conflicts of interest.

- **Backend:** A Python-based API built with **FastAPI**. It handles data ingestion, processing from various sources, and serves the data to the frontend. It uses a **PostgreSQL** database (`psycopg2`) for data storage and `pandas` and `BeautifulSoup` for data manipulation.

- **Frontend:** A modern single-page application (SPA) built with **React** and **TypeScript**, using **Vite** for the build tooling. The UI is styled with **Tailwind CSS** and built with a component system that appears to be based on **shadcn/ui** (using Radix UI primitives and `lucide-react` icons). Data visualization is handled by **Recharts**.

- **Data Pipeline:** A key component is the data ingestion pipeline, managed by `orchestrator.py`. This script runs a series of Python scripts to scrape and process data, which is executed daily via a **GitHub Actions** workflow (`.github/workflows/daily_sync.yml`).

- **Deployment:** The application is configured for deployment on **Railway.app** using **Nixpacks**. The configuration files (`railway.json`, `nixpacks.toml`, and `Procfile`) define the build process and start commands.

## Key Files

- `orchestrator.py`: The heart of the data ingestion pipeline.
- `schema.sql`: Defines the structure of the PostgreSQL database.
- `backend/main.py`: The entry point for the FastAPI application.
- `dashboard/src/App.tsx`: The main React component that handles client-side routing.
- `dashboard/package.json`: Lists frontend dependencies and scripts.
- `requirements.txt`: Lists backend Python dependencies.
- `railway.json` / `nixpacks.toml`: Define build and deployment settings.

## Building and Running

### Backend (Python/FastAPI)

- **Dependencies:** Install using pip:
  ```bash
  pip install -r requirements.txt
  ```

- **Running the API server:** The API is served using Uvicorn.
  ```bash
  uvicorn backend.main:app --host 0.0.0.0 --port 8000
  ```

### Frontend (React/TypeScript)

- **Navigate to the dashboard directory:**
  ```bash
  cd dashboard
  ```

- **Dependencies:** Install using npm:
  ```bash
  npm install
  ```

- **Running the development server:**
  ```bash
  npm run dev
  ```

- **Building for production:**
  ```bash
  npm run build
  ```

### Data Pipeline

- The entire data pipeline can be executed by running the orchestrator script. This requires database credentials and other environment variables to be set.
  ```bash
  python orchestrator.py
  ```

## Development Conventions

- **Testing:**
    - The backend uses `pytest`.
    - The frontend uses `vitest` for unit/integration tests and `Playwright` for e2e tests.
- **UI Development:** The frontend uses `Storybook` for component development and testing. Run `npm run storybook` in the `dashboard` directory to view the component library.
- **Linting:** The frontend uses `ESLint` (`npm run lint` in `dashboard`).
