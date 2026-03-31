# ADR 0002: Shared TypeScript contracts

## Status

Accepted

## Context

[`Seimas.v2/dashboard/src/services/api.ts`](../../Seimas.v2/dashboard/src/services/api.ts) defines large response interfaces inline next to Zod parsers and fetch logic. OpenPlanter and future clients need the same shapes without duplicating strings.

## Decision

- **Short term (pilot):** Move **JSON-shaped DTO interfaces** that are not intrinsically tied to Zod into [`@open-seimas/contracts`](../../packages/open-seimas-contracts). The dashboard **re-exports** those types from `api.ts` so existing `import { MpSummary } from '../services/api'` call sites keep working.
- **Source of truth long term:** **FastAPI / OpenAPI** should generate or validate types; until codegen is wired, **Zod schemas in the dashboard** remain the runtime validation layer. Types in `@open-seimas/contracts` must stay aligned manually (TypeScript will surface drift at compile time when imports converge).
- **Migration order:** (1) Add package + pilot types, (2) expand package for more DTOs, (3) optionally move Zod + parsers into the package or generate from OpenAPI, (4) consume from OpenPlanter.

## Pilot slice (implemented)

`DashboardStats`, `ActivityItem`, `MpSummary`, `MpDetail`, `MpVoteRecord`, `VoteSummary` live in `@open-seimas/contracts`.

## Out of scope for now

- `MpProfile`, `ForensicBreakdown`, Zod `mpProfileSchema`, and other heavy civic types stay in `api.ts` until a second migration tranche.

## Consequences

- No runtime behavior change; types are structural only.
- Duplicate definition risk is reduced for shared DTOs; remaining types still need periodic sync with the backend.
