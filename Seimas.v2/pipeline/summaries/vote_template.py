"""Deterministic plain-language summaries for votes.

Charter P5: templates first. Every figure in the output comes from a database
column, named, so that `verify.py` can check the finished text against the row
it was built from. No LLM is involved at this stage and none is required - the
template alone produces publishable prose.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------

1. It does not state an outcome. `votes.result_type` is NULL on all 5,286 rows
   because the LRS source publishes no pass/fail field (migration 022).
   Deriving one from `for > against` would be inference presented as record,
   and wrong wherever the threshold is not a simple majority - constitutional
   laws need 3/5. The summary says plainly that the outcome is not published.

2. It does not paraphrase the title. Titles are long (median 118 characters,
   max 1,409) and the temptation is to collapse
   "5, 17, 18, 30, 33, 34, 35, 38-2, 41, 43 ir 56-1 straipsniu pakeitimo ir
   Istatymo papildymo 30-3 straipsniu" into "11 straipsniu pakeitimo". That
   drops the papildymas clause and understates what the bill does: a shortener
   confident enough to be useful is confident enough to misdescribe a law.
   The title travels verbatim; the plain-language effort goes into the parts
   that are genuinely structured - stage, date, tallies, and what is unknown.

3. It says nothing about any named person. Vote summaries are about the
   question before the chamber, not about who voted which way.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal, Mapping

from .lt_numerals import lt_plural

# Genitive, as Lithuanian dates require: "2026 m. rugpjucio 25 d."
_MONTHS_GENITIVE_LT = (
    "sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio",
    "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio",
)

# LT-COPY: needs native review. These gloss the Seimas Statute's stages in one
# clause each. They are claims about parliamentary procedure, not about data,
# and must be checked against the Statute before any of this reaches the public
# site - which is why the pilot prints them separately for review.
_STAGE_GLOSS_LT: Mapping[str, str] = {
    "Pateikimas": "pateikimo stadijoje sprendžiama, ar apskritai pradėti svarstyti projektą",
    "Svarstymas": "svarstymo stadijoje projektas nagrinėjamas iš esmės",
    "Priėmimas": "priėmimo stadijoje balsuojama dėl viso teksto",
}

# LRS caps the agenda element's `pavadinimas` at exactly 200 characters, and
# that is the only title the feed offers - verified against the live source on
# 2026-09-02, where the agenda returned a 200-character title for a bill whose
# name plainly continues. 575 of 5,286 stored titles are cut this way.
#
# The 13 titles that are exactly 200 characters AND close a parenthesis are
# complete by coincidence of length, so the closing bracket is the
# disambiguator. Titles longer than 200 are all our own synthesised
# "Klausimu grupe" composites, never source text.
_LRS_TITLE_CAP = 200


def is_truncated_title(title: str | None) -> bool:
    """Whether the source cut this title off mid-phrase.

    Takes the raw title, deliberately: 154 of the capped titles reach 200
    characters only by counting trailing spaces, and they are cut mid-phrase
    ("... projektas (Nr. "). Measuring after strip() puts them under the cap
    and reports them as complete.
    """
    if not title:
        return False
    return len(title) == _LRS_TITLE_CAP and not title.rstrip().endswith(")")


SegmentKind = Literal["literal", "figure", "verbatim"]


@dataclass(frozen=True)
class Segment:
    """One piece of the rendered text.

    `literal`  - template wording. Must contain no digits; verify.py enforces it.
    `figure`   - a number that came from `source_field`. The value is rendered
                 as-is and checked back against the row.
    `verbatim` - text copied from the source unchanged (the title). Digits
                 inside it are the source's, not ours, so they are exempt from
                 the figure check but recorded so a later rephrasing cannot
                 quietly introduce new ones.
    """

    kind: SegmentKind
    text: str
    source_field: str | None = None


@dataclass(frozen=True)
class VoteSummary:
    segments: tuple[Segment, ...]
    facts: Mapping[str, Any] = field(default_factory=dict)

    @property
    def text(self) -> str:
        return "".join(s.text for s in self.segments)

    def figures(self) -> tuple[tuple[str, str], ...]:
        """(source_field, rendered value) for every figure segment."""
        return tuple(
            (s.source_field or "", s.text) for s in self.segments if s.kind == "figure"
        )


def _lt_date(d: date) -> tuple[Segment, ...]:
    return (
        Segment("figure", str(d.year), "sitting_date.year"),
        Segment("literal", f" m. {_MONTHS_GENITIVE_LT[d.month - 1]} "),
        Segment("figure", str(d.day), "sitting_date.day"),
        Segment("literal", " d."),
    )


def _count(n: int, one: str, few: str, many: str, source_field: str) -> tuple[Segment, ...]:
    return (
        Segment("figure", str(n), source_field),
        Segment("literal", " " + lt_plural(n, one, few, many)),
    )


def render_vote_summary(row: Mapping[str, Any]) -> VoteSummary:
    """Build the summary for one `votes` row.

    Required keys: sitting_date, title, vote_type, votes_for, votes_against,
    votes_abstained, votes_participated, seats_eligible.
    """
    seg: list[Segment] = []
    d = row["sitting_date"]

    # 1. When, and what question.
    seg.extend(_lt_date(d))
    raw_title = row["title"] or ""
    title = raw_title.strip()
    seg.append(Segment("literal", " Seimas balsavo dėl šio klausimo: „"))
    seg.append(Segment("verbatim", title, "title"))
    if is_truncated_title(raw_title):
        # Quoting a cut-off legal title as though it were the whole name states
        # something the record does not. Say where it stops instead.
        # LT-COPY: needs native review.
        seg.append(
            Segment("literal", "…“. Pavadinimą šaltinis pateikia sutrumpintą – jis nutrūksta.")
        )
    else:
        seg.append(Segment("literal", "“."))

    # 2. Which stage. vote_type is NULL on 252 rows; say so rather than guess.
    stage = row.get("vote_type")
    if stage:
        seg.append(Segment("literal", " Balsavimo stadija — "))
        seg.append(Segment("verbatim", stage.lower(), "vote_type"))
        gloss = _STAGE_GLOSS_LT.get(stage)
        seg.append(Segment("literal", f" ({gloss})." if gloss else "."))
    else:
        # LT-COPY: needs native review.
        seg.append(Segment("literal", " Balsavimo stadijos šaltinis nenurodė."))

    # 3. The tallies, or the fact that there are none.
    participated = row["votes_participated"]
    if participated and participated > 0:
        seg.append(Segment("literal", " Už balsavo "))
        seg.extend(_count(row["votes_for"], "narys", "nariai", "narių", "votes_for"))
        seg.append(Segment("literal", ", prieš – "))
        seg.extend(_count(row["votes_against"], "narys", "nariai", "narių", "votes_against"))
        seg.append(Segment("literal", ", susilaikė – "))
        seg.extend(_count(row["votes_abstained"], "narys", "nariai", "narių", "votes_abstained"))
        seg.append(Segment("literal", ". Iš viso balsavo "))
        seg.extend(_count(participated, "narys", "nariai", "narių", "votes_participated"))
        seg.append(Segment("literal", " iš "))
        # seats_eligible is the protocol's own per-vote count of who could
        # vote at that moment - not the constitutional 141 and not today's
        # active roster. Saying "dalyvavusiu" would assert attendance, which
        # this field does not measure.
        seg.append(Segment("figure", str(row["seats_eligible"]), "seats_eligible"))
        seg.append(
            Segment(
                "literal",
                ", kuriuos protokolas tuo metu laikė turinčiais teisę balsuoti.",
            )
        )
    else:
        # LT-COPY: needs native review.
        #
        # This sentence used to continue "...: protokole pažymėta, kad
        # elektroninėmis priemonėmis gauti individualūs rezultatai neatitiko
        # protokolo suvestinės." That named a cause the source does not
        # support. The `komentaras` attribute carrying it is on all 5,286
        # votes - one identical string, including all 3,630 that publish
        # complete results - so it is boilerplate, not a per-vote flag.
        # We know the results are absent; we do not know why.
        seg.append(
            Segment(
                "literal",
                " Šaltinis nepaskelbė nei suvestinių, nei pavienių šio balsavimo"
                " rezultatų. Priežasties šaltinis nenurodo.",
            )
        )

    # 4. The outcome we refuse to state. Always present - a reader who sees
    #    103 vs 3 will supply "priimta" unless told the record does not say so.
    # LT-COPY: needs native review.
    seg.append(
        Segment(
            "literal",
            " Ar klausimas priimtas, šaltinis neskelbia, todėl rezultato nenurodome.",
        )
    )

    return VoteSummary(
        segments=tuple(seg),
        facts={
            "seimas_vote_id": row.get("seimas_vote_id"),
            "sitting_date": d,
            "vote_type": row.get("vote_type"),
            "project_id": row.get("project_id"),
            "has_tallies": bool(participated and participated > 0),
        },
    )
