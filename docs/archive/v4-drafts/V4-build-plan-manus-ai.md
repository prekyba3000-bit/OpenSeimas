## OpenSeimas V.4 Build Plan

This plan was created by Manus AI to guide the migration of OpenSeimas toward a voter-first civic observatory. The objective is to help everyday Lithuanian voters understand what each vote means, feel that their choice is important, and make decisions with transparent, non-partisan guidance.

### 1. Executive Summary

**Mission Statement:** Create a polished, trustworthy civic platform that translates Seimas activity into clear, personalized voter guidance, so each Lithuanian feels informed, respected, and confident that their vote matters.

OpenSeimas V.4 should move beyond a research repository into a live civic product. It will combine a clean backend pipeline, an explicit agent layer, and a mobile-first web UI to generate digestible, non-partisan policy recommendations. The product will use structured parliamentary data, user preferences, and provenance mechanisms to give voters a sense of agency and clarity.

For ordinary Lithuanian voters, this matters because political process is often opaque. The platform should reduce confusion, eliminate jargon, and frame each legislative item in terms of everyday life. The experience must reassure users that their vote is relevant, that the system is neutral, and that the guidance is rooted in verifiable sources.

---

### 2. Current State and Repository Fit

The `OpenSeimas` repository is already well-suited for a V.4 transition:

- `Seimas.v2/` contains the core Python backend and ingestion logic.
- `Seimas.v2/dashboard/` holds a React/Vite frontend prototype.
- `docs/archive/` preserves previous `.openplanter` prompt material and research artifacts.
- `AGENTS.md` and `docs/memory-bank.md` already document agent roles and voter-centered heuristics.
- `Seimas.v2/pipeline/` is established and contains `common.py` and `cli.py` for shared utilities and pipeline execution.

**Existing Strengths**
- Clear separation between backend ingestion and frontend presentation.
- Strong conceptual alignment with a voter-first product strategy.
- Existing documentation of agent roles and voter UX principles.

**Remaining Gaps**
- No integrated voter recommendation engine yet.
- Explainability and provenance are not fully implemented.
- Frontend lacks a complete, mobile-first recommendation experience.

**Repository Fit**
This repo is a strong foundation because the technical cleanup is complete, the data pipeline has been consolidated, and the project now has a coherent product narrative. V.4 can be implemented by refining existing backend assets rather than rebuilding from scratch.

---

### 3. Problem Statement

The platform must solve this core problem:

> Make voting choices understandable, relevant, and personally meaningful for the average Lithuanian voter.

Average voters are overwhelmed by political noise, unclear legislative language, and uncertainty about the impact of their vote. V.4 must provide clear guidance, preserve trust, and make civic participation feel both important and actionable.

**Product Challenge:** Design an agent-backed system that translates parliamentary data into short, non-partisan recommendations, with explicit evidence and user-friendly Lithuanian UX.

---

### 4. Strategic Objectives

1. **Clarify legislative impact:** Turn complex bill data into simple voting guidance tied to everyday life.
2. **Anchor trust in transparency:** Show provenance for every claim and display confidence explicitly.
3. **Maintain strict neutrality:** Use safety controls to keep recommendations fact-based and non-partisan.
4. **Deliver a mobile-first Lithuanian UX:** Design for smartphones and local language readability.
5. **Unify the ingestion pipeline:** Stabilize `Seimas.v2/pipeline/` as the source of truth for data.
6. **Create a lightweight onboarding experience:** Capture user interests without requiring invasive profiles.
7. **Measure civic usefulness:** Track comprehension, trust, and action instead of vanity metrics.

---

### 5. Proposed Solution Architecture

The V.4 architecture is composed of six integrated layers:

- **Data Ingestion and Normalization:** `Seimas.v2/pipeline/` collects raw parliamentary data, cleans it, and converts it into structured artifacts.
- **Service Layer:** `Seimas.v2/main.py` hosts FastAPI endpoints for recommendations, bill details, and user preference storage.
- **Recommendation Engine:** The agentic core produces voter guidance from normalized data, using explicit rules and preference signals.
- **Explainability and Provenance:** Each recommendation includes source links, cited data points, and a short rationale.
- **Frontend Experience:** `Seimas.v2/dashboard/` renders the voter interface, using React/Vite to deliver a responsive Lithuanian-language experience.
- **Feedback and Metrics:** A dedicated layer captures user feedback, comprehension checks, and trust ratings.

**Data Flow**
1. Raw Seimas data enters the pipeline.
2. The pipeline normalizes and stores votes, bills, parties, and committee actions.
3. The recommendation engine evaluates relevance to user preferences.
4. The explainability layer attaches provenance metadata.
5. The frontend displays compact recommendations and source-backed details.
6. Feedback returns to the metrics layer for calibration.

