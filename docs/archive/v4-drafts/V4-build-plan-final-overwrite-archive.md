## OpenSeimas V.4 Build Plan
This plan was created by an AI assistant to guide the migration of OpenSeimas toward a voter-first civic observatory. The objective is to help everyday Lithuanian voters understand what each vote means, feel that their choice is important, and make decisions with transparent, non-partisan guidance.

## 1. Executive Summary
**Mission:** OpenSeimas V.4 transforms complex parliamentary data into clear, personalized, and actionable civic insights that empower citizens to participate confidently in the democratic process.

The V.4 Vision: OpenSeimas V.4 shifts from a raw data repository to an intelligent civic engine. It leverages automated agents to digest legislative changes, summarize their direct impact on daily life, and present these insights through an accessible, mobile-first dashboard. The system must keep recommendations non-partisan and explainable, ensuring that technology bridges the gap between the Seimas and the street.

Why It Matters: A typical Lithuanian voter—perhaps a busy parent in Kaunas or a small business owner in Klaipėda—often feels disconnected from the legislative processes in Vilnius. They need to know that their vote is important and relevant to their community's future. By translating dense legal text into practical consequences, OpenSeimas V.4 restores civic agency, proving that individual engagement directly influences national outcomes.

## 2. Current State
Repository Audit: The project currently resides in the OpenSeimas repository on the main branch. The structure includes Seimas.v2 for Python backend and ingestion, dashboard for the React/Vite web prototype, and archive for legacy .openplanter prompts and artifacts. Key documentation exists in AGENTS.md and memory-bank.md.

Completed Milestones:
- V3 artifacts have been successfully archived and tagged.
- The desktop/Tauri app code and large binaries are removed.
- The prototype/demo UI has been trimmed for clarity.
- Data ingestion scripts are consolidated into a unified pipeline.
- Voter-first documentation is drafted and centralized.

Repository Fit: The current OpenSeimas repository is highly suitable for this transition because it already possesses a clean separation of concerns. The foundational pipeline is centralized, legacy bloat has been stripped, and the presence of AGENTS.md and memory-bank.md provides a ready-made architectural blueprint for deploying intelligent services.

Strengths:
- Clean, modular pipeline architecture ready for expansion.
- Strong foundational guidelines for agent behavior and voter-centric content.
- Lightweight frontend prototype primed for rapid iteration.

Remaining Gaps:
- Lack of a production-ready explainability layer linking summaries to raw sources.
- Absence of a structured metric capture system to evaluate voter comprehension and trust.

## 3. Problem Statement
Core Problem: Make voting choices understandable, relevant, and personally meaningful.

User Need: The average Lithuanian voter needs clarity, trust, and actionability. They are overwhelmed by political noise and require a secure, culturally attuned tool that cuts through jargon without telling them what to think.

Product Challenge: We must architect an automated system that translates high-volume, complex parliamentary data into concise, unbiased, and highly accurate civic insights that everyday citizens can confidently act upon.

## 4. Strategic Objectives
- Empower the Citizen: Help voters understand what each bill means for their daily life.
- Build Confidence: Reduce uncertainty by presenting clear rationale and confidence levels alongside every insight.
- Ensure Neutrality: Preserve non-partisan trust through transparent evidence and direct source linking.
- Optimize Accessibility: Deliver a seamless, mobile-first Lithuanian language UX that welcomes users of all technical proficiencies.
- Scale Ingestion: Automate the reliable normalization of Seimas data into a structured, queryable format.
- Protect Privacy: Implement lightweight preference onboarding without invasive tracking or data harvesting.

## 5. Proposed Solution Architecture
The V.4 architecture is a layered, decoupled system designed for transparency and speed.

- **Data Ingestion and Normalization:** Hosted in the pipeline directory, this layer fetches raw Seimas data, cleans it, and structures it into a unified schema using cli.py for task orchestration.
- **API / Service Layer:** Driven by main.py using FastAPI, this layer exposes secure endpoints for the frontend to request legislative summaries and user-specific data.
- **Voter Recommendation Engine:** This logic layer routes processed bills through the agent network to generate personalized, non-partisan insights.
- **Explainability and Provenance Layer:** Attaches exact source links, metadata, and confidence scores to every generated output, ensuring the AI's reasoning is visible.
- **Frontend Experience:** The dashboard (React/Vite) consumes the API, rendering responsive, accessibility-first interfaces for the end user.
- **Feedback and Metrics Layer:** Captures anonymous user trust signals and comprehension ratings, feeding them back into the system for continuous calibration.

