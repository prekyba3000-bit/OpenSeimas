# OpenSeimas V.4 — Master Plan (canonical)

> **Status:** This document is the **single canonical V.4 plan**. It supersedes all
> draft plans in `docs/V4-build-plan-*.md` (ChatGPT, Gemini, Grok, Manus, Kimi-synthesis,
> "entanglement", draft). Those files should be moved to `docs/archive/v4-drafts/`.
> Changes to this plan happen by pull request that edits this file — never by adding
> another plan document.
>
> History note: V.3 (forensic dashboard + OpenPlanter agent) is frozen in branch
> `archive/v3` and `docs/wiki-archive/`. It is not coming back. This plan does not
> reference it except where archived assets are reused.

**Mission:** Make Lithuanian voting choices understandable, relevant, and personally
meaningful through transparent evidence and explainable, non-partisan civic guidance.

**Target user:** the everyday Lithuanian voter — busy, mobile-first, no parliamentary
procedure knowledge, checking a phone between work and daily responsibilities.

---

## 1. Product definition

OpenSeimas V.4 is **one platform, two modes**:

### Facts mode (default, no onboarding)
Public, anonymous, non-personalized evidence explorer:
- Bill pages: plain-language Lithuanian summary, lifecycle stages, topics, who voted how.
- MP pages: attendance (from *registration* data, not vote proxies), voting record by
  topic, declared interests, sources for every number.
- Vote pages: what was decided, party breakdown, plain-language context.
- **Status page**: per-source data freshness, row counts, known gaps, latency.

### Tau mode (opt-in)
Personalized guidance layered on Facts:
- 3–5 question value onboarding (economy, health, environment, education, civil rights).
- Stored **client-side by default** (localStorage); server persistence only on explicit opt-in.
- Output: recommendation cards — headline + 3 evidence bullets + confidence band +
  source links. Tiers: **Inform / Align / Consider** — never "vote for X".
- A visible "why am I seeing this" trace on every card.

### Non-goals (write them down, defend them)
- Not a political-analyst dashboard (no forensic-arcade complexity in the voter UI).
- Not a profiler: no accounts by default, no cross-session tracking, no ad tech.
- Not an oracle: we never tell anyone how to vote; we show evidence and alignment.
- Not bilingual-first: Lithuanian is the primary language; English only for source quotes.

---

## 2. Non-negotiable principles

1. **Non-partisanship by construction.** Recommendation logic is deterministic and
   inspectable; any LLM use is restricted to *language simplification* with
   source-locked input/output and must pass the Safety check (§7).
2. **Provenance or it doesn't ship.** Every public number, summary, and recommendation
   carries: source URL, fetch timestamp, ingest job id, methodology version.
3. **Honest uncertainty.** Confidence bands on Tau output; low-confidence fallback is
   "we don't know" — never a fabricated answer.
4. **Privacy by default.** Onboarding answers live on the device unless the user opts in.
5. **Fair process.** Public corrections workflow, right-of-reply for MPs, versioned
   methodology with advance notice before any scoring/recommendation change.
6. **Open by default.** Code: AGPL-3.0. Data exports: CC BY 4.0. Public, documented API.

---

## 3. Architecture

```
official sources (lrs.lt XML, TAIS/STAR, VRK, VTEK/SKAIDRIS, VMI, CVP IS, data.gov.lt)
        │
        ▼
┌─────────────────────┐   run id + row counts + status
│ Seimas.v2/pipeline  │ ─────────────────────────────► source_fetches (provenance)
│  (cli.py runner)    │
└─────────┬───────────┘
          ▼ normalized, idempotent
┌──────────────────────────────────────────────────────────┐
│ PostgreSQL domain model (§4)                              │
│  topics + vote_topics (done, mig. 016)                    │
│  trust floor (mig. 017): corrections, methodology_versions│
│  summary_revisions, mp_replies, source_fetches            │
└─────────┬────────────────────────────────────────────────┘
          ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│ FastAPI routers     │─────►│ Facts endpoints (public)      │
│ (backend/)          │      │ Trust endpoints (routes_trust)│
└─────────┬───────────┘      │ Tau endpoints (deterministic) │
          │                  └──────────────────────────────┘
          ▼
┌──────────────────────────────────────────────────────────┐
│ dashboard/ (React+Vite, mobile-first, LT)                 │
│  Facts journey  │  Tau journey  │  Status & corrections   │
└──────────────────────────────────────────────────────────┘
```

