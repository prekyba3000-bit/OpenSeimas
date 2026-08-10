# OpenSeimas V.4 — Synthesis (Kimi)

*Collides the "Observatory" strategy (approved cleanup direction) with the voter-guidance pivot (stakeholder final plan + 7 external AI drafts), and harvests the best ideas from all of them.*

---

## 0. What the 7 external drafts actually are

They look like independent validation. **They aren't.** `V4-build-plan-gemini-3.5-flash-lite-prompt.md` is the prompt template, and every other draft (ChatGPT, Gemini, Grok, Manus, the two "final" variants) was generated from it or from a sibling of it. That's why they all prescribe the same five agents, the same recommendation cards, the same ~17-week roadmap. Convergence here is manufactured by the prompt, not discovered by the models. Treat them as **one plan reviewed seven times**, not seven plans.

The genuinely useful signal in them: the stakeholder's own `V4-build-plan-final.md` confirms **voter guidance is the intended product identity**. And the seven reviews independently surface the same risks (see §4) — those are real.

## 1. The collision: one platform, two altitudes

Observatory and voter guidance are not competing products. They are the same platform at two zoom levels:

- **Observatory looks at the powerful** — attendance, votes, money, networks. Credibility, journalists, NGOs.
- **Voter guidance looks at your own life** — "what does this bill mean for me." Reach, everyday relevance, virality.

The accountability data is exactly the evidence the guidance needs. An MP profile *is* a voter-guidance artifact; a "why this matters" card *is* an accountability artifact. Splitting them would starve both.

**Product shape:** one site, two modes on the same content —

- **"Faktai" (Facts)** — the Observatory mode. MP profiles, ideology galaxy, money web, vote records. No recommendations, ever. This is also the answer to the partisanship risk: facts mode is the default and the safe harbor.
- **"Tau" (For You)** — the guidance layer on top of the same facts. Lightweight onboarding (3–5 life priorities, localStorage only), then cards: headline, 3 evidence bullets, confidence bar, source links, "why this matters to you."

The external drafts' "non-partisan reading mode" and my Observatory mode are literally the same feature — the collision resolves itself.

## 2. Ideas worth stealing (ranked)

