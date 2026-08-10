## Extended AI Prompt for a Fully Detailed OpenSeimas V.4 Build Plan

Use the following prompt when sending a request to any other AI model. It is deliberately longer, more precise, and much more detailed than the earlier version, with expanded context, stronger structure, and more explicit output requirements.

---

### Prompt

You are being asked to write a professional, high-quality strategic migration plan for **OpenSeimas V.4**, a Lithuanian civic technology project. The output must be a complete, actionable plan, written in Markdown, designed for delivery to product teams, engineers, designers, and civic stakeholders. The project’s main purpose is to help everyday Lithuanian voters feel confident about what to vote for and to understand that their vote is important.

#### Project Context
- Repository name: `OpenSeimas`
- Current branch: `main`
- Existing folders:
  - Seimas.v2 — Python backend with FastAPI, ingestion scripts, data processing
  - dashboard — web prototype frontend using React/Vite
  - archive — archived `.openplanter` prompts, tools, and wiki artifacts
  - AGENTS.md — agent role definitions
  - memory-bank.md — voter-centered content guidelines
- Completed cleanup milestones:
  - V3 artifacts archived
  - desktop/Tauri app code removed
  - prototype/demo UI trimmed
  - data ingestion scripts consolidated into pipeline
  - voter-first documentation drafted

#### Desired Outcome
Create a plan that explains:
- what OpenSeimas V.4 should become,
- why it matters to average Lithuanian voters,
- how the engineering and product teams should execute the migration,
- what success looks like,
- what risks exist and how to mitigate them.

The plan must be:
- structured,
- professional,
- rich in detail,
- explicitly actionable,
- written in clear English,
- sympathetic to the user experience of a typical Lithuanian voter.

---

### Required Output Format

Produce a Markdown document with clear headings and bullet sections. Use the following structure exactly, expanding each item with substantial detail.

1. **Executive Summary**
   - One precise mission statement.
   - One paragraph describing the V.4 vision.
   - One paragraph explaining why this matters for ordinary Lithuanian voters.

2. **Current State**
   - A concise audit of the repository and project status.
   - Mention what has already been completed, including:
     - V3 archive and tag
     - removal of desktop app and large binaries
     - cleanup of prototype UI
     - consolidation of scripts into pipeline
     - creation of AGENTS.md and memory-bank.md
   - Identify at least three existing strengths and two remaining gaps.

3. **Problem Statement**
   - Define precisely what problem V.4 must solve:
     - “Make voting choices understandable, relevant, and personally meaningful.”
   - Explain the user need:
     - average Lithuanian voter needs clarity, trust, and actionability.
   - State the product challenge in one sentence.

4. **Strategic Objectives**
   - Provide 5–8 numbered objectives.
   - Each objective should be a short, precise business-level goal.
   - Include one or more voter-centered objectives, such as:
     - “Help voters understand what each bill means for their daily life.”
     - “Reduce uncertainty by presenting clear rationale and confidence levels.”
     - “Preserve non-partisan trust through transparent evidence.”

5. **Proposed Solution Architecture**
   - Give a professional architecture summary.
   - Identify these core layers:
     - Data ingestion and normalization
     - API / service layer
     - Voter recommendation engine
     - Explainability and provenance layer
     - Frontend experience
     - Feedback and metrics layer
   - Map these layers to repository locations:
     - pipeline
     - main.py
     - cli.py
     - dashboard
   - Describe how the system should flow from raw parliamentary data to the voter-facing recommendation.

6. **Phased Roadmap**
   - Provide at least 6 detailed phases.
   - For each phase include:
     - scope
     - deliverables
     - estimated duration
     - explicit success criteria
   - Suggested phase breakdown (expand each to at least 4–6 sentences):
     - Phase 1: Archive, cleanup, and architectural stabilization
     - Phase 2: Pipeline hardening and data model design
     - Phase 3: VoterGuideAgent MVP
     - Phase 4: Explainability, provenance, and safety
     - Phase 5: Frontend MVP and mobile usability
     - Phase 6: Metrics, historical calibration, and beta launch
   - Add a short “Phase 7” as optional post-beta iteration if possible.