---

### 6. Phased Roadmap

**Phase 1: Archive, cleanup, and architectural stabilization**
- **Scope:** Lock the repository structure, remove legacy code, and document architecture.
- **Deliverables:** Architecture diagram, repo audit, clean build scripts.
- **Duration:** 2 weeks.
- **Success:** A reproducible repo state with no desktop/Tauri leftovers and a clear path from `Seimas.v2/pipeline/` to `Seimas.v2/main.py`.

**Phase 2: Pipeline hardening and data model design**
- **Scope:** Define canonical data schemas and stabilize ingestion.
- **Deliverables:** Pydantic models, normalized ingest scripts, nightly pipeline jobs.
- **Duration:** 3 weeks.
- **Success:** Consistent, machine-readable parliamentary artifacts and a working `Seimas.v2/pipeline/cli.py` runner.

**Phase 3: VoterGuideAgent MVP**
- **Scope:** Build the core recommendation logic and integrate it with the API.
- **Deliverables:** `Seimas.v2/agents/voter_guide.py`, recommendation endpoint, sample outputs.
- **Duration:** 3 weeks.
- **Success:** The system can generate clear recommendations for recent legislative items.

**Phase 4: Explainability, provenance, and safety**
- **Scope:** Add source tracking, rationale generation, and non-partisan checks.
- **Deliverables:** `ExplainabilityAgent`, `SafetyAgent`, provenance metadata in API responses.
- **Duration:** 2 weeks.
- **Success:** All recommendations include explicit source links and safety validation.

**Phase 5: Frontend MVP and mobile usability**
- **Scope:** Build the voter-facing web app with Lithuanian UX.
- **Deliverables:** Responsive dashboard, onboarding flow, recommendation cards.
- **Duration:** 3 weeks.
- **Success:** A usable mobile-first experience that conveys “why this matters to me”.

**Phase 6: Metrics, calibration, and beta launch**
- **Scope:** Add user feedback, historical calibration, and release preparation.
- **Deliverables:** Metrics dashboard, beta launch checklist, soft launch plan.
- **Duration:** 2 weeks.
- **Success:** Measured comprehension and trust metrics, with a real beta audience.

**Phase 7: Post-beta iteration**
- **Scope:** Improve based on feedback and add richer personalization.
- **Deliverables:** Refined recommendation models, expanded UI, performance optimizations.
- **Duration:** 2–4 weeks.
- **Success:** Higher engagement and stronger trust signals.

---

### 7. Detailed Feature Set

- **Recommendation cards**
  - Headline + 3 reason bullets.
  - Benefit: Voters can grasp the main point in seconds.

- **Lithuanian-language summaries**
  - Concise local language text.
  - Benefit: Better comprehension and trust among everyday users.

- **Confidence and uncertainty indicators**
  - Clear visual meter for recommendation certainty.
  - Benefit: Users know when guidance is strong versus exploratory.

- **Source and provenance markers**
  - Direct links to bill texts, vote records, and official documents.
  - Benefit: Builds credibility through transparency.

- **Lightweight preference onboarding**
  - 3–5 simple questions about priorities.
  - Benefit: Personalized relevance without invasive profiling.

- **Feedback capture**
  - One-click trust rating and “was this useful?” prompts.
  - Benefit: Continuous product improvement.

- **Mobile-first design**
  - Responsive, touch-friendly UI optimized for phones.
  - Benefit: Meets the actual usage pattern of Lithuanian voters.

- **Non-partisan fact mode**
  - Display only evidence-backed impact, not persuasion.
  - Benefit: Protects trust and reduces perceived bias.

- **“Why this matters to you” section**
  - Translates legislative effects into daily life.
  - Benefit: Makes the vote feel important and relevant.

- **Accessibility-first layout**
  - High contrast, readable fonts, keyboard support.
  - Benefit: Inclusive access for all voters.

---

### 8. Agent Roles and Responsibilities

**`VoterGuideAgent`**
- Purpose: Convert normalized legislative data into voter guidance.
- Inputs: bill metadata, vote records, user preferences.
- Outputs: summary, recommendation tier, rationale.
- Voter impact: Helps citizens understand what to vote for.

**`PersonalizationAgent`**
- Purpose: Adjust guidance to stated interests.
- Inputs: onboarding preferences, feedback history.
- Outputs: relevance tags, tailored recommendations.
- Voter impact: Makes guidance feel personally meaningful.

