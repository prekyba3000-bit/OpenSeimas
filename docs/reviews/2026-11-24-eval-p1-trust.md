# Evaluation P1 — trust publication and submission bounds

2026-11-24. P1 fixes following the whole-repository evaluation
(`.evaluation/20261118-235807/REPORT.md`). Branch `fix/eval-stage1`.

## What changed

- **CORA-07 — only approved summaries are public history.** The public history
  query requires `approved_at IS NOT NULL`; the empty state says that no
  approved revisions exist rather than that the summary was never edited.
  Reposting an identical revision returns the existing row, reapproval leaves
  its original timestamp and approver unchanged, and `publish_summaries.py`
  retries entities that have drafts but no approved revision.
- **SECF-01 — rejected submission text is not republished.** The public API
  returns `description: NULL` for rejected corrections while retaining the
  status and reviewer decision. Accepted and resolved entries keep their
  descriptions. The new terminal `withheld` status is never public and lets a
  maintainer close abusive or private submissions without leaving them open.
- **SECA-02 — anonymous writes have database-enforced bounds.** Each insert
  holds a transaction-scoped Postgres advisory lock while checking and writing.
  At most 20 open submissions are accepted in 10 minutes and 100 open
  submissions overall; exhaustion returns 429. These limits do not depend on
  caller-supplied IP headers. The per-IP limiter remains best-effort.
- The corrections page, hub panel and TypeScript contract handle null
  descriptions, display reviewer decisions and use Lithuanian status labels.
  The old claim that every note is public has been corrected.
- Migration 056 adds the `withheld` status and two public corrections:
  `summary-drafts-public-history` and
  `anonymous-correction-text-republished`.

## Verification

- Fresh Postgres 18, bootstrap plus migrations 002–056, then a second migration
  run: **56 applied**, followed by **0 applied, 56 already up-to-date**.
- `DB_DSN=<fresh container> PYTHONPATH=. .venv/bin/python -m pytest tests -o addopts='' -q`
  → **521 passed in 5.73s**. Real-Postgres tests cover rejected/withheld
  privacy, admin withholding, spoofed-IP burst rejection, old-row backlog
  rejection and two simultaneous requests at the limit returning `[201, 429]`.
  Summary tests cover approved-only history and idempotent posting/approval.
- `npm run dashboard:typecheck` → exit 0.
- `npm run dashboard:test` → **64 test files passed; 521 tests passed**.
- `npm run dashboard:build` → Vite built 2,434 modules successfully.
- `node .evaluation/20261118-235807/p1-trust-browser.mjs` →
  `P1 trust rendered audit passed`, `pageErrors: []`. Chromium at 1360 px and
  390 px exercised the hub, corrections page and approved summary history with
  deterministic API fixtures. Rejected and withheld text was absent, reviewer
  decisions and Lithuanian statuses visible, and both approved revisions
  rendered. Stable screenshots with animation disabled are in
  `.evaluation/20261118-235807/p1-trust-rendered/` and were inspected.
- Production anonymous submissions were not created to test the cap. Its proof
  is the real-Postgres concurrency and boundary suite.

## LT-COPY inventory

All changed Lithuanian UI copy and both migration 056 correction entries are
`LT-COPY: needs native review`. Native review remains open.

## Release state

Shipped as `8a1c851` on `main`. The installed pre-push hook ran against a
throwaway Postgres on its expected localhost port and reported `all green`;
dashboard **521 passed**, TypeScript and build passed, and the backend suite
passed on a fresh database.

Both Vercel deployments report success and serve `index-qI4FLQ-_.js`.
`node .evaluation/20261118-235807/p1-trust-production-browser.mjs` passed on
both hosts at 1360 px and 390 px: both migration 056 correction entries render,
the revised privacy copy is present, the old "every note is public" sentence is
absent, and `pageErrors` is empty. Production screenshots are in
`.evaluation/20261118-235807/p1-trust-production/` and were inspected.

Render `/health` returned `{"status":"ok","database":"connected"}`. Production
migration runner output: **1 applied, 55 already up-to-date**. The public API
returns both new correction IDs and 24 total public corrections. A no-write
admin validation request returned 422 with `withheld` in the accepted status
list, confirming the new backend route is deployed. No production anonymous
submission was created. Production currently has no rejected public row, so
rejected-text suppression was verified by the real-Postgres API tests and
deterministic browser fixtures rather than a live rejected example.

Native Lithuanian review remains open.