1. **"Why this matters to you"** — the killer hook. Maps bills to housing/income/health/education. This is the whole product in five words.
2. **Facts/Guidance toggle** (their "non-partisan reading mode") — same content, two framings. Elegant legal and trust hedge.
3. **Confidence bar — but computed, not self-reported.** Derive it from data completeness (votes counted, sources linked, recency), never from an LLM's own certainty claim. LLM self-reported confidence is noise; data-completeness confidence is measurable.
4. **Provenance markers — with a hard rule that makes 100% achievable.** Every external draft demands 100% provenance and every reviewer notes it's impossible for LLM-generated text. Resolution: **cards are generated deterministically from DB facts** (attendance %, vote choice, declared interests, contract counts). The LLM only *rewrites* the card into plain Lithuanian and is contractually forbidden from adding claims — every sentence must trace to a DB row with a source URL. Provenance stays honest because generation never invents.
5. **Historical comparison** (Grok's unique idea) — "a similar bill in 2019 was rejected; these MPs flipped." Cheap to compute, high context value.
6. **Freshness indicators** (entanglement doc) — "data as of <date>" on every surface. One timestamp field, huge trust payoff.
7. **Comprehension & trust as North Star metrics** — not engagement. Right for civic tech; measure with a one-tap feedback widget ("Was this clear? ✓/✗"), not a research program.

## 3. Ideas to reject (and why)

- **The five-agent architecture (`VoterGuideAgent`, `SafetyAgent`, …).** We deleted OpenPlanter last week for being an agent runtime; rebuilding five "agents" as typed Python services is the same disease in a suit. They are **functions**: `generate_card()`, `match_priorities()`, `lint_partisanship()`. No agent framework, no orchestration layer, no taxonomy. If an "agent" is a prompt and a parser, call it what it is.
- **LLM-as-safety-judge.** An LLM policing another LLM's neutrality is two biases, not zero. Replace with: deterministic generation (§2.4) + a partisanship lint (loaded-word list, Lithuanian political vocabulary) + a human review queue for flagged cards.
- **"100% provenance coverage" as stated.** Only achievable via the deterministic-generation rule above; as an LLM-text metric it's a fantasy.
- **SQLite "for prototyping"** (Grok, Manus) — a regression. PostgreSQL stays; it's the moat.
- **14–20 week roadmaps.** Written by models that don't ship. The MVP below is 4–6 weeks of focused work with me.
- **Publishing system prompts** (Gemini) — invites prompt-injection gaming by political actors. Publish *methodology*, not prompts.
- **LLM gateway assumption** — no model/budget specified in any draft. MVP uses the cheapest path: batch rewrite jobs via your existing HF Router config, cached, not per-request.

## 4. The risks all seven reviews agreed on (take seriously)

- **Legal/partisanship exposure.** "What to vote for" near an election in Lithuania can be read as campaigning. Mitigations: Facts mode is default; guidance is framed as "information matched to your stated priorities," never "vote for X"; get a legal read before any public launch near an election window; keep the "heroes/villains" vocabulary buried forever.
- **Hallucinated repo facts in every draft** (phantom `memory-bank.md`, `dashboard/` at root, "cleanup complete" when it wasn't). Any plan executed from these drafts must be re-grounded in the actual repo — which this synthesis is.
- **Data quality is the silent killer.** Guidance built on stale/faction-unreliable data is worse than no guidance. Phase 0 exists for this reason.

## 5. The MVP cut — "V.4 Tau" (4–6 weeks, solo + Kimi)

- **Week 0 — Ground truth (2–3 days).** Fix `ComparisonView.tsx` tsc errors; make ingest idempotent with `last_synced_at` freshness surfaced in the API; tag votes/bills with ~8 life-topic categories (housing, income, health, education, transport, security, environment, governance) — deterministic keyword rules first, LLM-assisted classification second, human spot-check.
- **Weeks 1–2 — Deterministic card engine.** `cards` table + generator: for each topic-tagged bill/vote → headline, ≤3 DB-sourced bullets, source URLs, computed confidence (data completeness), freshness timestamp. No LLM anywhere yet. API: `GET /api/cards`, `GET /api/bills/{id}`.
- **Weeks 2–3 — "Tau" frontend.** New V.4 shell (Observatory design language: dark, editorial, LT-first, mobile-first), onboarding (3–5 priorities, localStorage), card feed ranked by priority match, Facts/Guidance toggle.
- **Weeks 3–4 — Plain-Lithuanian rewrite layer.** Batch LLM job rewrites cards to A2-level Lithuanian under the citation-lock rule (§2.4); partisanship lint + review queue; one-tap clarity feedback.
- **Weeks 4–6 — Credibility anchor + beta.** Port ONE Observatory surface into the new shell — the MP profile (attendance, votes, money) — because it's the evidence base users will click through to from cards. Closed beta with ~20 humans; measure clarity ✓/✗ and trust.
- **Later phases (post-MVP):** ideology galaxy, money web, historical comparison, shareable fact cards (re-skinned renderer), wiki regeneration via the `seimas-mp-wikis` skill.

## 6. What this means for the repo

- `Seimas.v2/` keeps backend + pipeline; add `cards` generation as a plain Python module (no `agents/` directory).
- New V.4 frontend eventually replaces `dashboard/`; until then the deployed V.3 dashboard stays live (hero engine retired at cutover, as already planned).
- `AGENTS.md` (the voter-guide draft at repo root) should be rewritten as actual repo guidance; its product content is absorbed into this document.
- The 7 external drafts stay in `docs/` as reference; this synthesis supersedes them as the working plan.

---

*Author: Kimi Code, after executing the V.4 cleanup and reviewing all drafts. Non-partisan, evidence-first, deterministic-before-generative.*
