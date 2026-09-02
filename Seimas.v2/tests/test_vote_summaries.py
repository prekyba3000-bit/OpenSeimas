"""Plain-language vote summaries (charter P5), and the gate that guards them.

The template is deterministic, so its own numbers are right by construction.
These tests exist for the step after: an LLM rephrasing, where the only defence
is a check that runs on the finished string. So most of what is asserted here
is what the gate *rejects*.
"""
import datetime

import pytest

from pipeline.summaries import render_vote_summary, verify, verify_rendered, verify_segments
from pipeline.summaries.lt_numerals import lt_plural
from pipeline.summaries.vote_template import is_truncated_title


def row(**over):
    base = {
        "seimas_vote_id": -59988,
        "sitting_date": datetime.date(2026, 8, 25),
        "title": "Švietimo įstatymo Nr. I-1489 pakeitimo įstatymo projektas (Nr. XVP-1)",
        "vote_type": "Priėmimas",
        "project_id": "I-1489",
        "votes_for": 98,
        "votes_against": 3,
        "votes_abstained": 2,
        "votes_participated": 103,
        "seats_eligible": 140,
    }
    base.update(over)
    return base


# --- the numbers say what the row says ----------------------------------

def test_every_figure_traces_to_a_column():
    r = row()
    assert verify(render_vote_summary(r), r) == []


def test_tallies_appear_in_the_text():
    text = render_vote_summary(row()).text
    for n in ("98", "3", "2", "103", "140", "2026", "25"):
        assert n in text


def test_template_wording_carries_no_digits():
    """A number hardcoded into literal wording cannot be checked against a row."""
    violations = verify_segments(render_vote_summary(row()), row())
    assert [v for v in violations if v.kind == "digit_in_literal"] == []


def test_figure_wired_to_the_wrong_column_is_caught():
    s = render_vote_summary(row())
    # The row changes under the already-rendered text, as a mis-wired figure would.
    kinds = [v.kind for v in verify_segments(s, row(votes_for=97))]
    assert "figure_mismatch" in kinds


# --- the gate that guards a future rephrasing ---------------------------

def test_invented_number_is_rejected():
    s = render_vote_summary(row())
    rephrased = s.text + " Iš viso dalyvavo 141 narys."
    assert [v.kind for v in verify_rendered(rephrased, s)].count("unsupported_figure") == 1


def test_dropped_figure_is_rejected():
    s = render_vote_summary(row())
    assert any(v.kind == "dropped_figure" for v in verify_rendered(s.text.replace("98", ""), s))


def test_rounding_a_figure_is_rejected():
    """„apie 100" is not what the record says, however harmless it reads."""
    s = render_vote_summary(row())
    kinds = [v.kind for v in verify_rendered(s.text.replace("98", "apie 100"), s)]
    assert "unsupported_figure" in kinds


def test_numbers_inside_the_quoted_title_are_allowed():
    """The title travels verbatim; its digits are the source's, not ours."""
    r = row(title="Pelno mokesčio įstatymo Nr. IX-675 5, 17, 41 straipsnių pakeitimas")
    s = render_vote_summary(r)
    assert verify_rendered(s.text, s) == []


# --- what the summary must never say ------------------------------------

OUTCOME_WORDS = ("priimta", "nepriimta", "atmesta", "pritarta", "nepritarta", "patvirtinta")


@pytest.mark.parametrize(
    "r",
    [row(), row(votes_for=140, votes_against=0, votes_abstained=0, votes_participated=140),
     row(votes_for=0, votes_against=0, votes_abstained=0, votes_participated=0)],
)
def test_never_states_an_outcome(r):
    """`votes.result_type` is NULL on every row: the source publishes no
    pass/fail field. A lopsided tally must not tempt the template into one."""
    text = render_vote_summary(r).text.lower()
    # „priimtas" appears only in the sentence refusing to state the outcome.
    body = text.split("ar klausimas priimtas")[0]
    for w in OUTCOME_WORDS:
        assert w not in body, f"summary asserts an outcome: {w!r}"


def test_says_the_outcome_is_unpublished():
    assert "neskelbia" in render_vote_summary(row()).text


# --- unknown renders as unknown -----------------------------------------

def test_unpublished_vote_states_absence_rather_than_zeros():
    r = row(votes_for=0, votes_against=0, votes_abstained=0, votes_participated=0)
    text = render_vote_summary(r).text
    assert "nepaskelbė" in text
    assert "Už balsavo" not in text


def test_absence_is_never_given_a_cause():
    """The failure class, not the instance.

    Both this template and the dashboard once explained missing per-member data
    with the LRS note „...neatitinka protokole įrašytų suminių rezultatų“. That
    note is on all 5,286 votes, including the 3,630 that publish everything, so
    it explains nothing. Any future sentence that supplies a reason for an
    absence has to justify itself against the source, not sound plausible.
    """
    r = row(votes_for=0, votes_against=0, votes_abstained=0, votes_participated=0)
    text = render_vote_summary(r).text.lower()
    assert "nepaskelbė" in text
    for excuse in ("neatitiko", "neatitinka", "nesutapo", "nesutampa", "elektronin"):
        assert excuse not in text, f"summary invents a cause for the absence: {excuse!r}"


def test_missing_stage_is_named_not_guessed():
    text = render_vote_summary(row(vote_type=None)).text
    assert "stadijos šaltinis nenurodė" in text


# --- the source's own truncation ----------------------------------------

def test_title_capped_at_200_is_marked_truncated():
    assert is_truncated_title("x" * 200)
    assert "nutrūksta" in render_vote_summary(row(title="Švietimo " + "a" * 191)).text


def test_title_padded_to_200_with_spaces_is_still_truncated():
    """154 titles reach the cap only by counting trailing spaces, and are cut
    mid-phrase („... projektas (Nr. "). Measuring after strip() misses them."""
    assert is_truncated_title("Įstatymo projektas (Nr. " + "a" * 176)
    assert is_truncated_title("a" * 196 + "    ")


def test_title_that_merely_ends_at_200_is_not_truncated():
    """13 titles are exactly 200 characters and complete; the closing bracket
    is the disambiguator, and trailing spaces must not defeat it."""
    assert not is_truncated_title("a" * 199 + ")")
    assert not is_truncated_title("a" * 196 + ")   ")


def test_short_titles_are_never_marked():
    assert not is_truncated_title("Trumpas pavadinimas")
    assert not is_truncated_title(None)


# --- Lithuanian agreement ------------------------------------------------

@pytest.mark.parametrize(
    "n,expected",
    [(1, "narys"), (2, "nariai"), (9, "nariai"), (10, "narių"), (11, "narių"),
     (19, "narių"), (21, "narys"), (22, "nariai"), (100, "narių"), (101, "narys"),
     (111, "narių"), (140, "narių"), (0, "narių")],
)
def test_lt_plural(n, expected):
    assert lt_plural(n, "narys", "nariai", "narių") == expected


def test_teens_do_not_take_the_singular():
    """11 ends in 1 but takes the genitive plural. A rule written on the last
    digit alone produces „11 narys" — wrong in a way that reads as machine text."""
    r = row(votes_for=11, votes_against=1, votes_abstained=21, votes_participated=33)
    text = render_vote_summary(r).text
    assert "11 narių" in text
    assert "1 narys" in text
    assert "21 narys" in text
