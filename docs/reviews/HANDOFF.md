# Handoff prompt — paste into a new chat

You are continuing autonomous work on **Atviras Seimas** at
`/home/julio/Documents/OpenSeimas`. Read `CLAUDE.md` first — it is the standing
charter and it governs every judgment call. Then read
`docs/reviews/RESUME.md` and `docs/reviews/faction-vs-nominating-party.md`.

## State

Branch `main`, clean, everything pushed. HEAD is `17d25e3`. Suites:
**306 dashboard / 247 backend** (+19 skipped). Pre-push runs both plus a vite
build and must stay green.

- Backend (Render): https://seimas-api.onrender.com — deploys on push to `main`,
  live in ~2–4 min.
- Frontend (Vercel): https://seimas-v2.vercel.app — same trigger, **10–20 min**.
  Poll the bundle hash (`curl -s <url> | grep -o '/assets/[^"]*\.js'`) to know
  when it landed; do not trust a page you loaded before the deploy.
- Python: `Seimas.v2/.venv/bin/python`, run from `Seimas.v2/`. Secrets in
  `~/.config/openseimas/prod.env` (`DB_DSN`, `SYNC_SECRET`, mode 600) — source
  it, never echo or commit it.
- Data: 5,286 votes · 744,495 per-member votes · 8,141 speeches · 148 members ·
  `legislation` **0 rows** · `summary_revisions` **0 rows**.

## Do these, in order, without asking first

1. **Extend the degraded-payload guard to the unvalidated endpoints.**
   `tests/test_degraded_payload.py` + `dashboard/src/services/wireContract.test.ts`
   cover the four zod-validated schemas. `/api/votes/{id}`, `/api/mps` and
   `/api/stats` go through `request<T>()` with no runtime schema, so a bad shape
   renders wrong instead of blank. Give them schemas, then degrade them.
   `tests/degraded.py` has the empty-database stub; `python -m tests.regen_degraded`
   rewrites the golden files.
2. **The `legislation` runner.** The table is empty and no timer invokes
   `pipeline/ingest_legislation.py`. `docs/reviews/p4-legislative-recon.md` says
   where the data comes from. This blocks P5 bill summaries — vote summaries are
   already built (`pipeline/summaries/`) and gated only on human LT review.
3. **Wire `scripts/refresh_wire_fixtures.py` into `daily_sync.sh`** so captured
   fixtures cannot silently rot.

## Traps that will cost you an hour each

- **`docs/` is at the repo root, not under `Seimas.v2/`.** A heredoc append from
  the wrong cwd fails silently and the commit goes without the file. This
  happened twice.
- **Widening a backend value to null is a wire change** even when nothing is
  renamed. Charter §1.11 lists five places; the zod schema is the one that gets
  forgotten. It blanked a page twice in one session with all suites green.
- **`strict: false`** in `dashboard/tsconfig.json` means a null-bearing zod
  schema renders its key *optional* to tsc. A required field then cannot be
  satisfied by any schema admitting null — use `?: number | null`.
- **Browser tab console/network buffers are stale.** Open a fresh tab before
  believing what a page shows, especially right after a deploy.
- **„Tinklas lėtas" right after a deploy is a Render cold start**, not a defect.
  Warm `/api/v2/heroes/{id}` and retry; the client aborts at 8 s and the warm
  figure is 2–4 s.
- **String replacement fails silently.** Always `assert old in s` before writing.
- **Run code first, then data.** A migration applied before its code shipped put
  the English string „Unknown" on a live Lithuanian page for a deploy cycle.

## What needs the human — never invent these

- **LT copy.** 21 files carry `LT-COPY: needs native review`. The P5 pilot
  (`docs/reviews/p5-vote-summary-pilot.md`) needs a native reader, and its three
  stage glosses are claims about Seimas procedure that must be checked against
  the Statute before anything publishes.
- **Legal name.** `<FILL IN>` in `NOTICE:3`, `NOTICE:18`, `README.md:69` awaits
  a VšĮ entity code. Never guess it.
- Charter §4 STOP conditions: money, external communication, credentials,
  legal/government actions, irreversible data ops, anything verdict-shaped.

## How this user works

Do not stop to report blockers or hand back a list of "remaining limits" — if
you can see it and it is in scope, do it. They have said so twice. Keep
responses short and free of preamble; they dislike clutter. Prefer accuracy over
legacy naming — if a label is wrong, rename it. When they push back on something
you dismissed, investigate properly: doing that turned up two real production
defects that had been written off as testing artifacts.

Above all, follow charter §1.7: before calling anything done, **open the page and
read it as a hostile reader**. Every defect that mattered in the last two
sessions was found that way, with the test suites fully green.
