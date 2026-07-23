Below is the complete V.4 migration plan, structured for direct use by product, engineering, design, and civic stakeholders.

## OpenSeimas V.4 Build Plan
This plan was created by an AI assistant to guide the migration of OpenSeimas toward a voter-first civic observatory. The objective is to help everyday Lithuanian voters understand what each vote means, feel that their choice is important, and make decisions with transparent, non-partisan guidance.

## 1. Executive Summary
**Mission:** Make Lithuanian voting choices understandable, relevant, and personally meaningful through transparent evidence and explainable civic guidance.

OpenSeimas V.4 should become a mobile-first civic decision-support platform that transforms parliamentary data into clear explanations of political decisions, their real-world consequences, and their relevance to individual voters. It should combine reliable data ingestion, explainable recommendation logic, Lithuanian language UX, and visible provenance without presenting itself as an authority that tells people how to vote.

For an ordinary Lithuanian voter, parliamentary information is often fragmented, technical, and disconnected from daily concerns. V.4 should reduce that distance by explaining what decisions affect housing, income, healthcare, education, transport, security, and other practical priorities. The experience should leave voters better informed, more confident, and more aware that their vote is important and relevant.

## 2. Current State
The repository already provides a credible foundation for V.4:

- `Seimas.v2` contains the FastAPI backend, processing logic, and consolidated `pipeline`.
- `dashboard` provides the React/Vite frontend starting point.
- `archive` preserves V3 `.openplanter` prompts, tools, and wiki artifacts.
- `AGENTS.md` defines emerging agent responsibilities.
- `memory-bank.md` establishes voter-centered content principles.
- V3 has been archived and tagged.
- Desktop/Tauri code and large binaries have been removed.
- Prototype and demo UI have been trimmed.
- Data ingestion scripts have been consolidated into the pipeline.
**Strengths:** working backend foundations, cleaner repository boundaries, reusable ingestion logic, and explicit voter-first guidance.

**Remaining gaps:** no production-ready recommendation model, incomplete provenance and confidence handling, and no validated end-to-end voter experience.

**Repository fit:** OpenSeimas is suitable for this transition because its backend, pipeline, frontend, agent guidance, and historical artifacts are already separated sufficiently to evolve incrementally rather than requiring another rewrite.

## 3. Problem Statement
V.4 must **“Make voting choices understandable, relevant, and personally meaningful.”**

The average Lithuanian voter needs clarity about what political decisions mean, trust in where information comes from, and actionable explanations connected to personal priorities.

**Product challenge:** Convert complex parliamentary evidence into concise, personalized guidance without oversimplifying uncertainty or introducing partisan influence.

## 4. Strategic Objectives

1. Help voters understand what each relevant bill or political decision means for daily life.
2. Connect parliamentary activity to user-selected priorities without invasive profiling.
3. Reduce uncertainty through clear rationale and explicit confidence levels.
4. Preserve non-partisan trust through transparent evidence and source provenance.
5. Deliver a high-quality Lithuanian language UX accessible to non-expert users.
6. Build one reliable data pipeline serving APIs, agents, and frontend experiences.
7. Measure comprehension and trust rather than optimizing only for engagement.

## 5. Proposed Solution Architecture
V.4 should use six connected layers:

- **Data ingestion and normalization:** `pipeline` acquires, validates, and standardizes parliamentary records.
- **API/service layer:** `main.py` exposes stable domain and recommendation endpoints.
- **Voter recommendation engine:** agent modules evaluate relevance and alignment.
- **Explainability and provenance:** every recommendation carries reasoning, uncertainty, and sources.
- **Frontend experience:** `dashboard` presents mobile-first voter guidance.
- **Feedback and metrics:** captures usefulness, comprehension, trust, and failures.
`cli.py` should remain the operational entry point for repeatable ingestion, normalization, validation, and maintenance jobs. Raw parliamentary data should flow through the pipeline into normalized domain models, then through recommendation and explainability components, before reaching the API and voter-facing interface.

## 6. Phased Roadmap

### Phase 1: Archive, Cleanup, and Architectural Stabilization
**Duration:** 1 week. Confirm V3 archive/tag integrity, remove remaining obsolete dependencies, document repository boundaries, and freeze the initial V.4 package structure. Align `AGENTS.md` and `memory-bank.md` with the build plan. Define ownership for backend, pipeline, frontend, and civic review. **Success:** every active directory has a documented V.4 purpose and CI runs against a clean baseline.

### Phase 2: Pipeline Hardening and Data Model Design
**Duration:** 2–3 weeks. Define canonical models for bills, votes, members, parties, topics, sources, and timestamps. Make ingestion idempotent, observable, and restartable through `cli.py`. Add validation for missing or inconsistent source data. **Success:** repeated pipeline runs produce deterministic normalized records with freshness and validation status.

### Phase 3: VoterGuideAgent MVP
**Duration:** 2–3 weeks. Build `VoterGuideAgent` around normalized evidence and explicit user preferences. Return relevance, a recommendation or comparison signal, three reasons, uncertainty, and supporting records. Keep decision rules inspectable and non-partisan. **Success:** representative test cases produce understandable, reproducible outputs without unsupported claims.

### Phase 4: Explainability, Provenance, and Safety
**Duration:** 2 weeks. Introduce mandatory provenance markers, confidence rules, contradiction handling, and low-confidence fallbacks. `ExplainabilityAgent` should simplify reasoning while `SafetyAgent` checks unsupported conclusions and partisan framing. Recommendations must remain explainable rather than appearing authoritative. **Success:** every recommendation exposes its evidence and uncertainty.

