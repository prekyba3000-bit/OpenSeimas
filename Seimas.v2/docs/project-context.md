# OpenSeimas Project Context (BMAD Optimized)

> Project: OpenSeimas / Skaidrus Seimas
> 
> Type: Brownfield full-stack civic transparency platform
> 
> Last Updated: 2026-03-31

## Mission

OpenSeimas is a Lithuanian parliament transparency platform that ingests official parliamentary data, computes explainable forensic/hero scoring, and exposes this data through a FastAPI backend and React SPA.

The active architectural objective is BMAD-aligned hardening: make contracts explicit, make failures deterministic, and keep the system upgradeable by future agents with minimal ambiguity.

## Active Stack and Constraints

### Frontend (SPA)

- React 19
- Vite 6
- Tailwind CSS v4
- Radix UI
- Hash-based routing (`/#/...`) for static hosting compatibility

### Backend (API)

- FastAPI with asynchronous endpoint handlers for non-blocking I/O paths
- Python ingestion/analysis pipelines for parliamentary data

### Database

- PostgreSQL
- Python DB access via psycopg2 patterns in backend and pipeline scripts
- TypeScript ecosystem includes Drizzle ORM for schema-aware client-side tooling

## BMAD Non-Negotiable Implementation Rules

### Rule 1: Database Connection Management (Backend)

All Python database operations must use:

`with get_db_conn() as conn:`

Rationale: deterministic lifecycle, no connection leaks, safe rollback semantics on failure.

### Rule 2: PostgreSQL Type Casting

All raw PostgreSQL UUID comparisons must explicitly cast:

`WHERE id = %s::uuid`

Rationale: prevent type mismatch drift and preserve planner stability.

### Rule 3: Frontend Routing Architecture

Frontend navigation must remain hash-based:

- `/#/dashboard`
- `/#/mps/:id`
- `/#/votes/:id`

Rationale: deep-link reliability in static hosting.

### Rule 4: Strict Localization

Hardcoded user-facing strings are forbidden. UI copy and vote-choice labels must come from the Lithuanian dictionary source of truth, including:

- `Už`
- `Prieš`
- `Susilaikė`
- `Nedalyvavo`

Rationale: consistency, translation control, and domain correctness.

## Data Health Status and Contract Risks

Current system health is workable for alpha but not contract-hardened.

### Strengths

- Hero/forensic pipeline handles missing tables/columns and bad dates defensively.
- API error handling already distinguishes several operational classes (e.g., unknown MP vs backend failure).
- Frontend has a centralized API client for core v1 flows.

### Critical Risks

- Two sources of truth: Python dict responses vs assumed TypeScript interfaces.
- `/api/v2/heroes/*` payloads are currently shaped ad hoc; OpenAPI/schema fidelity can drift.
- Frontend v2 heroes views still contain raw `fetch` usage and local interfaces.
- Storybook/mock payloads can drift from production contracts.

## Required Data-Health Upgrades (Priority)

### 1) Pydantic Response Models for `/api/v2/heroes/*`

Define explicit response models for:

- `/api/v2/heroes/leaderboard`
- `/api/v2/heroes/{mp_id}`
- `/api/v2/heroes/{mp_id}/share-card`

All endpoints must return these models directly to guarantee schema validation and OpenAPI accuracy.

### 2) Frontend Contract Synchronization

Adopt one boundary strategy and enforce it consistently:

- Generate TypeScript types from OpenAPI, or
- Hand-sync type modules with strict review gates, or
- Add runtime validation (`zod`/`io-ts`) on every v2 heroes response before UI consumption

Preferred near-term path: runtime validation at API boundary plus gradual migration to generated types.

Implementation status (current):

- Runtime validation strategy is active for v2 heroes payloads using `zod` in `dashboard/src/services/api.ts`.
- Degraded-network handling is active in the same boundary (`timeout`, retries, exponential backoff).

### 3) Fetch Path Unification

Converge raw v2 `fetch` calls onto `dashboard/src/services/api.ts` (or a dedicated typed `heroApi` service) to centralize:

- retries
- error normalization
- telemetry hooks
- contract validation

### 4) Static Wiki Data Channel Hardening

`WikiPanel` remains a separate static channel (`/wikis/*.md`) and therefore must follow explicit resilience policy:

- request timeout + bounded retries
- safe fallback to cached markdown when network/static host is degraded
- deterministic empty-state handling for 404/missing wiki
- consistent localized error presentation via shared problem presenter

### 5) OpenPlanter Write Policy — UUID Identity Enforcement

Wiki generation is agent-driven (`generate_mp_wikis.md`). A three-layer defense prevents the identity-confusion bug where one MP's wiki content was written to another MP's UUID-keyed file (March 27 incident: Roma Janušonienė's `67835f9f-...md` contained Simonas Gentvilas's data):

- **Layer 1 (Preventive):** Prompt contract requires YAML frontmatter with `mp_id` matching the filename UUID, plus a mandatory identity cross-verification step before write.
- **Layer 2 (Enforcement):** `write_file`, `edit_file`, and `apply_patch` in OpenPlanter's `tools.py` check workspace-configured `write_policies`. For paths matching `dashboard/public/wikis/*.md`, the `uuid_frontmatter` validator blocks writes where the frontmatter `mp_id` does not match the filename UUID.
- **Layer 3 (Detective):** `validate_wiki_identity.py` tool (`.openplanter/tools/`) supports both per-file checks and batch session audit (`--batch`) with gate semantics:
  - `FAIL` for identity mismatches and the empty-success edge case (100% expected files missing),
  - `WARN` for stale content, partial missing expected files, and orphan files,
  - `PASS` for clean session output.

Configuration lives in `.openplanter/settings.json` under the `write_policies` key.

## Deterministic Robustness Standard

All critical features must include edge-case coverage before completion. Baseline expectation: no fewer than 10 distinct cases across:

- empty and malformed inputs
- schema drift
- stale/missing data
- high-latency or timeout behavior
- DB unavailable or partial schema scenarios
- frontend runtime parse failures

## Documentation-as-Code Requirements

When implementing contract or behavior changes, update in the same change set:

- `docs/project-context.md` (this file)
- `docs/workflow.md` (execution/status and BMAD phase checkpoints)
- inline backend docstrings and frontend JSDoc where contract semantics are non-obvious

## Immediate Execution Focus (Resumed)

Phase 1 completion criteria:

1. Full scan workflow parameters are localized in `_bmad/full-scan-workflow.md`.
2. This `project-context.md` explicitly encodes mandatory rules and data-health recommendations.

Phase 2 entry criteria:

1. Implement Pydantic response contracts for all `/api/v2/heroes/*`.
2. Synchronize frontend contract consumption with generated/static/runtime validation guardrails.
