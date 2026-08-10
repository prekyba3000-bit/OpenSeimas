# Memory Bank — Voter Guidance (draft)

Target user
- Everyday Lithuanian voter: busy, mobile-first, values practical guidance and clear justifications.

Core heuristics to store in the memory bank
- Value mapping template: a 5-question short survey (economy, health, environment, education, civil rights).
- Recommendation template: headline + 3 bullets (impact, who benefits, tradeoffs) + source link.
- Neutral tone checklist: avoid persuasive adjectives; include alternative viewpoints.

Content sources
- Parliamentary bills and summaries (Seimas feeds)
- Official vote records (Seimas.v2 `ingest_votes_v2` outputs)
- Party platforms and public statements (time-stamped)

Operational notes
- Update cadence: daily ingest for votes and bills; weekly refresh for party positions.
- Provenance: tag every fact with source URL, fetch date, and ingest job id.
- Personalization: store only local preferences (client-side cookie or localStorage) unless user explicitly opts in to server-side persistence.

Examples (short)
- "Bill X reduces municipal funding for Y": headline; bullets: estimated impact, who benefits, uncertainty level; source: link.

Open questions
- How to translate confidence into clear UX avoiding paralysis by uncertainty?
- What minimum onboarding is acceptable before making a recommendation?

Action items
- Export `.openplanter/prompts` into structured prompt templates mapped to `VoterGuideAgent` actions.
- Create a small audit notebook that replays recommendations from past votes to measure alignment.
