# V.4 Build Plan — Draft

This draft plan was produced by GitHub Copilot (an AI assistant) to help structure the migration to OpenSeimas V.4.

Goal
- Migrate to a web-first, pipeline-driven Seimas Observatory that helps an average Lithuanian decide what to vote for with clear, non-partisan recommendations.

Plan Overview

1) Archive & Safety
- Create `archive/v3` snapshot and confirm `.openplanter` artifacts are in `docs/archive/`.

2) Trim & Consolidate
- Remove duplicate runtimes and desktop app; consolidate ingestion into `Seimas.v2/pipeline`.

3) Core API & Data Layer
- Harden `Seimas.v2/main.py` (FastAPI), provide CLI hooks for pipeline imports, and define stable normalized data artifacts (votes, bills, parties).

4) VoterGuideAgent Prototype
- Build `VoterGuideAgent` to produce short Lithuanian recommendations (headline + 2–3 bullets + confidence + sources).

5) Explainability & Safety
- Add provenance tagging, `ExplainabilityAgent`, and `SafetyAgent` heuristics to enforce non-partisanship.

6) Frontend (Web-first)
- Lightweight React/Vite SPA: onboarding, recommendation card, bill detail, feedback.

7) Metrics & Feedback Loop
- Instrument comprehension and trust metrics; calibrate recommendations against historical votes.

8) Release & Ops
- Containerize services, CI for daily ingest, release `v4-beta` with rollback docs.

Milestones (8–12 weeks suggested)
- Week 1: Archive and cleanup; pipeline consolidation.
- Week 2–3: VoterGuideAgent prototype + API demo.
- Week 4: Explainability and safety.
- Week 5–6: Frontend MVP.
- Week 7: Metrics and calibration.
- Week 8+: Beta release and user testing.

Next immediate actions
- Scaffold `Seimas.v2/agents/voter_guide.py` and a demo CLI integration.
- Draft `RELEASE.md` and a GitHub Action for daily ingest.

Attribution
- Draft created by GitHub Copilot (AI assistant) on 2026-07-23.
