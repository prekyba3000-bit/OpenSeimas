# OpenSeimas — engineering & product review

**Date:** 2026-08-12 · **Reviewer:** senior civic-tech engineer perspective, written after reading
`backend/`, `pipeline/`, `migrations/`, `dashboard/src/`, and `docs/V4-MASTER-PLAN.md`, and after
querying the live Neon database.

**One-line verdict:** the engineering is better than the project's age suggests — migration
discipline, idempotent ingest, materialised views, and a genuinely well-modelled trust schema — but
the platform currently **publishes numbers about named politicians without provenance, without
fairness adjustments the plan itself mandates, and with an unmoderated public writing surface.**
Those are trust problems, not performance problems, and they outrank every feature on the roadmap.

---

## 0. The finding that should be fixed this week

`POST /api/trust/corrections` is public and unauthenticated. `GET /api/trust/corrections` returns
rows at **any** status, including freshly submitted `open` ones (`routes_trust.py:117` — the status
filter is only applied when a caller asks for it). There is no moderation step between the two.

**Anyone on the internet can publish arbitrary text — including a defamatory claim about a named
sitting MP — onto a public log on a transparency website, instantly, anonymously.** The honeypot
stops naive bots; it stops nothing else. The 60/min rate limiter is, as described in §4, most likely
counting Render's proxy rather than the submitter.

This is the inverse of the project's own legal posture (§7 of the master plan: "publish only what
traces to official sources + published methodology"). A single abusive submission screenshot-ed next
to the OpenSeimas logo does more damage than every feature in Phase 2 adds.

**Fix:** default the public log to moderated statuses only (`accepted`/`resolved`/`rejected`), keep
`open` visible to the maintainer, and state the moderation step in the form's copy. That is a
one-line SQL filter plus honest UI text — perhaps two hours including tests.

---

## 1. Architecture verdict

### Genuinely well built

- **Migration discipline.** `apply_migrations.py` with a `schema_migrations` ledger, an idempotent
  runner, and a fresh-DB bootstrap path. It survived a real disaster recovery on 2026-08-11 (17
  migrations onto an empty Neon instance, first try). Most projects this age cannot rebuild.
- **The testability seam in `backend/core.py`.** Routers resolve helpers through call-time proxies
  so tests can monkeypatch `backend.core.*` and have patches propagate. It is deliberate and
  documented in the module docstring, and it is why the API has 68 tests that run in ~2s with no
  database for most of them.
- **Materialised views for the expensive path.** `mp_stats_summary` / `mp_leaderboard_metrics` took
  the leaderboard from a 60s timeout to ~20ms. Correct instinct, correctly executed.
- **Trust schema (migration 017).** Right grain, sensible FKs, `UNIQUE (metric_key, version)`,
  `verified` defaulting false, revision uniqueness per entity. This is the best-designed part of the
  codebase and it was designed before it was needed.
- **Idempotent ingest.** UPSERT-by-source-id and intra-batch dedupe; `tag_topics` re-runs insert
  zero rows. Verified live.
- **Shared DTO contracts** (`packages/open-seimas-contracts`) — a real boundary between API and UI.

### Fragile

1. **`hero_engine.py` computes every score twice.** The STR/WIS/CHA/INT/STA formulas appear at
   lines ~919–935 *and* again at ~1279–1289 (single-profile vs bulk path). Two copies of the same
   business rule, no shared function, no test pinning them equal. This is precisely the shape that
   produces "the profile says 71 but the leaderboard says 56" bugs. **Highest-value refactor in the
   codebase.**
2. **The refresh scheduler runs in every worker.** `_scheduler_loop` starts per process, the
   Dockerfile runs `--workers 2`, and the local cron refreshes the same views every 30 minutes. That
   is three actors issuing `REFRESH MATERIALIZED VIEW CONCURRENTLY` against one Neon instance on
   overlapping schedules. Today it wastes compute; on a larger view it is a lock-contention outage.
3. **All caches and the rate limiter are per-process, in-memory.** Two workers hold two independent
   leaderboard caches and two independent rate counters. Two users can receive different
   leaderboards. The rate limiter's `_rate_tracker` dict **never evicts IP keys** — an unbounded
   dictionary in a long-lived process is a slow memory leak.
4. **`print()` where a configured `logger` already exists** (`core.py` defines `logger` on line 20
   and then uses `print` for connection failures, pool failures, and import failures). No request
   IDs, no structured fields. Diagnosing a production incident means reading undifferentiated
   stdout.
5. **Free-tier cold starts (~50s) vs a 15-minute uptime probe.** The probe will eventually alarm on
   a healthy system. Alert fatigue is how real outages get ignored.

