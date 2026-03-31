# OpenSeimas BMAD Workflow

> Last Updated: 2026-03-31
> 
> Scope: execution control for BMAD integration phases in OpenSeimas.

## Phase Status

- [x] Phase 1: Workflow resumption and context finalization
- [x] Phase 2: API contract hardening + server-side search
- [x] Phase 3: Error boundary and exception consistency
- [~] Phase 4: App-wide consistency + ALIVE maintenance protocols

## Phase 1 Outputs

- `_bmad/full-scan-workflow.md` created with localized BMAD scan parameters.
- `docs/project-context.md` finalized with:
  - mandatory implementation rules
  - data-health risk map
  - contract-hardening priorities

## Full-Scan Execution Parameters (Extracted)

- `workflow_mode`: `full_rescan`
- `scan_level`: `deep`
- `resume_mode`: `false`
- `autonomous`: `false`
- required config keys: `project_knowledge`, `user_name`, `communication_language`, `document_output_language`, `date`

Execution source of truth:

- `_bmad/full-scan-workflow.md`
- BMAD `full-scan-instructions.md` (step flow 0.5 -> 12)

## Phase 2 Gate (Next)

Do not start search feature implementation until API contract hardening is in place for all `/api/v2/heroes/*` endpoints:

1. Introduce Pydantic response models.
2. Bind endpoint `response_model` to these contracts.
3. Synchronize frontend type/runtime validation at API boundary.
4. Add at least 10 edge/failure tests covering schema drift and malformed payload handling.

## Phase 2 Progress (Current Session)

- Completed:
  - Pydantic response models bound to `/api/v2/heroes/leaderboard` and `/api/v2/heroes/{mp_id}`.
  - Added `/api/v2/heroes/search` with parameterized SQL, rate-limit checks, and deterministic input constraints.
  - Added 11 backend contract/search tests in `tests/test_heroes_v2_contracts.py` (all passing).
  - Frontend migrated to shared hero contract types in `dashboard/src/services/api.ts`.
  - `LeaderboardView` and `MpProfileView` migrated from raw `fetch` to centralized `api` client.
  - `MpsListView` now uses debounced server-side search via `api.searchHeroes`.
  - Added frontend degraded-network handling in API boundary: timeout, retry, exponential backoff.
  - Added runtime contract parsing strategy (Option B) via `zod` in `dashboard/src/services/api.ts`.
  - Added frontend resilience tests in `dashboard/src/services/api.test.ts` (6 tests, all passing).

- Remaining before Phase 2 closure:
  - none.

## Phase 3 Progress (Current Session)

- Completed:
  - Added global FastAPI Problem Details-style handlers for:
    - `HTTPException`
    - `RequestValidationError`
    - generic unhandled exceptions
  - Added backend tests for standardized error payloads in `tests/test_problem_details.py` (3 tests, all passing).
  - Added global React error boundary (`AppErrorBoundary`) in `dashboard/src/components/AppErrorBoundary.tsx`.
  - Wrapped app root and route-level views with error boundaries.
  - Added frontend boundary test in `dashboard/src/components/AppErrorBoundary.test.tsx`.
  - Added centralized Lithuanian dictionary module `dashboard/src/i18n/lt.ts` for shared error copy and vote labels.
  - Added shared RFC-7807 UI presenter `dashboard/src/components/ProblemDetailsNotice.tsx`.
  - Wired API client to parse Problem Details payloads into structured `ApiError.problem`.
  - Added presenter tests in `dashboard/src/components/ProblemDetailsNotice.test.tsx`.

- Remaining before Phase 3 closure:
  - none.

## Phase 4 Progress (Current Session)

- Completed:
  - Added resilient static wiki channel service `dashboard/src/services/wiki.ts` with timeout, retry, and session cache fallback.
  - Added wiki resilience tests in `dashboard/src/services/wiki.test.ts` (4 tests).
  - Updated `WikiPanel` to consume resilient service and surface cached/degraded states consistently.
  - Expanded centralized Lithuanian dictionary in `dashboard/src/i18n/lt.ts`.
  - Migrated additional high-traffic views to dictionary + shared problem presenter:
    - `VotesListView`
    - `VoteDetailView`
    - `ComparisonView`
  - **OpenPlanter UUID identity enforcement (3-layer defense):**
    - **Layer 2 (Enforcement):** Added workspace-configurable `write_policies` to `OpenPlanter/agent/tools.py`. The `uuid_frontmatter` validator blocks `write_file`, `edit_file`, and `apply_patch` writes where the frontmatter `mp_id` does not match the filename UUID. 14 dedicated tests added and passing.
    - **Layer 1 (Preventive):** Hardened `generate_mp_wikis.md` with mandatory YAML frontmatter contract, identity cross-verification step, stale-content discard rule, and post-write validation via `validate_wiki_identity.py`.
    - **Layer 3 (Detective):** Upgraded `validate_wiki_identity.py` with batch session auditing (`--batch`, `--session-start`) and FAIL/WARN/PASS output:
      - `FAIL`: identity mismatches or 100% expected files missing.
      - `WARN`: stale files, partial expected-file gaps, or orphan files.
      - `PASS`: identity + freshness checks clean.
      - Added `tests/test_validate_wiki_identity.py` (4 tests) for batch gate semantics.
    - **Configuration:** Added `write_policies` to `.openplanter/settings.json` targeting `dashboard/public/wikis/*.md`.
  - **Frontend wiki safety layer (Layer 4 — Client-Side):**
    - Added `parseWikiFrontmatter()` and `checkWikiIdentity()` to `dashboard/src/services/wiki.ts`.
    - `WikiPanel` now parses YAML frontmatter from fetched wiki content, cross-checks route UUID against frontmatter `mp_id`, and refuses to render on identity mismatch (critical error state with `ShieldAlert` icon).
    - Stale-data detection: displays amber warning banner when `generated_at` exceeds 6-hour threshold.
    - Backward compatible: wikis without frontmatter render normally.
    - Added 8 new tests in `wiki.test.ts` (3 frontmatter parser + 5 identity check). Total wiki test count: 12.
    - Added Lithuanian strings for identity mismatch and stale banner in `lt.ts`.

- Remaining before Phase 4 closure:
  - Storybook mock synchronization with production contracts (auto-generation or validation gate).