### Phase 5: Frontend MVP and Mobile Usability
**Duration:** 2–3 weeks. Rebuild the essential `dashboard` journey around preference onboarding, recommendation cards, issue exploration, and source inspection. Prioritize Lithuanian language UX, readable typography, accessibility, and one-handed mobile use. Avoid political-dashboard complexity. **Success:** test users can reach and understand a recommendation without instruction.

### Phase 6: Metrics, Historical Calibration, and Beta Launch
**Duration:** 2–3 weeks. Run the system against historical parliamentary decisions, inspect recommendation stability, and establish baseline metrics. Add lightweight trust and comprehension feedback. Conduct civic and technical reviews before public beta. **Success:** agreed quality thresholds are met and release procedures are repeatable.

### Phase 7: Post-Beta Iteration
Use observed misunderstanding, low-confidence cases, accessibility issues, and user feedback to prioritize improvements rather than expanding scope by default.

## 7. Detailed Feature Set

- **Recommendation cards:** headline plus three evidence-based reasons; gives voters an immediate summary.
- **Compact Lithuanian explanation:** plain-language interpretation; reduces institutional and technical barriers.
- **Confidence/uncertainty bar:** communicates evidence strength; prevents false certainty.
- **Source links and provenance markers:** lets voters verify claims independently.
- **Lightweight preference onboarding:** captures priorities without invasive tracking.
- **Trust survey and feedback:** identifies confusing or unconvincing explanations.
- **Accessibility-first mobile layout:** supports broader practical access.
- **Non-partisan reading mode:** presents evidence without recommendation emphasis.
- **“Why this matters to you”:** connects policy decisions to selected personal priorities.
**User empathy:** V.4 should assume a voter checking a phone between work and daily responsibilities, with limited time and no desire to decode parliamentary procedure. The product should speak clearly, respect uncertainty, and never require political expertise.

## 8. Agent Roles and Responsibilities

### `VoterGuideAgent`
**Purpose:** Produce evidence-grounded voter guidance.
**Inputs:** preferences, normalized parliamentary records.
**Outputs:** relevance, recommendation signal, reasons, confidence.
Supports confidence by turning evidence into a consistent decision structure.

### `PersonalizationAgent`
Maps voluntarily supplied priorities to relevant topics and decisions without building intrusive profiles.

### `ExplainabilityAgent`
Transforms reasoning into concise Lithuanian explanations, supporting both code-level structured output and expandable UX explanations.

### `SafetyAgent`
Checks unsupported claims, excessive certainty, missing provenance, and partisan wording before publication.

### `PipelineAgent`
Coordinates ingest quality, normalization, freshness checks, and processing failures so voter-facing outputs rely on traceable data.

Agents should be implemented as explicit Python services with typed inputs and outputs, while the UX exposes their results as explanations, evidence, and confidence rather than artificial “agent personalities.”

## 9. Implementation Details
Use a clear Python package structure with absolute package imports and shared domain utilities in `common.py`. Keep `cli.py` as the single operational runner for ingestion, normalization, validation, and scheduled maintenance.

Recommendation APIs should return structured fields such as recommendation ID, issue summary, relevance, reasons, confidence, uncertainty notes, and source references. Ingestion should run on a defined cadence appropriate to source updates, with freshness timestamps exposed to clients.

For React/Vite, organize the `dashboard` around feature modules for onboarding, recommendations, issues, sources, and feedback. Reuse existing pipeline logic, `AGENTS.md`, `memory-bank.md`, and archived V3 material selectively rather than restoring obsolete architecture.

A minimal stack is sufficient: Python, FastAPI, Pydantic, standard database tooling, React, Vite, and accessible frontend components. Proprietary services should not be architectural requirements.

## 10. Success Metrics
MetricDefinitionTarget behaviorComprehensionUsers correctly explain a recommendationIncreasingTrustUsers rate explanations as credibleHigh and stableActionUsers explore issues or sourcesMeaningful engagementFeedbackActionable feedback completionSufficient for iterationData freshnessRecords within expected ingest window>95% compliantProvenance coverageClaims linked to evidence100% recommendations
## 11. Risks and Mitigation

- **Perceived bias:** destroys civic trust. Mitigate with transparent rules, evidence links, non-partisan review, and reading mode.
- **Uncertain recommendations:** can create false confidence. Display uncertainty and allow “insufficient evidence” outcomes.
- **Stale or incomplete data:** can mislead voters. Track freshness, validation state, and source failures explicitly.
- **Low trust or adoption:** usefulness may not be immediately obvious. Test language and explanations with ordinary voters early.
- **Scope creep:** could delay the core product. Freeze MVP capabilities and require evidence before adding features.

## 12. Governance and Next Steps
Immediately:

- Approve the agent-based architecture and responsibility boundaries.
- Select the exact MVP voter journey and supported policy domains.
- Assign backend, pipeline, frontend, and civic-content owners.
- Schedule architecture, civic trust, and beta-readiness checkpoints.
Next deliverables:

1. `Seimas.v2/agents/voter_guide.py` prototype.
2. `V4-build-plan-draft.md` refinement into implementation tickets.
3. CI ingest workflow plus V.4 release checklist.

## 13. Attribution
This plan was created by an AI assistant.

by Chat GPT 5.6 Sol