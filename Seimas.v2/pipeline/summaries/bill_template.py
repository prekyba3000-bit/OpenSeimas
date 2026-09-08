"""Deterministic plain-language summaries for bills.

Charter P5 says "votes and bills". The bill half was left unbuilt on
2026-09-02 because `legislation` had 0 rows and no runner. It now has 1,683,
and every one of them joins to votes on `project_registration_nr`, so there is
something to summarise.

A bill is not a vote, and the difference decides what this can say. A vote is
one event with one tally. A bill is a passage through the chamber: several
votes, at different stages, on different days, some of them with no published
result at all. So the summary is about that passage — how many recorded votes,
which stages, over what period — and it inherits every refusal the vote
template makes.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------

1. It does not say whether the bill became law. `votes.result_type` is NULL on
   all 5,286 rows, so no vote in the passage has a recorded outcome, so the
   passage has none either. A bill whose last recorded vote is a `Priėmimas`
   with 103 for and 0 against looks decided; the record does not say it was,
   and the summary says so rather than letting the reader fill it in.

2. It does not treat the last vote as the final one. Our data ends where the
   ingest ends, not where the Seimas did. „Paskutinis mums žinomas balsavimas"
   is the honest phrasing and the one used.

3. It does not paraphrase the title, and it says nothing about any named
   person — both for the reasons vote_template.py sets out at length.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Mapping, Sequence

from .lt_numerals import lt_plural
from .vote_template import (
    Segment,
    VoteSummary,
    _MONTHS_GENITIVE_LT,
    is_truncated_title,
)

# The order the Statute takes them in. The stage rows come back ordered by
# first date, which is right across days and arbitrary within one: a bill whose
# three stages all fell on 2026-07-14 listed „pateikimas, priėmimas,
# svarstymas", putting acceptance before consideration. Ties break on this
# order instead; a stage not named here sorts last, after the ones that are.
_STAGE_ORDER: tuple[str, ...] = ("Pateikimas", "Svarstymas", "Priėmimas", "Tvirtinimas")


def _stage_rank(stage: str | None) -> int:
    if stage in _STAGE_ORDER:
        return _STAGE_ORDER.index(stage)
    return len(_STAGE_ORDER)


def _lt_date(d: date, prefix: str) -> tuple[Segment, ...]:
    return (
        Segment("figure", str(d.year), f"{prefix}.year"),
        Segment("literal", f" m. {_MONTHS_GENITIVE_LT[d.month - 1]} "),
        Segment("figure", str(d.day), f"{prefix}.day"),
        Segment("literal", " d."),
    )


def _count(n: int, one: str, few: str, many: str, source_field: str) -> tuple[Segment, ...]:
    return (
        Segment("figure", str(n), source_field),
        Segment("literal", " " + lt_plural(n, one, few, many)),
    )


def render_bill_summary(row: Mapping[str, Any]) -> VoteSummary:
    """Build the summary for one bill's passage.

    Required keys, all produced by one aggregate query so every figure traces
    to something the database computed:

      project_id, title, vote_count, tallied_count, first_date, last_date,
      stage_counts (ordered sequence of (stage, count)), last_stage
    """
    seg: list[Segment] = []

    # 1. Which bill. The registration number travels verbatim: it carries
    #    digits that are the source's, and the gate accounts for them where
    #    they occur rather than letting them float free.
    seg.append(Segment("literal", "Projektas Nr. "))
    seg.append(Segment("verbatim", str(row["project_id"]), "project_id"))
    raw_title = row["title"] or ""
    seg.append(Segment("literal", ": „"))
    seg.append(Segment("verbatim", raw_title.strip(), "title"))
    if is_truncated_title(raw_title):
        # LT-COPY: needs native review.
        seg.append(Segment("literal", "…“. Pavadinimą šaltinis pateikia sutrumpintą – jis nutrūksta."))
    else:
        seg.append(Segment("literal", "“."))

    # 2. The passage: how many recorded votes, over what period.
    #
    # The participle agrees with the count exactly as the noun does — „1
    # užfiksuotas balsavimas", „3 užfiksuoti balsavimai", „41 užfiksuotas
    # balsavimas", „125 užfiksuoti balsavimai". The first draft hardcoded the
    # plural „užfiksuoti" and read as machine output on every singular count;
    # the figure gate cannot see this, because nothing about it is a number.
    vote_count = int(row["vote_count"])
    seg.append(
        Segment(
            "literal",
            " Dėl šio projekto "
            + lt_plural(vote_count, "užfiksuotas", "užfiksuoti", "užfiksuota")
            + " ",
        )
    )
    seg.extend(_count(vote_count, "balsavimas", "balsavimai", "balsavimų", "vote_count"))
    first, last = row["first_date"], row["last_date"]
    if first == last:
        # „nuo 2026 m. liepos 14 d. iki 2026 m. liepos 14 d." is not a period,
        # and 3 of the 10 pilot samples read that way. One vote or fifty, a
        # passage that happened on one day is one date.
        seg.append(Segment("literal", " – "))
        seg.extend(_lt_date(first, "first_date"))
    else:
        seg.append(Segment("literal", " nuo "))
        seg.extend(_lt_date(first, "first_date"))
        seg.append(Segment("literal", " iki "))
        seg.extend(_lt_date(last, "last_date"))
    # No trailing "." here: _lt_date already ends the sentence with „d.", and
    # appending one produced „14 d..".

    # 3. Which stages, in the order the chamber took them.
    stages: Sequence[tuple[str | None, int]] = row["stage_counts"]
    named = sorted(((s, n) for s, n in stages if s), key=lambda sn: _stage_rank(sn[0]))
    if named:
        seg.append(Segment("literal", " Stadijos: "))
        for i, (stage, n) in enumerate(named):
            if i:
                seg.append(Segment("literal", ", "))
            seg.append(Segment("verbatim", stage.lower(), f"stage.{stage}"))
            seg.append(Segment("literal", " – "))
            seg.extend(_count(n, "balsavimas", "balsavimai", "balsavimų", f"stage_count.{stage}"))
        seg.append(Segment("literal", "."))
    if len(named) != len(stages):
        # Some votes carry no stage. Naming the gap beats implying the list is
        # the whole passage. LT-COPY: needs native review.
        seg.append(Segment("literal", " Dalies balsavimų stadijos šaltinis nenurodė."))

    # 4. How much of the passage has published results. The 1,656 tally-less
    #    votes are not zeros, and a bill made only of them must not read as a
    #    bill nobody supported.
    tallied = int(row["tallied_count"])
    if tallied == 0:
        # LT-COPY: needs native review.
        seg.append(
            Segment(
                "literal",
                " Nė vieno iš šių balsavimų rezultatų šaltinis nepaskelbė."
                " Priežasties šaltinis nenurodo.",
            )
        )
    elif tallied < vote_count:
        seg.append(Segment("literal", " Rezultatai paskelbti "))
        seg.extend(_count(tallied, "balsavimo", "balsavimų", "balsavimų", "tallied_count"))
        # LT-COPY: needs native review.
        seg.append(Segment("literal", "; likusių šaltinis nepaskelbė."))

    # 5. The outcome we refuse to state, for the passage as a whole.
    # LT-COPY: needs native review.
    seg.append(
        Segment(
            "literal",
            " Ar projektas priimtas, šaltinis neskelbia, todėl rezultato nenurodome."
            " Paskutinis čia nurodytas balsavimas yra paskutinis mums žinomas,"
            " nebūtinai paskutinis įvykęs.",
        )
    )

    return VoteSummary(
        segments=tuple(seg),
        facts={
            "project_id": row["project_id"],
            "vote_count": vote_count,
            "tallied_count": tallied,
            "first_date": row["first_date"],
            "last_date": row["last_date"],
            "stages": [s for s, _ in stages],
        },
    )