**Key architectural decision — Tau v1 is rules, not vibes.** The first Tau engine is a
deterministic function: `alignment(user_priorities, mp/bill topic record) →
{relevance, tier, reasons[3], confidence, evidence_ids[]}`. Inspectable, testable,
reproducible. An LLM may *rephrase* approved content later; it may never *decide* content.

---

## 4. Canonical data model

**Exists today:** `politicians`, `votes`, `mp_votes`, `assets`, `interests`, `speeches`,
`procurement_contracts`, `opensanctions_*`, `topics`/`vote_topics` (mig. 016),
`mp_stats_summary` + `mp_leaderboard_metrics` (materialized).

**Phase 2 adds (data depth):**
- `registrations` — per-sitting presence from `ad_sp_registracijos_rezultatai` XML
  (replaces vote-derived attendance).
- `committees`, `committee_memberships` — from `ad_seimo_komitetai` / `ad_seimo_komisijos`.
- `bills`, `bill_stages` — from TAIS/STAR: stages, dates, committee conclusions,
  submitters, amendment outcomes.

**Trust floor (this kit, mig. 017):** `source_fetches`, `corrections`,
`methodology_versions`, `summary_revisions`, `mp_replies`.

**Tau (Phase 4):** `recommendations` (deterministic engine output, versioned),
`recommendation_feedback` (useful? confusing? why).

**Later (P2, researched, do not start early):** `donors`/`donations` (VRK >€60 lists),
`lobby_contacts` (SKAIDRIS), `mp_travel`, `mp_staff`, municipal council votes.

---

## 5. Phases & exit criteria

### Phase 0 — Ops resurrection (this week; kit provided)
Work items: merge `cleanup/create-pipeline` → `main`; add root `LICENSE` (AGPL-3.0);
hoist CI to root `.github/workflows/` (kit); fix `render.yaml` for the monorepo (kit);
restore/replace the expired free-tier Postgres; nightly DB dumps; uptime monitor on
`/health` + `/api/meta/freshness`; archive the 8 draft plans.
**Exit:** production green for 7 consecutive days; CI gates every PR; a stranger can
`git clone` and run backend + dashboard from README alone.

### Phase 1 — Trust floor (2 weeks; kit provides migration + router + tests)
Apply mig. 017; wire `routes_trust.py`; dashboard: corrections report form + public
corrections log page; methodology page reads from `methodology_versions`; status page
from `/api/meta/freshness`; summary edit-history UI on vote pages.
**Exit:** every public number traceable (source + fetched-at + job id); a submitted
correction appears in the public log within 72h with status.

### Phase 2 — Data depth for bill explanations (2–3 weeks)
`pipeline/ingest_registrations.py` (true attendance); `pipeline/ingest_bills.py`
(TAIS/STAR lifecycle); committees ingest; finish topic tagging → `?topic=` filters on
`/api/votes`, `/api/mps/{id}/votes`, leaderboard; dashboard topic chips.
**Exit:** bill page shows stages + topics + outcome; attendance metrics computed from
registrations and labeled "registracijos duomenys"; every list filterable by topic.

### Phase 3 — Facts mode MVP (2–3 weeks)
Mobile-first rebuild of three journeys only: bill card, MP page, vote page. Plain-LT
summaries (human-written or LLM-simplified-then-approved) stored with full
`summary_revisions` history; prose-free navigation (topic-first); accessibility pass
(WCAG 2.2 AA); kill remaining legacy views not serving these journeys.
**Exit:** 5-person hallway test — each finds "how did my MP vote on X and why should I
care" in <90 seconds without instruction.

### Phase 4 — Tau engine MVP (2–3 weeks)
Deterministic alignment engine over topics + vote record; 5-question onboarding
(client-side); recommendation cards (headline, 3 reasons with evidence links, confidence
band); `SafetyAgent` as **code**: forbidden-framing list, provenance-presence check,
confidence caps, LT partisan-term screen; golden-set regression tests (fixed inputs →
fixed outputs).
**Exit:** golden set reproducible; independent audit of 50 sampled cards finds zero
unsupported claims; a civic reviewer signs off on neutrality.

### Phase 5 — Engagement & openness (2–3 weeks)
Email alerts (per-MP, per-topic) + weekly digest (double opt-in); embeddable card
endpoints (iframe) for media; public API docs page; bulk export (CC BY 4.0) with
Popolo-aligned shapes; Wikidata QIDs on MPs; corrections SLA metrics public.
**Exit:** 100 alert subscribers; ≥1 external site embedding a card; ≥1 external
developer consuming the API.

