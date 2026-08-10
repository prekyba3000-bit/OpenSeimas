# AGENTS.md

Purpose: map agent roles and responsibilities for OpenSeimas v4 focused on voter guidance.

Principles
- Non-partisan, transparent, evidence-backed recommendations.
- Prioritize clarity, actionability, and respect for users' autonomy.
- Privacy-by-default: avoid storing personal identifiers; prefer client-side personalization.

Agent roles

- VoterGuideAgent
  - Goal: Help everyday Lithuanian decide what to vote for by explaining options, consequences, and match to personal values.
  - Inputs: user-stated priorities, public bill metadata, vote records, party positions, plain-language summaries.
  - Outputs: concise recommendation tiers (Inform, Align, Consider), explanation why, sources, suggested next step (vote, read, discuss).
  - UX: short headline, 2–3 bullet reasons, one-sentence explanation in Lithuanian, link to sources.

- PersonalizationAgent
  - Goal: Map user values to policy stances with lightweight onboarding (3–5 questions) and prefer on-device storage.
  - Behavior: show confidence score and explain which priorities influenced the suggestion.

- ExplainabilityAgent
  - Goal: Provide transparent trace of the data and reasoning behind any recommendation; include provenance for each claim.

- DataIngestAgent
  - Goal: Keep policy, bill, voting, and candidate data fresh and auditable. Produce normalized artifacts for the pipeline.

- SafetyAgent
  - Goal: Detect partisan language, misinformation, and privacy leaks; enforce non-partisanship heuristics.

- PipelineAgent
  - Goal: Orchestrate ingestion, normalization, and feeding the VoterGuideAgent; expose CLI hooks for audits.

Design & UX constraints
- Language: primary content in Lithuanian; fallback in English for source texts.
- Keep snippets skimmable: headline, 3 bullets, one-line evidence, CTA.
- Show uncertainty: use confidence bands and invite user feedback.
- Accessibility: large text, high contrast, and screen-reader friendly content.

Metrics (early)
- Comprehension: percentage of users who can summarize the recommendation in their own words.
- Action: clicks on CTA, share/bookmark rate.
- Trust: voluntary feedback rating and repeat usage.

Privacy & Ethics
- No targeted persuasion. Suggestions must be framed as informational and optional.
- Log minimal telemetry; prefer aggregated anonymized metrics.

Next steps
- Map existing `.openplanter` prompts to the agents above and record them in `docs/memory-bank.md`.
- Implement `VoterGuideAgent` prototype using `Seimas.v2/pipeline` artifacts and the `cli` entrypoint.
