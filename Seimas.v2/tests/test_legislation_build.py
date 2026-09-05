"""What `legislation` gets filled with, and what it must refuse to invent.

The table held 0 rows for the life of the project. It is now built from the
sitting agendas already ingested, so these tests run against the real builder
with a stubbed cursor — no database, no network.
"""
from __future__ import annotations

from unittest import mock

from pipeline.ingest_legislation import collect


class _Cur:
    """A cursor that returns the rows given, in order."""

    def __init__(self, rows):
        self._rows = rows

    def execute(self, sql, params=None):
        pass

    def fetchall(self):
        return self._rows


def row(vote_id, title, project_id=None, date="2025-01-01"):
    return {
        "seimas_vote_id": vote_id,
        "project_id": project_id,
        "title": title,
        "sitting_date": date,
    }


AMENDMENT = (
    "Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ir priedo pakeitimo "
    "įstatymo projektas (Nr. XVP-247)"
)


def test_the_row_is_keyed_by_the_project_not_the_amended_law():
    titles, per_vote = collect(_Cur([row(1, AMENDMENT)]))
    assert list(titles) == ["XVP-247"], "keyed by the law being amended again"
    assert "XIII-804" not in titles


def test_the_trailing_number_is_not_part_of_the_stored_title():
    titles, _ = collect(_Cur([row(1, AMENDMENT)]))
    assert titles["XVP-247"].endswith("įstatymo projektas")
    assert "XVP-247" not in titles["XVP-247"]


def test_revisions_are_separate_rows():
    """XVP-1119 and XVP-1119(2) amend different articles and have different
    titles. One row for both would have to discard one of them."""
    titles, _ = collect(_Cur([
        row(1, "Įstatymo Nr. I-1571 13 straipsnio pakeitimo projektas (Nr. XVP-1119)"),
        row(2, "Įstatymo Nr. I-1571 12, 13 straipsnių pakeitimo projektas (Nr. XVP-1119(2))"),
    ]))
    assert set(titles) == {"XVP-1119", "XVP-1119(2)"}
    assert titles["XVP-1119"] != titles["XVP-1119(2)"]


def test_a_truncated_number_creates_no_row():
    """LRS clips titles at 200 characters and the number is last, so the
    fragment left behind can be a real and unrelated project."""
    clipped = (
        "Seimo nutarimo „Dėl Lietuvos Respublikos Seimo 2024 m. lapkričio 21 d. "
        "nutarimo Nr. XV-21 „Dėl Lietuvos Respublikos Seimo delegacijos NATO "
        "Parlamentinėje Asamblėjoje“ pakeitimo“ projektas (Nr. XVP-111"
    )
    assert len(clipped) == 200
    titles, per_vote = collect(_Cur([row(1, clipped)]))
    assert titles == {} and per_vote == {}


def test_a_question_group_creates_no_row():
    """A package vote covers several projects. Filing it under the first one
    named would be the same guess that produced the original defect."""
    group = (
        "Klausimų grupė (2 - 11. 1, 2 - 11. 2): Kažkokio įstatymo projektas "
        "(Nr. XVP-1716) • Kito įstatymo projektas (Nr. XVP-1715)"
    )
    titles, per_vote = collect(_Cur([row(1, group)]))
    assert titles == {} and per_vote == {}


def test_the_latest_spelling_wins_when_the_source_rewords_a_title():
    """13 of 1,683 projects are worded differently across stages. The rows are
    read in date order so the most recent wording is what remains."""
    titles, _ = collect(_Cur([
        row(1, "Seimo nutarimo „Dėl tarybos patvirtinimo“ projektas (Nr. XVP-1044(2))",
            date="2025-01-01"),
        row(2, "Seimo nutarimo „Dėl tarybos sudėties“ projektas (Nr. XVP-1044(2))",
            date="2025-06-01"),
    ]))
    assert "sudėties" in titles["XVP-1044(2)"]


def test_every_vote_that_resolves_gets_both_numbers():
    _, per_vote = collect(_Cur([
        row(1, "Kažkoks projektas (Nr. XVP-851(2))"),
    ]))
    assert per_vote[1].registration == "XVP-851(2)"
    assert per_vote[1].base == "XVP-851"


def test_no_summary_or_url_is_invented():
    """Nothing reachable publishes either. The columns stay NULL rather than
    carrying a plausible-looking link that has never been checked to resolve."""
    import inspect

    from pipeline import ingest_legislation

    source = inspect.getsource(ingest_legislation.run)
    assert "(reg, name, None, None)" in source, (
        "summary/url are no longer written as NULL — if a source for either was "
        "found, this test should be replaced, not deleted"
    )