System Flow: Raw parliamentary data is pulled via the pipeline, processed by the PipelineAgent, and stored. When a user queries the dashboard, the API triggers the VoterGuideAgent and PersonalizationAgent. They generate a summary, which is verified by the ExplainabilityAgent and SafetyAgent before being delivered to the React frontend.

## 6. Phased Roadmap
### Phase 1: Archive, cleanup, and architectural stabilization
Scope: Finalize the transition from V.3 and establish the V.4 baseline.
Deliverables: Locked dependency files, finalized repository directory structure, and a deployed staging environment.
Duration: 2 weeks.
Success Criteria: The V.3 archive is sealed, all legacy code is fully excised, and the V.4 baseline builds successfully in continuous integration without warnings.

### Phase 2: Pipeline hardening and data model design
Scope: Fortify the backend to handle continuous, automated data ingestion.
Deliverables: Pydantic schemas for all legislative data, automated cli.py cron jobs, and database migration scripts.
Duration: 3 weeks.
Success Criteria: The pipeline successfully ingests, normalizes, and stores one full week of Seimas activity without manual intervention or data loss.

### Phase 3: VoterGuideAgent MVP
Scope: Build and prompt the core intelligence layer to generate civic summaries.
Deliverables: Implementation of the VoterGuideAgent in Seimas.v2/agents/voter_guide.py, connected to the internal LLM gateway.
Duration: 3 weeks.
Success Criteria: The agent consistently transforms raw bill text into a localized, three-bullet summary that passes internal non-partisan quality checks.

### Phase 4: Explainability, provenance, and safety
Scope: Add trust guardrails to all generated content.
Deliverables: Implementation of the ExplainabilityAgent and SafetyAgent, appending confidence bars and source links to the API payload.
Duration: 2 weeks.
Success Criteria: Every API response containing a recommendation includes a valid source URL, a confidence score, and passes the SafetyAgent's bias filter.

### Phase 5: Frontend MVP and mobile usability
Scope: Develop the React/Vite user interface focusing on a premium Lithuanian language UX.
Deliverables: Mobile-responsive dashboard featuring recommendation cards, reading modes, and preference toggles.
Duration: 4 weeks.
Success Criteria: The dashboard loads in under two seconds on mobile devices and successfully renders the complete API payload with accurate visual hierarchy.

### Phase 6: Metrics, historical calibration, and beta launch
Scope: Deploy the feedback capture system and open the platform to beta users.
Deliverables: In-app trust surveys, analytics integration, and the official beta release.
Duration: 3 weeks.
Success Criteria: Beta users can submit feedback, system metrics are successfully logged to the database, and zero critical crashes occur during the first week of launch.

### Phase 7: Iteration and scaling (Optional)
Scope: Post-beta refinement based on real-world voter interactions.
Deliverables: Adjusted agent prompts, enhanced UI components, and expanded data sources.
Duration: Ongoing.
Success Criteria: A measurable increase in user trust scores and a reduction in reported data anomalies.

## 7. Detailed Feature Set
Recommendation cards with headline + 3 bullet reasons: Distills complex bills into a clear title and three distinct impacts. Immediate voter benefit: Rapid comprehension of dense legal text.

Compact explanation in Lithuanian: A high-quality, localized Lithuanian language UX that respects the user's cultural context. Immediate voter benefit: Builds foundational trust and accessibility for non-English speakers.

Explicit confidence/uncertainty bar: A visual indicator showing how certain the system is about the bill's outcome. Immediate voter benefit: Fosters trust by acknowledging system limitations transparently.

Source links and provenance markers: Direct links to the official Seimas registry for every claim. Immediate voter benefit: Allows skeptical voters to verify facts independently.

Lightweight preference onboarding: Allows users to select topics of interest (e.g., healthcare, taxes) without invasive tracking. Immediate voter benefit: Delivers personalized relevance without compromising privacy.

Feedback capture and trust survey: A simple module asking "Was this helpful?" Immediate voter benefit: Gives the voter a voice in improving the tool.

Accessibility-first and mobile-first layout: Clean typography, high contrast, and touch-friendly targets. Immediate voter benefit: Ensures the platform is usable on the go for all demographics.

Non-partisan reading mode and "why this matters to you" section: Strips away political rhetoric to focus purely on citizen impact. Immediate voter benefit: Makes voters feel their vote is important and relevant to their daily lives.

## 8. Agent Roles and Responsibilities
VoterGuideAgent
Purpose: Translates legislative jargon into clear, impactful summaries.
Inputs: Normalized bill text, historical context.
Outputs: Headlines, 3-bullet summaries, "why this matters" text.
Voter Support: Bridges the knowledge gap, making politics instantly understandable.

