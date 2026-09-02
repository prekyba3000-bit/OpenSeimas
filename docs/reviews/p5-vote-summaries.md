# P5 — plain-language vote summaries, template-first

2026-09-02. Charter §6 P5. Read-only against production for recon; all code
runs offline against a row. Nothing generated here has been written to the
database or published to any public surface.

Pilot output: [`p5-vote-summary-pilot.md`](p5-vote-summary-pilot.md).

## Recon

Per-vote structured fields, from a read-only session against production
(5,286 rows, 2024-11-14 → 2026-08-25):

| Field | Coverage | Notes |
| --- | --- | --- |
| `title` | 5,286 | median 118 chars, max 1,409 |
| `voted_at` | 5,286 | wall-clock; `sitting_date` has day precision only |
| `vote_type` | 5,034 | NULL on 252 |
| `project_id` | 4,392 | NULL on 894 |
| tallies (`votes_for` …) | 5,286 | but 1,656 are all-zero — see below |
| `description` | **0** | never populated by any ingest |
| `result_type` | **0** | NULL by design (migration 022) |

Two invariants verified before building on them:

- **Protocol tallies agree with per-member rows in all 3,630 tallied votes.**
  `votes_for/against/abstained` from the LRS protocol element match a live
  `COUNT(*) FILTER (...)` over `mp_votes` exactly, 3,630 of 3,630. So the
  summary can read the protocol columns without contradicting the vote page,
  which counts member rows. Worth a permanent agreement test if these ever both
  ship — filed below, not built.
- **`for + against + abstained = participated` in all 3,630.** No vote has
  members who registered without choosing.

`votes_participated = 0` is a clean predicate for "nothing published": all
1,656 such votes have 140 member rows with `vote_choice IS NULL`, and no vote
outside that set has all-null members. Zero exceptions in either direction.

## Two defects found during recon

### 1. We published a cause the source does not support — **fixed**

`utils/perMemberChoices.ts` rendered this, on the vote page, for each of the
1,656 votes with no per-member data:

> „Šiam balsavimui šaltinis nepaskelbė, kaip balsavo kiekvienas narys —
> elektroniniu būdu gauti rezultatai nesutapo su protokolo suvestine.“

The em-dash clause is a causal claim, sourced from the `komentaras` attribute
that migration 018 called "the discrepancy flag". It is not a flag:

```
SELECT source_comment, count(*), count(*) FILTER (WHERE votes_participated>0)
FROM votes GROUP BY 1;
→ 1 row: n=5286, tallied=3630
```

**One identical string on all 5,286 votes**, including all 3,630 that publish
complete per-member results. It is boilerplate LRS attaches to everything, so
it cannot explain why any particular vote is missing anything.

We know the data is absent. We do not know why. The copy now says that:

> „Šiam balsavimui šaltinis nepaskelbė, kaip balsavo kiekvienas narys.
> Priežasties šaltinis nenurodo. Rodome tik tai, kas užfiksuota.“

The same false premise had propagated into `seatMapModes.ts` and its test, and
— written earlier the same session, before the recon — into this pipeline's own
template. All four are fixed. `test_absence_is_never_given_a_cause` guards the
class: no sentence may supply a reason for an absence.

This one is worth naming plainly, because it is the third time the same shape
has appeared: a source artefact read as evidence because it was *present*, and
never checked for whether it *discriminates*. A field that is on every row
tells you nothing about any row.

### 2. LRS truncates titles at 200 characters — **marked, not fixed**

588 titles are exactly 200 characters; 571 of them are cut mid-phrase. Verified
against the live source on 2026-09-02: the agenda feed
(`ad_seimo_posedzio_eiga_full`) returns a 200-character `pavadinimas` for a bill
whose name plainly continues, so **the cap is upstream and our ingest is
faithful**. Two details that cost time and are worth keeping:

- 154 of them reach 200 only by counting **trailing spaces**, and are cut
  mid-`"(Nr. "`. Measuring after `.strip()` puts them under the cap and reports
  them as complete. `is_truncated_title` therefore takes the raw title.
