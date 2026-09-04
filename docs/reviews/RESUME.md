# RESUME — 2026-09-02

Branch `main`, everything pushed. Pre-push gate green on every commit.

## Done this session

| Commit | What |
| --- | --- |
| `0b34abe` | P5 vote summaries: template, figure gate, 33 tests, 10-sample pilot |
| `3082b52` | Corrections entry for the cause we invented (migration 038) |
| `78d8c11` | Truncated titles marked on the vote page; dev-server fonts fixed |

Suites: **265 dashboard / 208 backend** (+19 skipped). Charter counts updated.

## P5 — the state that matters

Built: a deterministic template that renders all 5,286 votes into plain
Lithuanian, and a **figure gate** that runs on the finished string rather than
on the template's internals — so it will still work when an LLM is allowed to
rephrase. It rejects invented numbers, dropped figures, rounding („apie 100"
for 98), and digits hardcoded into template wording. Run across the whole
table: 0 violations.

Not built, deliberately: nothing is published. No route serves these, no
`summary_revisions` row was written, no surface renders them, and no LLM is
involved. Bill summaries are blocked upstream — `legislation` still has 0 rows
and no runner, so votes were the half with data.

**The gate for publication is human, not technical.** The pilot
(`p5-vote-summary-pilot.md`) needs a Lithuanian reader, and specifically the
three stage glosses („pateikimo stadijoje sprendžiama, ar apskritai pradėti
svarstyti projektą" and siblings) checked against the Seimas Statute — they are
claims about procedure, not about our data.

## Two defects found and fixed

1. **We published a cause the source does not give.** The vote page told
   readers per-member results were missing because the electronic results
   disagreed with the protocol. That sentence came from a `komentaras`
   attribute that is one identical string on **all 5,286 votes**, including all
   3,630 that publish everything. A field present on every row discriminates
   nothing. Fixed in four places (the page, the seat map, its test, and this
   session's own template, which had inherited the false premise before the
   recon caught it). `test_absence_is_never_given_a_cause` guards the class.
   Public corrections entry in migration 038.

2. **Truncated titles shown as whole names.** LRS caps titles at 200
   characters; 571 are cut mid-phrase. Verified against the live agenda feed —
   the cap is upstream, our ingest is faithful. Now marked on the vote page and
   in summaries.

Neither was found by grepping. Both came from reading a rendered page.

## Blocked / needs the human

- **LT-COPY native review** — the pilot, plus the two strings added this
  session. Inventory in `p5-vote-summaries.md`.
- **Stage glosses vs the Seimas Statute** — see above; gates P5 publication.
- **Legal name** — `<FILL IN>` in `NOTICE:3`, `NOTICE:18`, `README.md:69`.
  Awaits the VšĮ entity code. Never invent it.
- ~~**Vercel frontend URL**~~ — **resolved 2026-09-04.** Two live deployments,
  both serving the same build: `seimas-v2.vercel.app` and
  `open-seimas-dashboard.vercel.app`. Recorded in `Seimas.v2/README.md`. The
  third CORS origin, `dashboard-tawny-tau-42.vercel.app`, is dead (404).
- Five older decisions still open: VTEK approach, snapshot payload storage,
  `ingest_votes_v2` manifest policy, faction spelling variants, forensic
  severity badges.

## Next concrete step

Either (a) a human reads the pilot and the LT copy, unblocking P5 publication,
or (b) if more code is wanted first, the `legislation` runner — it is the only
thing standing between here and bill summaries, and P4's recon already says
where the data would come from.

One thing worth doing before publishing summaries: a permanent agreement test
between the protocol tallies (`votes.votes_for`) and the per-member counts the
vote page derives. They agree 3,630/3,630 today, and the summary reads one
while the page reads the other.
