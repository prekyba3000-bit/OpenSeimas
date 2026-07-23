## OpenSeimas V.4 Build Plan

This plan was created by Grok, an AI assistant, to guide the migration of OpenSeimas toward a voter-first civic observatory. The objective is to help everyday Lithuanian voters understand what each vote means, feel that their choice is important, and make decisions with transparent, non-partisan guidance.

### 1. Executive Summary

**Mission Statement:** OpenSeimas V.4 empowers Lithuanian voters with precise, relevant, evidence-backed guidance on Seimas bills and votes, converting legislative complexity into civic confidence.

OpenSeimas V.4 will evolve the repo from a partially experimental civic data project into a coherent public-facing platform. It will do this by combining a robust ingestion pipeline, a modular agent architecture, an explainability layer, and a polished Lithuanian-language interface. The system will not only surface parliamentary actions but also interpret them in ways ordinary voters can understand, thereby closing the gap between Seimas operations and everyday life.

For average Lithuanian citizens, this matters because representative democracy only works when people feel equipped to make informed choices. Many voters are busy, distrust political language, and do not see how distant legislative work affects their family budgets, school districts, health care access, or local services. V.4 directly addresses these concerns by offering simple, grounded recommendations, clarifying the stakes in Lithuanian, and making every vote feel relevant.

---

### 2. Current State

The `OpenSeimas` repository on `main` already contains the core building blocks for V.4:

- `Seimas.v2/` — Python backend, FastAPI entrypoints, and consolidated ingestion scripts.
- `Seimas.v2/dashboard/` — React/Vite frontend prototype and associated UI components.
- `docs/archive/` — preserved `.openplanter` prompts and archival materials.
- `AGENTS.md` — explicit definitions for agent roles and responsibilities.
- `docs/memory-bank.md` — voter-focused content principles and empathy notes.
- `Seimas.v2/pipeline/common.py` and `Seimas.v2/pipeline/cli.py` — shared utilities and pipeline orchestration.

**Strengths**
- The repository has already been cleaned of legacy desktop/Tauri artifacts, reducing noise and complexity.
- There is a clear backend/frontend separation, which supports parallel development.
- Voter-centric documentation exists, giving the project a product-oriented foundation.
- The ingestion pipeline has been consolidated into a package, making it ready for production-level stability.

**Gaps**
- There is no production-ready recommendation engine that converts data into voter advice.
- Explainability and provenance are conceptually defined but not enforced in outputs.
- The frontend is prototype-level and not yet optimized for Lithuanian mobile users.
- Feedback collection, trust metrics, and an operational release process are absent.

**Repository Fit**
This repo is well-positioned because it already contains the structural and conceptual assets required for V.4. The project does not need a full rebuild; it needs focused execution on agent-based recommendation, explainability, UX refinement, and operational readiness.

---

### 3. Problem Statement

**Core problem:** OpenSeimas V.4 must make voting choices understandable, relevant, and personally meaningful for average Lithuanian voters.

The everyday Lithuanian voter needs:
- clarity about what each bill and vote means,
- trust that recommendations are unbiased,
- guidance that connects policy to daily life,
- a sense that their vote matters.

**Product challenge:** Build a civic recommendation product that transforms raw Seimas data into concise, non-partisan voter guidance while preserving transparency and local relevance.

---

### 4. Strategic Objectives

1. **Convert parliamentary data into clear voter recommendations** that explain the real-world impact of bills.
2. **Build trust through transparency** by surfacing sources, confidence levels, and rationale.
3. **Maintain strict non-partisanship** with explicit safety controls and neutral language.
4. **Deliver a mobile-first Lithuanian UX** that feels natural and accessible to the average voter.
5. **Enable low-friction personalization** without invasive profiling or persistent tracking.
6. **Establish a reliable daily data pipeline** to keep the system current.
7. **Create a scalable agent architecture** that supports future extensions and content automation.
8. **Capture user feedback and comprehension metrics** to measure civic usefulness rather than raw traffic.

---

