---
name: deploy-to-render
description: Describes deployment workflow for backend on Render and frontend on Vercel with pre-deploy checks. Use when preparing releases, validating environment variables, or confirming post-deploy health.
---

# Deploy to Render and Vercel

## Deployment Model

- Backend: Render web service, auto-deploy on push to `main`.
- Frontend: Vercel project (`dashboard/` root), auto-deploy on push to `main`.

## Pre-Deployment Checklist

1. Run tests/syntax checks for touched backend and frontend files.
2. Confirm DB migrations are present and reviewed.
3. Verify environment variables:
   - Backend: `DB_DSN`, `SYNC_SECRET`
   - Frontend: `VITE_API_URL`
4. Confirm API contract compatibility for changed endpoints.
5. Update memory bank if architecture/behavior changed.

## Backend Release Steps (Render)

1. Merge to `main`.
2. Confirm Render build succeeds.
3. Validate health endpoint and critical APIs:
   - `/health`
   - `/api/v2/heroes/{mp_id}`
   - `/api/v2/heroes/leaderboard`

## Frontend Release Steps (Vercel)

1. Merge to `main`.
2. Confirm Vercel build succeeds.
3. Validate pages:
   - MP Profile HeroCard
   - Leaderboard view
   - Score transparency panel
