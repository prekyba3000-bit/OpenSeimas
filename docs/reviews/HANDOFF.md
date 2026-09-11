# Torch-pass — Atviras Seimas

You are taking over an in-progress, multi-session engagement on **Atviras
Seimas**, a Lithuanian parliamentary transparency platform. This file is your
starting brief. It is dated **2026-09-10**; treat the repo as the source of
truth where they disagree, and say so rather than improvising.

---

## 0. First actions, before you touch anything

Read these, in order — they govern everything:

1. `CLAUDE.md` (repo root) — **the charter. Authoritative.** If anything here
   or in your own instincts conflicts with it, the charter wins.
2. `Seimas.v2/AGENTS.md` — repo-specific agent notes.
3. `docs/reviews/RESUME.md` — the running state log; the most recent entry is
   where things stand.
4. `docs/reviews/evidence-first-profiles.md` and the newest files in
   `docs/reviews/` (sorted by date) — the accumulated design decisions.

Then orient without changing anything:

```bash
cd /home/julio/Documents/OpenSeimas
git log --oneline -15
git status
```

Do **recon before code** (charter §1.8). Map the real tables, routes, and
tests before writing. Never assume a status name, an envelope shape, or that a
feature exists — check.

---

## 1. Where everything is

- **Repo:** `/home/julio/Documents/OpenSeimas` — git, branch `main`, remote
  `github.com/prekyba3000-bit/OpenSeimas`.
- **Backend:** `Seimas.v2/backend/` (FastAPI + psycopg2). **Pipeline:**
  `Seimas.v2/pipeline/` (ingest + summaries). **Dashboard:**
  `Seimas.v2/dashboard/` (React + Vite + TanStack Query). **Migrations:**
  `Seimas.v2/migrations/` (47 of them; applied by `apply_migrations.py`).
- **Secrets — never in the repo (charter §10):** `~/.config/openseimas/`,
  mode 0600. `prod.env` holds `DB_DSN` (Neon Postgres) and `SYNC_SECRET`
  (admin-endpoint bearer token). Source it, never echo or commit it:
  `set -a; . ~/.config/openseimas/prod.env; set +a`.
- **Production:** backend on **Render** (`seimas-api.onrender.com`), frontend
  on **Vercel** (`seimas-v2.vercel.app`, `open-seimas-dashboard.vercel.app`),
  DB on **Neon**. Render and Vercel both auto-deploy from `main`.

---

## 2. The rules that are not yours to bend

The charter is complete; this is the short version so you don't trip a wire.

- **Trust floor (§1.1):** never display what the data doesn't support. Unknown
  renders as *unknown* — never 0.0, never a plausible default, never an empty
  chip. `missing` / `unpublished` / `present` are three different facts and
  stay distinct.
- **No verdict machines (§1.3):** no score, rank, grade, or label about a named
  person on any public surface **or API payload**. Descriptive dimensions
  (attendance, experience, etc.) are fine, each with its denominator and
  method. If you catch yourself building anything that ranks people — stop,
  record it, redesign as evidence-first.
- **Single source of truth per metric (§1.4):** one resolver, no
  `COALESCE(metric, 0)` in read paths. List and profile must always agree —
  there is a permanent agreement test; keep it.
- **Lithuanian copy (§2):** every user-facing LT string you write is *working
  copy*. Mark it `LT-COPY: needs native review` and add it to the review
  inventory. You may not put unreviewed LT in front of users. You cannot
  self-certify Lithuanian — a native speaker must pass on new strings.
- **STOP conditions (§4) — halt and ask the human:** spending money (any paid
  tier/API — the platform runs zero-cost), sending external messages/publishing
  outside the repo and the deploys you own, creating accounts or handling new
  credentials, legal/government actions, irreversible data ops (destructive
  migrations, deleting or rewriting historical ingested rows), and any
  verdict-shaped feature. Backfills that *add* sourced data via reviewed
  scripts are allowed.
- **Verify, don't trust (§1.9):** any data you didn't produce gets checked
  against the primary source before it backs anything user-facing.
- **Rendered-surface audit (§1.7):** before calling anything user-facing done,
  open the actual page and read it as a hostile reader. Repeatedly this
  session, suites were green while the rendered page was wrong. Greps find what
  you name; eyes find what you didn't.

One recurring lesson worth internalizing: **a value being *present* is not the
same as it being *evidence*.** Most defects here were a field read as a fact
without checking whether it *discriminates* — a level defaulting to 0, a
maximum hardcoded to 0, a source comment identical on all 5,286 rows treated as
a per-row flag. Check that a number means what you think before you show it.

---

## 3. Live state as of 2026-09-10

- **Deploys are healthy.** Both were failing; fixed at HEAD `e1c5e73` — `recharts`
  needs `react-is` as a real dependency (it was only ever a hoisted transitive
  of packages that got pruned). If a Vercel build fails again, reproduce it in
  a *clean clone* (`npm install --legacy-peer-deps` + build) — the working tree
  can pass while a fresh install fails.