### 5. Proposed Solution Architecture

The V.4 architecture is layered and modular, designed for reliability and transparency:

- **Data Ingestion Layer**
  - Source: parliamentary feeds, vote records, bill texts, committee reports.
  - Location: `Seimas.v2/pipeline/`.
  - Outcome: normalized bill, vote, and party artifacts.

- **Service / API Layer**
  - Source: `Seimas.v2/main.py`.
  - Provides REST endpoints for recommendations, bill detail, onboarding, and feedback.
  - Uses FastAPI and Pydantic for stable contracts.

- **Recommendation Engine (VoterGuideAgent)**
  - Source: agent modules under `Seimas.v2/agents/`.
  - Combines normalized data with preference signals.
  - Produces voter-facing guidance and summary cards.

- **Explainability and Provenance Layer**
  - Source: extended agent logic and metadata.
  - Attaches source links, quoted evidence, and confidence scores.
  - Ensures every recommendation is traceable.

- **Frontend Experience**
  - Source: `Seimas.v2/dashboard/`.
  - Delivers a responsive, Lithuanian-language interface.
  - Presents onboarding, recommendation cards, bill details, and feedback flows.

- **Feedback & Metrics Layer**
  - Captures trust ratings, comprehension checks, engagement, and freshness.
  - Feeds back into prioritization and calibration.

**Flow**
1. Raw parliamentary data is ingested and normalized in `Seimas.v2/pipeline/`.
2. `cli.py` orchestrates ingest tasks and updates data artifacts.
3. `main.py` exposes recommendation and feedback APIs.
4. The frontend consumes these APIs and displays them in the voter interface.
5. Feedback returns to the backend for continuous improvement and future tuning.

---

### 6. Phased Roadmap

**Phase 1: Archive, cleanup, and architectural stabilization**  
Scope: Lock the codebase, finalize the repo structure, and define the V.4 architecture.  
Deliverables: architecture diagram, documentation of agent/hardening plans, clean branch strategy.  
Duration: 1–2 weeks.  
Success: A stable repo with clear module boundaries and no remaining V3 desktop/multi-runtime clutter.

**Phase 2: Pipeline hardening and data model design**  
Scope: Build robust ingestion, schema validation, and normalized data outputs.  
Deliverables: Pydantic models for bills/votes/parties, stable `Seimas.v2/pipeline/` scripts, automated ingest scheduling.  
Duration: 3 weeks.  
Success: Daily ingestion runs produce consistent, queryable data with error reporting.

**Phase 3: VoterGuideAgent MVP**  
Scope: Implement the first recommendation engine and basic output formatting.  
Deliverables: `Seimas.v2/agents/voter_guide.py`, API endpoints, sample recommendation cards.  
Duration: 4 weeks.  
Success: The system can generate coherent recommendations for recent bills in Lithuanian.

**Phase 4: Explainability, provenance, and safety**  
Scope: Add provenance metadata, explicit confidence scores, and content safety checks.  
Deliverables: `ExplainabilityAgent`, `SafetyAgent`, provenance fields in API responses.  
Duration: 3 weeks.  
Success: All recommendations include source citations and can be audited.

**Phase 5: Frontend MVP and mobile usability**  
Scope: Build a polished voter-facing dashboard with onboarding and feedback UI.  
Deliverables: responsive web interface, Lithuanian copy, mobile-first navigation.  
Duration: 4 weeks.  
Success: User testing shows strong comprehension and usability on phones.

**Phase 6: Metrics, calibration, and beta launch**  
Scope: Instrument product metrics and launch a soft beta for real voters.  
Deliverables: metrics dashboards, beta launch checklist, initial feedback loop.  
Duration: 3 weeks.  
Success: Positive early feedback and measurable trust/comprehension data.

**Phase 7: Post-beta refinement and extension**  
Scope: Improve personalization, add additional legislative coverage, and polish UX.  
Deliverables: refined recommendation tuning, richer preference matching, improved accessibility.  
Duration: 2–4 weeks.  
Success: Higher adoption and stronger satisfaction metrics.