### Phase 6 — Calibration & beta (2–3 weeks)
Historical replay (run Tau against past terms, inspect stability); trust/comprehension
survey instrument; external civic review; beta launch; election-readiness backlog for
the 2028 cycle (candidate comparison, promise tracking).
**Exit:** agreed quality thresholds met; release procedure repeatable by one person.

---

## 6. Data sources (verified; LT-specific)

| Source | What | Status |
|---|---|---|
| `apps.lrs.lt/sip/p2b.ad_sp_registracijos_rezultatai` | per-sitting registration (attendance) | Phase 2 |
| `apps.lrs.lt/sip/p2b.ad_seimo_komitetai` (+komisijos, kk_posėdžiai) | committees | Phase 2 |
| TAIS (`e-seimas.lrs.lt`) + STAR subsystem | bill lifecycle, stages, conclusions | Phase 2 |
| `apps.lrs.lt/sip/p2b.ad_sn_inicijuoti_ta_projektai` / `..._pasiulymai_ta_projektams` | MP bills & amendments | Phase 2 |
| VRK donor lists & finance reports (vrk.lt) | campaign money | P2 |
| SKAIDRIS (`skaidris.vtek.lt/public`) | lobbyists, declarations, "patirta įtaka" | P2 |
| VMI declaration extracts (~45k/yr) | asset growth | P2 |
| `ad_sn_padejejai_sekretoriai`, `ad_sn_komandiruotes` | staff & travel | P2 |
| data.gov.lt municipal council votes | local expansion | later |
| **Known gap:** parliamentary questions/interpellations are **not** in the XML feeds — document on the status page. | | |

---

## 7. Trust & legal framework (the moat)

- **Corrections:** report button on every MP/vote/bill page; 72h first-response SLA;
  public log (reporter identity never shown).
- **Right of reply:** MPs may publish a response displayed next to the contested content
  (`mp_replies`, identity verified by maintainer).
- **Methodology versioning:** every metric carries `methodology_versions.version`;
  changes are announced ≥14 days in advance (`announced_at`) with the old version
  archived — modeled on Abgeordnetenwatch's ranking protocol.
- **Edit history:** every plain-language summary keeps full `summary_revisions`
  history, public — modeled on TheyVoteForYou's division edit history (the mechanism
  that defended them in a 2022 MP legal threat).
- **Fair metrics:** excused absences (sickness, parental leave, ministerial duty)
  excluded/annotated in attendance; procedural votes labeled separately.
- **Tau-specific:** pre-election periods trigger heightened review — frozen methodology,
  external neutrality audit, VRK communication check.
- **Legal posture (LT):** publish only what traces to official sources + published
  methodology; opinion framing ("hero/villain"-style labels) stays out of V.4 voter UI.

## 8. Metrics that matter (and one that doesn't)

- **Comprehension:** hallway-test task success; "did this help you understand?" survey.
- **Trust:** correction turnaround; % content with complete provenance; survey trust score.
- **Freshness:** per-source latency p50/p95 on the status page.
- **Reach:** alert subscribers, embeds, API consumers.
- **Explicitly not optimized:** raw engagement/time-on-site.

## 9. Risk register

| Risk | Mitigation |
|---|---|
| Planning paralysis returns (8 drafts happened once) | This file is canonical; changes via PR only; every commit references a phase |
| Single-maintainer bus factor | Open license, contributor guide, deterministic pipeline, docs-first culture |
| Free-tier infra decay (already bit once) | Nightly dumps, uptime alerts, IaC (`render.yaml`) in repo, Phase-0 exit gate |
| Legal/political challenge to Tau | §7 framework; deterministic engine; advance-notice protocol; reply channel |
| LLM hallucination | LLM never decides content; source-locked rephrasing only; Safety checks in code |
| Official feed gaps (interpellations etc.) | Status page documents gaps; never imply completeness we don't have |

## 10. How this plan is amended

PR editing this file + a line in `docs/memory-bank.md`. No new `V4-build-plan-*.md`
files. AI assistants working in this repo must read this file first and propose changes
to it rather than drafting parallel plans.

---

*Research evidence base (LT sources + international practice) lives in the companion
documents produced 2026-08-10; key inspirations: TheyWorkForYou (alerts, plain-language
summaries), TheyVoteForYou (edit history), Abgeordnetenwatch (advance-notice rankings,
right-of-reply), Parlameter (embeddable cards), GovTrack (cohort-normalized scores),
Yle Vaalikone (value-matching UX), Declaration on Parliamentary Openness, IPU
Transparent Parliament indicators.*