7. **Detailed Feature Set**
   - List concrete product features with description and rationale.
   - Include:
     - Recommendation cards with headline + 3 bullet reasons
     - Compact explanation in Lithuanian
     - Explicit confidence/uncertainty bar
     - Source links and provenance markers
     - Lightweight preference onboarding without invasive tracking
     - Feedback capture and trust survey
     - Accessibility-first design and mobile-first layout
     - Non-partisan reading mode and “why this matters to you” section
   - For each feature, note the immediate voter benefit.

8. **Agent Roles and Responsibilities**
   - Define the following agents in detail:
     - `VoterGuideAgent`
     - `PersonalizationAgent`
     - `ExplainabilityAgent`
     - `SafetyAgent`
     - `PipelineAgent`
   - For each agent, describe:
     - Purpose
     - Inputs
     - Outputs
     - How it supports voter understanding and confidence
   - Mention how these agents can be implemented in code and in the UX.

9. **Implementation Details**
   - Provide technical guidance and implementation notes.
   - Include:
     - Python package structure and import patterns
     - CLI runner for pipeline jobs
     - API contract examples for recommendation endpoints
     - Data normalization and ingest cadence
     - Suggested frontend architecture for Reac/Vite
     - How to reuse existing repo artifacts effectively
   - Mention the value of common.py and cli.py.
   - Recommend a minimal set of libraries or tools if needed (FastAPI, Pydantic, React, Vite, etc.), but do not require proprietary services.

10. **Success Metrics**
    - Provide at least 6 measurable metrics.
    - Define each clearly:
      - comprehension
      - trust
      - action
      - feedback
      - data freshness
      - provenance coverage
    - Provide a small table or bullet list with metric name, definition, and target behavior.

11. **Risks and Mitigation**
    - List 4–5 risk items.
    - For each risk, include:
      - why it matters
      - a concrete mitigation strategy
    - Example risks:
      - perceived bias
      - uncertain recommendations
      - stale or incomplete data
      - low user trust or adoption
      - engineering scope creep

12. **Governance and Next Steps**
    - Recommend immediate organizational decisions.
    - Include:
      - approving the agent-based architecture
      - selecting MVP scope
      - assigning backend/frontend owners
      - scheduling review checkpoints
    - Suggest at least three concrete next deliverables:
      - `Seimas.v2/agents/voter_guide.py` prototype
      - V4-build-plan-draft.md refinements
      - CI ingest workflow + release checklist

13. **Attribution**
    - End with a statement:
      - “This plan was created by an AI assistant.”

---

### Detailed Style and Tone Requirements

The generated plan must be:
- Written in a professional, polished tone
- Structured with headings, subheadings, bullet lists, and numbered sections
- Explicit and precise; avoid vague adjectives
- Focused on execution rather than theory
- Optimized for decision-making and implementation
- Clear about the voter benefit in every major section
- Weighted toward product clarity and civic trust

Avoid:
- overly generic “help voters” statements without specifics
- undifferentiated marketing language
- deep technical jargon without short explanation
- anything that sounds like a speculative research document

---

### Expanded Guidance for the Output

To make this prompt more useful, also include:
- one short “repository fit” paragraph describing why the current `OpenSeimas` repo is suitable for this transition
- one short “user empathy” paragraph describing a daily Lithuanian voter profile and how V.4 should speak to them
- at least one explicit mention of “Lithuanian language UX” in the context of user trust and accessibility
- one explicit note that the system must keep recommendations non-partisan and explainable
- one explicit note that the experience should make voters feel their vote is important and relevant

---

### Example Opening Paragraph

Use this exact style when beginning the plan:

```
## OpenSeimas V.4 Build Plan

This plan was created by an AI assistant to guide the migration of OpenSeimas toward a voter-first civic observatory. The objective is to help everyday Lithuanian voters understand what each vote means, feel that their choice is important, and make decisions with transparent, non-partisan guidance.
```

---

### Additional Output Guidelines

- Do not exceed 1,200 words.
- Aim for 900–1,100 words if possible.
- Keep paragraphs brief and easy to scan.
- Use Markdown headings (`##`, `###`) and bullet lists.
- Include at least one short table or section with a metric definition list.
- Explicitly mention cli.py, AGENTS.md, and memory-bank.md as current repo assets.
- Do not write code; write a strategy and execution plan.

---

### Final Note

Use this prompt to generate a plan that is richer, longer, and more professional than the earlier version. The AI should produce a detailed migration roadmap with explicit product, engineering, and civic-user guidance, not just a high-level sketch.

By Gemini 3.5 Flash-Lite