---

### 7. Detailed Feature Set

- **Recommendation cards**
  - Format: headline, 3 supporting bullets, confidence level, source badges.
  - Benefit: Immediate voter clarity.

- **Compact Lithuanian summaries**
  - Local-language explanations that use plain words.
  - Benefit: Higher comprehension and cultural trust.

- **Confidence/uncertainty indicator**
  - A visual bar or label showing certainty.
  - Benefit: Users understand when to treat output as strong guidance versus tentative insight.

- **Provenance links**
  - Every card shows official sources and data points.
  - Benefit: Builds credibility and reduces skepticism.

- **“Why this matters to you” section**
  - explicitly links bills to family budgets, local services, or community outcomes.
  - Benefit: Makes voting feel personally relevant.

- **Light preference onboarding**
  - A short survey on priorities, such as education, health, or local infrastructure.
  - Benefit: Personal relevance without persistent profiling.

- **Feedback capture**
  - Quick trust rating and “was this useful?” controls.
  - Benefit: Real user signals for iteration.

- **Mobile-first design**
  - Large text, simple controls, and responsive layout.
  - Benefit: Accessible for smartphone-first users.

- **Non-partisan mode**
  - Focuses on factual consequences, not persuasion.
  - Benefit: Maintains credibility and avoids political bias.

- **Accessibility-first interface**
  - High contrast, keyboard support, and readable font sizes.
  - Benefit: Inclusive use by older voters and those with disabilities.

- **Historical comparison**
  - Provide past vote context and how similar bills were treated.
  - Benefit: Helps users understand trends and legacy decisions.

- **Data freshness badge**
  - Shows when the information was last updated.
  - Benefit: Reinforces trust and timeliness.

---

### 8. Agent Roles and Responsibilities

**VoterGuideAgent**  
- Purpose: generate concise voter recommendations from legislative data.  
- Inputs: normalized bill data, vote metadata, user preferences.  
- Outputs: recommendation tier, summary, rationale, confidence.  
- Voter impact: translates complex legislation into actionable guidance.

**PersonalizationAgent**  
- Purpose: match recommendations to individual priorities.  
- Inputs: onboarding topics, implicit preferences, feedback signals.  
- Outputs: relevance scores, personalization hints.  
- Voter impact: makes guidance feel tailored and more relevant.

**ExplainabilityAgent**  
- Purpose: attach sources and reasoning to every output.  
- Inputs: recommendation drafts, data provenance, source documents.  
- Outputs: evidence snippets, source links, reasoning bullets.  
- Voter impact: increases trust and makes outputs auditable.

**SafetyAgent**  
- Purpose: verify neutrality and filter partisan language.  
- Inputs: generated content, historical bias patterns.  
- Outputs: safety verdicts, rewrite suggestions.  
- Voter impact: ensures the platform stays fact-based and trustworthy.

**PipelineAgent**  
- Purpose: manage data ingestion, normalization, and integrity.  
- Inputs: raw parliamentary feeds, bill texts, vote records.  
- Outputs: structured data artifacts and validation reports.  
- Voter impact: provides the reliable data foundation for recommendations.

These agents should map to code modules under `Seimas.v2/agents/`, with clear interfaces and test coverage. They should also influence UX messaging by labeling outputs as “explained,” “personalized,” or “verified neutral.”

---

### 9. Implementation Details

**Backend architecture**
- Keep `Seimas.v2/pipeline/` as the ingestion package and extend it with data models.
- Add a new `Seimas.v2/agents/` package for recommendation and explanation logic.
- Use `Seimas.v2/main.py` as the FastAPI entrypoint.

**Shared utilities**
- `Seimas.v2/pipeline/common.py` should contain logging, config loading, and environment helpers.
- `Seimas.v2/pipeline/cli.py` should orchestrate ingest jobs and provide developer commands such as `ingest`, `validate`, and `export`.