- 13 titles are exactly 200 characters *and complete*; 4 more end `")"` plus
  trailing space. The closing bracket is the disambiguator, and it must be
  tested after `rstrip()` — which is the opposite of the length test, on the
  same string.

The summary marks these („Pavadinimą šaltinis pateikia sutrumpintą – jis
nutrūksta.“) rather than quoting a cut-off legal title as a whole name.

Also noted: `ingest_votes_v2.py:199` prefers `klausimo_pavadinimas` from the
results header over the agenda title. That element **does not exist** in the
current feed — verified live — so the branch is dead and every title comes from
the agenda. Left alone; it is not causing harm, and removing it belongs to
whoever next touches that ingest.

## What the template refuses to do

1. **It never states an outcome.** `result_type` is NULL on all 5,286 rows
   because the source publishes no pass/fail field. Deriving one from
   `for > against` would be inference presented as record, and wrong wherever
   the threshold is not a simple majority (constitutional laws need 3/5). Every
   summary ends by saying the outcome is unpublished — the load-bearing
   sentence, because a reader looking at 98–3 supplies „priimta“ unaided.
2. **It never paraphrases the title.** Collapsing „5, 17, 18, 30, 33, 34, 35,
   38-2, 41, 43 ir 56-1 straipsnių pakeitimo ir Įstatymo papildymo 30-3
   straipsniu“ into „11 straipsnių pakeitimo“ drops the papildymas clause and
   understates what the bill does. A shortener confident enough to be useful is
   confident enough to misdescribe a law. The title travels verbatim; the
   plain-language effort goes into stage, date, tallies, and what is unknown.
3. **It says nothing about any named person.** Vote summaries are about the
   question before the chamber.

## The figure gate

`pipeline/summaries/verify.py`. Today the text is deterministic, so checking
its numbers proves little — the point is the step after, where an LLM may be
allowed to rephrase. The gate therefore runs on the **finished string**, not on
the segments, so it works identically on template output and on a rephrasing:

- every digit run in the text must be a figure the row supports, or a digit
  inside the verbatim-quoted title;
- approved figures may not be **dropped** — a rephrasing that loses
  „susilaikė – 1“ tells a different story than the record;
- template wording may contain no digits at all, so a hardcoded number cannot
  hide in a literal.

Multiset comparison, so a figure repeated twice that the row supports once is
caught. Rejects `apie 100` for 98. Run across all 5,286 votes: **0 violations,
571 titles marked truncated.**

## LT-COPY inventory (added this session)

| File | Strings |
| --- | --- |
| `pipeline/summaries/vote_template.py` | The three stage glosses; the truncated-title note; the „no results published“ sentence; the outcome-refusal sentence |
| `dashboard/src/utils/perMemberChoices.ts` | `NO_PER_MEMBER_DATA_REASON_LT` (rewritten) |

**The stage glosses need more than proofreading.** „pateikimo stadijoje
sprendžiama, ar apskritai pradėti svarstyti projektą“ and its two siblings are
claims about Seimas procedure, not about our data. They need checking against
the Statute before any of this is published.

## State

Done: template, gate, 33 tests, 10-sample pilot, two defects fixed.
Suites green — **208 backend / 260 dashboard**.

Not done, and deliberately:

- **Nothing is published.** No route serves these, no `summary_revisions` row
  was written (that table is still empty), no surface renders them. The pilot
  is a document.
- **No LLM.** The template alone produces publishable prose; the gate exists so
  that adding rephrasing later is a reviewable step rather than a leap.
- **Bill summaries.** P5 says "votes and bills". `legislation` still has 0 rows
  and no runner (see `p4-legislative-recon.md`), so there is nothing to
  summarise. Votes were the half that had data.

Next concrete step: a human reads the pilot — specifically the stage glosses
against the Statute, and the Lithuanian throughout. Publication is gated on
that, not on more code.