**`ExplainabilityAgent`**
- Purpose: Attach provenance and rationale to every output.
- Inputs: raw data sources, recommendation content.
- Outputs: source links, evidence snippets, reasoning notes.
- Voter impact: Increases trust and reduces skepticism.

**`SafetyAgent`**
- Purpose: Enforce neutrality and detect partisan wording.
- Inputs: generated text, source context.
- Outputs: safety pass/fail, rewrite suggestions.
- Voter impact: Maintains non-partisan credibility.

**`PipelineAgent`**
- Purpose: Manage ingestion, normalization, and data health.
- Inputs: raw Seimas feeds, external metadata.
- Outputs: clean artifacts, validation reports.
- Voter impact: Ensures the platform is reliable and current.

These agents can be implemented in code as separate modules under `Seimas.v2/agents/` and integrated into the API layer via `Seimas.v2/main.py` and `Seimas.v2/pipeline/cli.py`.

---

### 9. Implementation Notes

- **Python package structure**
  - Keep `Seimas.v2/pipeline/` as the ingestion core.
  - Add `Seimas.v2/agents/` for recommendation engine modules.
  - Use `Seimas.v2/pipeline/common.py` for shared utilities.
  - Use `Seimas.v2/pipeline/cli.py` as execution entrypoint for batch jobs.

- **FastAPI service**
  - Expose endpoints for:
    - `/recommendation`
    - `/bill/{id}`
    - `/preferences`
    - `/feedback`
  - Return structured responses with `sources`, `confidence`, and `explanation`.

- **Frontend architecture**
  - React + Vite with modular components.
  - Pages for onboarding, recommendations, bill detail, feedback.
  - Use `dashboard` assets as a base but simplify for MVP.

- **Data normalization**
  - Use Pydantic models to standardize bills, votes, parties, and committees.
  - Normalize dates, categories, sponsor information, and text snippets.

- **Ingest cadence**
  - Schedule daily pipeline runs.
  - Generate automated alerts on missing or stale data.
  - Optionally support near-real-time updates for breaking legislative events.

- **Reuse existing docs**
  - Reference `AGENTS.md` for agent definitions.
  - Use `docs/memory-bank.md` for voter empathy and content heuristics.
  - Archive the final plan in `docs/V4-build-plan-final.md` if desired.

- **Technology recommendations**
  - FastAPI, Pydantic, Uvicorn
  - React, Vite, Tailwind or CSS modules
  - GitHub Actions for CI
  - SQLite/Postgres backend for prototyping
  - Local storage for preference persistence

---

### 10. Success Metrics

| Metric | Definition | Target |
|---|---|---|
| Comprehension | % of users who correctly summarize a recommendation | ≥ 80% |
| Trust | Average user trust rating on a 5-point scale | ≥ 4.0 |
| Action | Click-through rate on source links or “read more” | ≥ 15% |
| Feedback | % of active users providing feedback | ≥ 5% |
| Data Freshness | Time from publication to platform availability | ≤ 12 hours |
| Provenance Coverage | % of recommendations with explicit sources | 100% |

**Additional measures**
- **Retention:** return rate of users in 7 days
- **Response time:** API latency under 300ms for recommendations
- **Error rate:** pipeline failures < 2% per month

---

### 11. Risks and Mitigation

- **Risk: Perceived bias**
  - Mitigation: enforce `SafetyAgent`, publish source links, and use neutral wording.

- **Risk: Voter confusion**
  - Mitigation: use simple cards, Lithuanian language UX, and explain “why this matters.”

- **Risk: stale or incomplete data**
  - Mitigation: automate daily ingest and add a freshness warning when data is old.

- **Risk: low mobile adoption**
  - Mitigation: prioritize mobile-first design and test with real users.

- **Risk: scope creep**
  - Mitigation: keep MVP focused on recommendation clarity, not full election simulation.

---

### 12. Governance and Next Steps

**Immediate decisions**
- Approve the agent-based architecture.
- Confirm MVP scope around recommendations, provenance, and mobile UX.
- Assign backend owner for `Seimas.v2/pipeline/` and frontend owner for `dashboard`.

**Recommended next deliverables**
1. Prototype `Seimas.v2/agents/voter_guide.py`.
2. Refine `docs/V4-build-plan-draft.md` into a final product roadmap.
3. Create a CI ingest workflow and release checklist.
4. Define a first beta test with actual Lithuanian voter users.
5. Document a non-partisan content review process.

**Review cadence**
- Weekly sync on pipeline progress.
- Bi-weekly demo of recommendation outputs.
- Stakeholder review after Phase 3 and before Phase 6.

---

### 13. Attribution

This plan was created by Manus AI.