- **P5 (summaries) is code-complete and deployed, publishing nothing.**
  Deterministic templates turn a vote or a bill's passage into plain Lithuanian
  (`Seimas.v2/pipeline/summaries/`). A figure gate (`verify.py`) checks every
  number in the text against the database. Serving is behind approval:
  a revision is a draft until a human approves it (`POST /api/admin/summaries`
  then `/api/admin/summaries/approve`, which re-runs the gate), and
  `GET /api/summaries/{type}/{id}` serves only the latest *approved* revision,
  re-verified on read. `summary_revisions` currently has **0 rows** — nothing
  is public. `PlainSummary.tsx` renders an approved summary on the vote page or
  nothing.
- **No LLM is involved, by design and by §4.1** (paid API = money STOP). The
  templates alone produce publishable prose; the gate exists so that *if* an
  LLM rephrasing step is ever added, it is a reviewable, human-approved step.

---

## 4. The one thing in flight — the LT review

Publishing the summaries is gated on a native-speaker review of the Lithuanian.
That review is underway in **`docs/reviews/lt-copy-review-worksheet.md`** (a
worksheet with every user-facing string and a `Pataisymas:` line under each).

The highest-risk copy — the stage explanations („pateikimo stadijoje…" etc.) —
was **verified against the primary source** (`Lietuvos Respublikos Seimo
statutas`) this session:

- **Pateikimas** gloss — correct per Statute art. 148 (skirsnis 20).
- **Svarstymas** gloss — correct per art. 157 (skirsnis 22).
- **Priėmimas** gloss — correct per art. 163 (skirsnis 23), but *incomplete*:
  it names the whole-text vote and omits the article-by-article voting (art.
  160–161). **Open decision for the human:** keep the short gloss, or expand to
  „…balsuojama dėl atskirų straipsnių ir galiausiai dėl viso teksto". Do not
  change it unilaterally — it's their copy.

When the human returns the worksheet with corrections:
1. Move each fix into its source string (templates in
   `pipeline/summaries/`, UI strings in `dashboard/src/` and `i18n/lt.ts`).
2. Once approved, publish by writing revisions and approving them through the
   admin endpoints — a *data* change, not a deploy.
3. Add a `methodology_versions` entry if a published-metric computation
   changed, and a corrections entry if a production-visible defect is fixed
   (§1.5, §1.6).

---

## 5. Next work, in priority order (all yours; none blocked)

1. **Compare page** — the largest unbuilt product. The `contextBand` helper is
   built and shelved awaiting it (`dashboard/src/utils/contextBand.ts`), under a
   "≥10 comparable peers" rule. **Write a design note first** (charter asks for
   it) — and think hard about non-partisanship: a compare view is one step from
   a ranking, which §1.3 forbids.
2. **Android deep-links** — the Capacitor app and `AndroidManifest.xml` exist;
   link routing is missing. **Design note first.**

Blocked on the human (surface these, don't attempt): the **legal name** fill
(charter P1 — needs the VšĮ entity code; `<FILL IN>` in `NOTICE` and
`README.md`), the **LT review** above, and the **P6 dead-code decision** (43
vendored `ui/` files + 9 story-documented components — deleting them is a
judgment call, not hygiene).

---

## 6. How to run, verify, and ship

```bash
# backend tests — need a database
set -a; . ~/.config/openseimas/prod.env; set +a          # or a local DSN
cd Seimas.v2 && DB_DSN=<dsn> PYTHONPATH=. .venv/bin/python -m pytest tests -q
# tests that touch the DB skip cleanly when DB_DSN is unset

# dashboard
cd Seimas.v2/dashboard
npx tsc --noEmit                                          # type gate, no exclusions
npx vitest run
VITE_API_URL=https://seimas-api.onrender.com npm run build

# migrations (idempotent; test on a throwaway DB first)
cd Seimas.v2 && DB_DSN=<dsn> .venv/bin/python apply_migrations.py

# data-quality gate against production (read-only)
DB_DSN=<dsn> .venv/bin/python scripts/dq_check_runner.py
```

- The **pre-push hook** runs backend pytest (fresh throwaway DB), dashboard
  `tsc`, vitest, and a production build. Keep it green; it is the local CI
  (GitHub Actions billing is locked — do not enable it, §4.1).
- **Deploy is two-sided.** A wire-shape change must ship both Render (backend)
  and Vercel (frontend) together, at a quiet hour, and be **verified against
  production immediately after** — read-only. Note the coupling in the commit
  message.
- **Verify against production by reading it**, never by trusting the deploy
  succeeded: curl the endpoint, open the page, read the console. This session
  found live defects (an RPG image of MPs, three sessions reading "0 votes")
  that all suites had passed.

End every session with a dated `RESUME.md` note: done / in-flight / blocked /
next concrete step. Keep write-ups in `docs/reviews/`. That continuity is the
only reason a torch-pass like this is possible.

---

## 7. Working style expected here

Surface tradeoffs; don't silently pick. State assumptions; ask when unclear.
Simplest change that solves the problem — no speculative abstraction. Touch
only what the task needs. When you finish something, say plainly whether it's
verified; if a test failed or a step was skipped, say so. If you are ever
unsure whether something crosses a STOP condition or the trust floor, treat
that uncertainty as a stop and ask the human.