**API contract**
- `GET /recommendations?user=...`
- `GET /bills/{id}`
- `POST /feedback`
- Response structure should include:
  - `title`
  - `summary`
  - `confidence`
  - `provenance`
  - `relevance`
  - `recommendation`

**Frontend architecture**
- Use React and Vite with component-driven design.
- Build pages for onboarding, recommendation feed, bill details, and feedback.
- Reuse existing `dashboard` assets and simplify them into a focused product flow.

**Data normalization**
- Define canonical data models for:
  - `Bill`
  - `Vote`
  - `Party`
  - `Committee`
  - `LegislativeSession`
- Normalize dates, categories, and sponsor information.
- Convert raw text into sanitized summary fields.

**Ingest cadence**
- Schedule nightly pipeline runs for daily freshness.
- Support manual refresh for urgent sessions.
- Add alerts for failed ingests or stale data.

**Tooling**
- FastAPI / Uvicorn
- Pydantic for validation
- React / Vite for frontend
- Tailwind or CSS modules for styling
- SQLite or PostgreSQL for MVP data storage
- GitHub Actions for CI / daily ingest

**Reference assets**
- Use `AGENTS.md` for agent roles.
- Use `docs/memory-bank.md` for tone and voter empathy.
- Document the plan in `docs/V4-build-plan-draft.md` and evolve it into a final roadmap.

---

### 10. Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Comprehension** | % of users able to summarize a recommendation correctly | ≥ 80% |
| **Trust** | Average user trust rating after interacting with guidance | ≥ 4.0 / 5 |
| **Action** | % of users who click source links or take a follow-up action | ≥ 15% |
| **Feedback** | % of active users who provide ratings/comments | ≥ 10% |
| **Data Freshness** | Median time from legislative publication to availability | ≤ 12 hours |
| **Provenance Coverage** | % of outputs with explicit source references | 100% |
| **Mobile Usability** | % of sessions on mobile devices with successful task completion | ≥ 90% |
| **Neutrality Compliance** | % of outputs passing SafetyAgent review | ≥ 98% |

**Extended metrics**
- **Retention rate** — repeat users within 7 days.
- **Latency** — API response times under 300 ms.
- **Pipeline error rate** — ingest failures below 2% per month.

---

### 11. Risks and Mitigation

**Perceived bias**
- Why it matters: Any hint of partisanship destroys civic trust.
- Mitigation: enforce SafetyAgent checks, publish methodology, and include source citations.

**Over-simplification**
- Why it matters: Simplifying too far can mislead voters.
- Mitigation: combine short summaries with “read more” details and provenance.

**Data staleness**
- Why it matters: stale information undermines credibility.
- Mitigation: daily ingest jobs, freshness metadata, and alerting.

**Low mobile adoption**
- Why it matters: most voters will use mobile devices.
- Mitigation: prioritize responsive Lithuanian UX and mobile testing.

**Scope creep**
- Why it matters: delays the first useful product.
- Mitigation: keep an MVP focus on recommendation clarity and trust first.

---

### 12. Governance and Next Steps

**Immediate governance decisions**
- Approve the agent-based architecture and the MVP scope.
- Assign a backend lead for `Seimas.v2/pipeline/` and `Seimas.v2/agents/`.
- Assign a frontend lead for `Seimas.v2/dashboard/`.
- Establish bi-weekly product reviews and demo checkpoints.

**Recommended next deliverables**
1. Prototype `Seimas.v2/agents/voter_guide.py` with sample Lithuanian outputs.
2. Refine `docs/V4-build-plan-draft.md` into a final roadmap and checklist.
3. Implement CI workflow for nightly ingest and health checks.
4. Define a small beta cohort of Lithuanian users for early testing.
5. Create a release checklist with data validation, UX signoff, and trust audit.

**Review cadence**
- Week 1: architecture and pipeline audit.
- Week 3: first recommendation prototype review.
- Week 5: explainability and safety validation.
- Week 8: beta readiness and launch review.

---

### 13. Attribution

This plan was created by Grok, an AI assistant.