PersonalizationAgent
Purpose: Maps general summaries to specific user preference profiles.
Inputs: VoterGuideAgent summaries, user topic preferences (anonymous).
Outputs: Re-ranked or highlighted content based on relevance.
Voter Support: Cuts through the noise so the user only sees what directly impacts them.

ExplainabilityAgent
Purpose: Ensures every claim can be traced to a verifiable fact.
Inputs: Generated summaries, raw pipeline data.
Outputs: Provenance metadata, confidence scores, exact source URLs.
Voter Support: Builds absolute trust by proving the system is not hallucinating or guessing.

SafetyAgent
Purpose: Acts as a strict gatekeeper against bias and inflammatory rhetoric.
Inputs: Final drafts from all other agents.
Outputs: Pass/Fail flags, redaction recommendations.
Voter Support: Guarantees a safe, non-partisan environment free from political manipulation.

PipelineAgent
Purpose: Manages the health and structure of incoming Seimas data.
Inputs: Raw XML/JSON from government APIs.
Outputs: Clean, standardized database records.
Voter Support: Ensures the information the voter relies on is always fresh, accurate, and unbroken.

## 9. Implementation Details
Backend Architecture: Use a modular Python package structure within Seimas.v2. Utilize FastAPI for high-performance, asynchronous endpoints, and Pydantic for strict data validation. The existing cli.py should serve as the primary runner for all pipeline jobs, cron tasks, and manual ingest overrides. common.py must contain shared configurations and logging setups.

Frontend Architecture: The dashboard will utilize React and Vite for rapid builds and hot-module replacement. State management should be kept lightweight (e.g., React Context) to avoid bloat. Components must be strictly typed using TypeScript to align with backend Pydantic models.

Integration: Data normalization should occur on a nightly ingest cadence via the CLI. API contracts must enforce a strict schema where recommendation endpoints always return a unified payload containing the summary, provenance data, and safety flags. Existing artifacts in AGENTS.md and memory-bank.md should be directly injected into the system prompt orchestration layer. Avoid proprietary SaaS lock-in; rely on open-source libraries.

## 10. Success Metrics
| Metric Name | Definition | Target Behavior |
|---|---|---|
| Comprehension Score | User rating of how easily they understood the summary. | Maintain an average rating of 4.5/5.0. |
| Trust Index | Percentage of users indicating they trust the platform's neutrality. | Exceed 85% positive sentiment. |
| Action Rate | Percentage of users who click a source link or read a full bill. | Achieve >15% engagement per session. |
| Feedback Volume | Number of trust surveys submitted per 1,000 active users. | Capture at least 50 responses per 1,000 users. |
| Data Freshness | Time elapsed between a Seimas publication and dashboard availability. | Keep latency under 24 hours. |
| Provenance Coverage | Percentage of insights displaying a valid, verifiable source link. | Maintain strict 100% coverage. |

## 11. Risks and Mitigation
Perceived Bias:
Why it matters: If voters suspect the tool favors one party, the project dies instantly.
Mitigation: Enforce the SafetyAgent strictly; publish the system prompts and open-source the decision logic to ensure total transparency.

Uncertain Recommendations:
Why it matters: Hallucinations or vague summaries destroy credibility.
Mitigation: Require the ExplainabilityAgent to flag low-confidence outputs, and display a prominent "Uncertainty Bar" to the user when data is ambiguous.

Stale or Incomplete Data:
Why it matters: Outdated information leads to misinformed voters.
Mitigation: Implement automated alerting in cli.py to notify engineers immediately if the nightly ingestion pipeline fails.

Low User Trust or Adoption:
Why it matters: A tool no one uses fails its civic mission.
Mitigation: Focus heavily on the localized Lithuanian language UX and ensure the onboarding process is entirely frictionless and tracking-free.

Engineering Scope Creep:
Why it matters: Over-engineering delays the launch past critical civic deadlines.
Mitigation: Stick rigidly to the Phased Roadmap; defer all "nice-to-have" features to Phase 7.

## 12. Governance and Next Steps
Immediate Organizational Decisions:
- Formally approve the decoupled, agent-based architecture outlined in this document.
- Freeze the MVP scope to the deliverables listed in Phases 1 through 5.
- Assign explicit engineering owners for the Python backend pipeline and the React frontend dashboard.
- Schedule bi-weekly review checkpoints to evaluate agent output quality against the memory-bank.md guidelines.

Concrete Next Deliverables:
1. Draft the Seimas.v2/agents/voter_guide.py prototype and run initial local tests.
2. Refine the V4-build-plan-draft.md with specific ticket assignments and technical constraints.
3. Configure the CI ingest workflow and finalize the pre-release deployment checklist.

## 13. Attribution
This plan was created by an AI assistant.

By Gemini 3.1 Pro