### What breaks at 10×

The honest answer is **storage, before compute**. `mp_votes` is already 743k rows; 10× data is ~7M
rows plus indexes, against Neon's free 0.5 GB. That is a hard wall, not a slowdown — the database
stops accepting writes mid-ingest. Before optimising a single query, decide what the retention
policy is (archive older terms? aggregate and drop raw rows?).

At 10× traffic the first failure is the rate limiter (§4), then the per-worker cache inconsistency
becoming visible, then Neon's autosuspend wake latency on the first request after idle.

---

## 2. Trust-floor audit — does it deliver the V.4 promise?

Measured against the master plan's own §2 and §7, not against a generic standard.

| Plan commitment | Reality today | Gap |
|---|---|---|
| §2.2 "Provenance or it doesn't ship. Every public number carries source URL, fetch timestamp, ingest job id, methodology version" | **`source_fetches` has 0 rows.** Nothing writes it. No public number carries any provenance. | **Total.** The single largest plan-to-reality gap. |
| §1 "MP pages: attendance (from *registration* data, not vote proxies)" | Attendance is computed **entirely from vote proxies** — and methodology v1, published Monday, documents it as such. | The plan's own definition is unmet, and we published the deviation as if it were the standard. |
| §7 "excused absences (sickness, parental leave, ministerial duty) excluded/annotated in attendance" | Not implemented, not annotated, not mentioned. | An MP on parental leave is publicly shown as low-attendance. |
| §7 "72h first-response SLA" on corrections | No timer, no queue, no notification. Nobody learns a correction arrived. | The one existing correction was resolved by hand via `curl`. |
| §7 right of reply, "identity verified by maintainer" | `GET /api/trust/replies/{id}` renders replies; **there is no intake path and no verification workflow.** | An MP who wants to reply has nowhere to click. The empty state promises a channel that does not exist. |
| §7 "every metric carries `methodology_versions.version`" | 1 of 3 displayed metrics has published methodology (`attendance`). `party_loyalty` and the experience composite have none. | Two metrics are displayed with no explanation of their computation. |

**Would a skeptical Lithuanian journalist find this credible?** Partly. They would be impressed by
the public corrections log, the versioned methodology with 14-day notice, and the fact that hidden
metrics are hidden rather than zeroed. Then they would ask three questions the platform cannot
currently answer:

1. *"Where did this number come from and when was it fetched?"* — no provenance exists.
2. *"This MP was on parental leave; why does your site say she attended 40%?"* — no excused-absence
   handling, and the methodology page does not warn about it.
3. *"I emailed a correction, what happens now?"* — no SLA mechanism behind the 72h promise.

The trust *infrastructure* is real and well-built. The trust *operations* are not yet staffed by
code.

---

## 3. Data-quality risks

**The top risk is silent partial ingest, and it is already happening.**
`pipeline/ingest_votes_v2.py:49` — `fetch_xml` has no retry: on any exception it prints and returns
`None`, and the caller skips that sitting or vote. During Monday's backfill two vote-result fetches
timed out; **those votes are permanently absent and nothing anywhere records that they are missing.**
Meanwhile `utils.fetch_with_retry` already exists and newer modules use it — the fix is to adopt it
and to reconcile "IDs the source lists" against "IDs we stored" after every run, persisting the
delta.

**Zero pipeline test coverage.** `tests/test_ingest_seimas.py` and `tests/test_link_vrk.py` contain
**0 test functions** each (file present, no `def test_`). The ingest layer — the origin of every
data bug in this project's history — is untested, while the API layer has 68 tests.

**No invariant checks anywhere.** Both historical data disasters would have been caught by one
post-ingest assertion suite:
- the empty-`kaip_balsavo` trap (every MP at 100% attendance) → `assert not all(attendance == 100)`;
- the `tag_topics` FK/column mismatch → a smoke run against a seeded fixture.

Nothing today asserts: attendance ∈ [0,100]; cast votes ≤ total votes; row counts did not *drop*
versus the previous run; the `vote_choice` NULL ratio (currently 55%, correctly meaning absence)
stayed plausible. If LRS changes its XML again — which it has done before — the platform will
publish the resulting nonsense with total confidence.

**Backup fragility.** Nightly `pg_dump` began yesterday, keeps 30 files, and lives on **one laptop —
the same machine that was powered off this morning.** The production database has no off-machine
copy. A free Backblaze B2 or a private GitHub release asset would fix this at zero cost.

**Neon autosuspend** means the first query after idle is slow; combined with API cold start this
produces uptime false positives (see §1.5).

