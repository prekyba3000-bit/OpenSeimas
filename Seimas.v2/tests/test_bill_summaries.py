"""Deterministic plain-language summaries for a bill's passage.

The vote half of charter P5 shipped 2026-09-02; the bill half was left because
`legislation` had 0 rows. It has 1,683 now, all of which join to votes on the
registration number, so there is a passage to describe.

Four of these tests exist because reading the rendered pilot found what the
figure gate cannot: agreement, punctuation and ordering are not numbers.
"""
from __future__ import annotations

import datetime as dt

import pytest

from pipeline.summaries import render_bill_summary, verify
from pipeline.summaries.verify import verify_rendered

D = dt.date


def bill(**over):
    row = {
        "project_id": "XVP-1247(3)",
        "title": "Mokėjimų įstatymo Nr. VIII-1370 3 straipsnio pakeitimo įstatymo projektas",
        "vote_count": 3,
        "tallied_count": 3,
        "first_date": D(2026, 7, 14),
        "last_date": D(2026, 7, 14),
        "stage_counts": [("Pateikimas", 1), ("Svarstymas", 1), ("Priėmimas", 1)],
        "last_stage": "Priėmimas",
    }
    row.update(over)
    for stage, n in row["stage_counts"]:
        if stage:
            row[f"stage_count.{stage}"] = n
    return row


# --- what only reading the output finds ----------------------------------

@pytest.mark.parametrize("n,expected", [
    (1, "užfiksuotas 1 balsavimas"),
    (3, "užfiksuoti 3 balsavimai"),
    (11, "užfiksuota 11 balsavimų"),
    (41, "užfiksuotas 41 balsavimas"),
    (125, "užfiksuoti 125 balsavimai"),
])
def test_the_participle_agrees_with_the_count(n, expected):
    """„Dėl šio projekto užfiksuoti 1 balsavimas" was the first draft, on every
    singular count. Nothing about it is a number, so the gate passed it."""
    text = render_bill_summary(bill(vote_count=n, tallied_count=n)).text
    assert expected in text


def test_a_passage_on_one_day_is_one_date():
    """„nuo 2026 m. liepos 14 d. iki 2026 m. liepos 14 d." is not a period, and
    three of the ten pilot samples read that way."""
    text = render_bill_summary(bill(first_date=D(2026, 7, 14), last_date=D(2026, 7, 14))).text
    assert "nuo " not in text
    assert text.count("liepos 14 d.") == 1


def test_a_passage_across_days_names_both_ends():
    text = render_bill_summary(bill(first_date=D(2025, 12, 16), last_date=D(2025, 12, 17))).text
    assert "nuo 2025 m. gruodžio 16 d. iki 2025 m. gruodžio 17 d." in text


def test_no_sentence_ends_in_a_double_stop():
    """`_lt_date` already closes with „d.", and appending one produced „14 d..".
    Renders as machine output; invisible to a figure check."""
    for row in (bill(), bill(first_date=D(2025, 1, 1), last_date=D(2026, 3, 9))):
        assert ".." not in render_bill_summary(row).text


def test_stages_are_listed_in_the_order_the_statute_takes_them():
    """The stage rows arrive ordered by first date, which is right across days
    and arbitrary within one. A bill whose three stages all fell on the same
    day listed „pateikimas, priėmimas, svarstymas" — acceptance before
    consideration."""
    text = render_bill_summary(bill(
        stage_counts=[("Priėmimas", 1), ("Svarstymas", 1), ("Pateikimas", 1)],
    )).text
    order = [text.index(s) for s in ("pateikimas", "svarstymas", "priėmimas")]
    assert order == sorted(order)


# --- what the summary must never say -------------------------------------

OUTCOME_WORDS = ("priimtas", "atmestas", "tapo įstatymu", "nepriimtas")


@pytest.mark.parametrize("row", [
    bill(),
    bill(vote_count=4, tallied_count=4, stage_counts=[("Priėmimas", 4)]),
    bill(vote_count=1, tallied_count=0, stage_counts=[("Pateikimas", 1)]),
])
def test_it_never_declares_the_bill_passed(row):
    text = render_bill_summary(row).text
    # The refusal sentence contains „priimtas" itself, so the check is that no
    # other sentence does.
    refusal = "Ar projektas priimtas, šaltinis neskelbia"
    assert refusal in text
    rest = text.replace(refusal, "")
    for word in OUTCOME_WORDS:
        assert word not in rest, f"{word!r} escaped into: {rest}"


def test_it_does_not_call_the_last_known_vote_the_final_one():
    text = render_bill_summary(bill()).text
    assert "paskutinis mums žinomas" in text


def test_a_passage_with_no_published_results_states_absence_not_zeros():
    """All three votes are among the 1,656 with nothing published. A bill made
    only of those must not read as a bill nobody supported."""
    summary = render_bill_summary(bill(tallied_count=0))
    assert "Nė vieno iš šių balsavimų rezultatų šaltinis nepaskelbė" in summary.text
    # Asserted on the declared figures, not on the raw string: „VIII-1370" in
    # the title contains a 0 that is the source's, and a text-level check calls
    # that a claim. What matters is that the template asserts no zero of its
    # own — no „0 balsavimų už".
    assert "0" not in [value for _, value in summary.figures()]


def test_absence_is_never_given_a_cause():
    """The `komentaras` attribute is one identical string on all 5,286 votes,
    so it explains nothing about any of them. Same rule as the vote template."""
    text = render_bill_summary(bill(tallied_count=0)).text
    assert "Priežasties šaltinis nenurodo" in text
    for invented in ("elektronin", "neatitiko", "protokolo suvestin"):
        assert invented not in text


def test_a_partly_published_passage_says_how_much_is_visible():
    text = render_bill_summary(bill(vote_count=41, tallied_count=39,
                                    stage_counts=[("Svarstymas", 41)])).text
    assert "Rezultatai paskelbti 39 balsavimų; likusių šaltinis nepaskelbė." in text


def test_a_fully_published_passage_does_not_labour_the_point():
    assert "Rezultatai paskelbti" not in render_bill_summary(bill()).text


def test_an_unnamed_stage_is_named_as_a_gap():
    """No real bill has this shape today — every bill's votes carry a stage —
    so the branch would otherwise ship unexercised."""
    text = render_bill_summary(bill(
        vote_count=3, tallied_count=3,
        stage_counts=[("Pateikimas", 2), (None, 1)],
    )).text
    assert "Dalies balsavimų stadijos šaltinis nenurodė." in text


def test_a_truncated_title_is_marked_not_quoted_whole():
    long_title = "Seimo nutarimo „Dėl " + "x" * 180
    assert len(long_title) == 200
    text = render_bill_summary(bill(title=long_title)).text
    assert "Pavadinimą šaltinis pateikia sutrumpintą" in text


# --- the gate ------------------------------------------------------------

def test_the_gate_passes_the_template_output():
    row = bill()
    assert verify(render_bill_summary(row), row) == []


def test_every_figure_traces_to_a_column():
    row = bill()
    s = render_bill_summary(row)
    for field_, value in s.figures():
        assert field_, f"figure {value!r} cites no column"


def test_an_invented_number_is_rejected():
    row = bill()
    s = render_bill_summary(row)
    tampered = s.text.replace("Ar projektas", "Iš 141 nario. Ar projektas")
    assert [v.kind for v in verify_rendered(tampered, s)] == ["unsupported_figure"]


def test_a_dropped_stage_count_is_rejected():
    """A rephrasing that loses „priėmimas – 1 balsavimas" describes a shorter
    passage than the record does."""
    row = bill()
    s = render_bill_summary(row)
    tampered = s.text.replace(", priėmimas – 1 balsavimas", "")
    kinds = [v.kind for v in verify_rendered(tampered, s)]
    assert "dropped_figure" in kinds


def test_the_registration_number_cannot_be_edited_away():
    """It travels verbatim and carries digits; the gate accounts for them
    where they occur so they cannot be spent on a claim."""
    row = bill()
    s = render_bill_summary(row)
    tampered = s.text.replace("XVP-1247(3)", "XVP-1247")
    assert "verbatim_altered" in [v.kind for v in verify_rendered(tampered, s)]