---

## 4. Security posture

| Area | Assessment |
|---|---|
| **Public write surface** | **Critical — see §0.** Unmoderated public publication of anonymous free text about named politicians. |
| **Rate limiting** | Effectively absent. In-memory per worker (2 independent counters), never evicts, and `_client_ip` uses `request.client.host`; `UvicornWorker` defaults `forwarded_allow_ips` to loopback, so behind Render's proxy this is **very likely the proxy's IP, not the submitter's** — meaning all users share one bucket. Verify with a header echo, then either trust `X-Forwarded-For` explicitly or set `FORWARDED_ALLOW_IPS`. As written it fails both ways: no protection against one abuser, and a plausible path to 429-ing every legitimate user at once. |
| **Admin auth** | Single shared bearer (`SYNC_SECRET`) for all four admin endpoints, no rotation, **no audit trail of who changed a correction's status or published a methodology version.** For a platform whose value proposition is accountability, unaudited admin writes are an awkward omission. |
| **Secrets** | Git history audited clean (no tokens; only localhost dev DSNs). But the Neon password and `SYNC_SECRET` have both passed through chat transcripts and must be rotated before any public launch. `.env` correctly gitignored. |
| **Honeypot** | Correctly implemented — server accepts and silently discards, returning a success shape so bots learn nothing. Good work; just not sufficient alone. |
| **CORS** | Explicit origin list plus a `dashboard*.vercel.app` regex, `GET/POST/OPTIONS` only. Reasonable. `allow_credentials=True` is unnecessary (no cookies) and should be dropped. |
| **Transport/headers** | No CSP, HSTS, or `X-Content-Type-Options` set by the app; Render/Cloudflare provides baseline TLS. Low priority for an API. |
| **Brute force on admin** | No lockout, but a 256-bit secret makes online guessing irrelevant. Fine. |

---

## 5. Priority ranking — and where I disagree

The proposed order is **backfills, then the summary pipeline**. I would not do either first, and the
reasoning is the same in both cases: *both workstreams increase the volume of public claims about
real people, on top of a data layer that cannot yet prove what it fetched, and a moderation layer
that does not exist.* Volume before verification is how civic-tech projects lose their credibility
in a single news cycle.

**My ranking:**

1. **Moderate the corrections log** (§0). Hours of work. Removes a live defamation vector. Nothing
   else competes.
2. **Attendance fairness + provenance.** Either implement registration-based attendance per plan §1,
   or — the honest interim — annotate the methodology page and every attendance display with the
   fact that excused absences are not distinguished, and that the figure derives from votes rather
   than registration. Simultaneously start writing `source_fetches` on every pipeline run; it is
   ~20 lines in `pipeline/common.py` and it converts "trust us" into "check us".
3. **Ingest reconciliation + invariants + the first pipeline tests.** Adopt `fetch_with_retry` in
   `ingest_votes_v2`, persist the fetched-vs-stored delta, and add an assertion suite that fails the
   run rather than publishing improbable data.

*Then* the backfills (Workstream B), which will be materially safer for having #3 in place — and
whose two ingest modules, I confirmed, target real LRS XML endpoints, so no scraping is required.
*Then* summaries (Workstream C), which should not generate public prose about MPs until the numbers
underneath carry provenance.

**What I would change about B and C specifically:**

- **B:** run it *after* #3, and extend the reconciliation to the new sources from day one rather than
  retrofitting. Also note that `politicians.bills_authored_count` (0 for all 148 MPs) is what STR
  actually reads — not a `legislation` table — so `ingest_authored_bills.py` is the module that
  un-hides "Teisėkūros aktyvumas". Committee leadership already has real data (69 chair/deputy-chair
  rows), which is why one MP already scores 13.33 while the rest sit at 0.
- **C:** the template-first design in the brief is right and I would not weaken it. I would add one
  constraint: **the first summaries should describe votes or bills, not MPs.** A generated paragraph
  about a *person* is the highest-risk text this platform can emit, and it should not be the first
  thing the generator ever writes. Prove the mechanism on legislative objects, then extend to people
  once the edit-history and correction loops have been exercised on real content.

---

## 6. What this project has going for it

Stated plainly, because the above is unrelenting: the instincts here are unusually good. Hiding a
metric rather than showing a misleading zero, publishing methodology *before* being asked, keeping
an edit history modelled on the mechanism that defended TheyVoteForYou in litigation, refusing to
seed fake demo rows — these are choices most teams make only after being burned. The gap is not
judgment; it is that operational machinery (provenance, reconciliation, moderation) has not caught
up with the product's ambitions. That is a schedulable problem.
