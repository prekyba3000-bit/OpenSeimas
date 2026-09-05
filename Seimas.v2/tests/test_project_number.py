"""The rule that decides which number identifies the project a vote is about.

Every case here is a real string from production, not an invented one. The
defect this replaces was invisible precisely because the invented cases all
worked: a title that mentions exactly one „Nr." parses correctly under both the
old rule and the new one, and most hand-written examples look like that.
"""
from __future__ import annotations

import pytest

from pipeline.project_number import (
    ProjectNumber,
    base_of,
    from_attribute,
    from_title,
    project_title,
    resolve,
)


# Real agenda titles, taken from `votes` on 2026-09-05.
AMENDMENT = (
    "Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ir priedo pakeitimo "
    "įstatymo projektas (Nr. XVP-247)"
)
NESTED_QUOTES = (
    "Seimo nutarimo „Dėl Lietuvos Respublikos Seimo 2024 m. gruodžio 3 d. nutarimo "
    "Nr. XV-25 „Dėl Lietuvos Respublikos Seimo komitetų sudarymo“ pakeitimo“ "
    "projektas (Nr. XVP-1136)"
)
REVISED = (
    "Lietuvos nacionalinio radijo ir televizijos įstatymo Nr. I-1571 12, 13, 15 ir 17 "
    "straipsnių pakeitimo įstatymo projektas (Nr. XVP-1119(2))"
)
NO_PROJECT = "Seimo nutarimo „Dėl Seimo Peticijų komisijos išvados Nr. 250-I-1“ projektas"


class TestTheDefectItself:
    """The first „Nr." in a title is the law being amended. It is never the project."""

    def test_the_amended_law_is_not_taken_as_the_project(self):
        got = from_title(AMENDMENT)
        assert got == ProjectNumber("XVP-247", "XVP-247")
        assert got.registration != "XIII-804", "took the amended law, the original defect"

    def test_a_number_inside_nested_quotes_is_not_taken_either(self):
        # This title names XV-25 inside a quoted decision title before reaching
        # its own number. The old rule stored XV-25.
        assert from_title(NESTED_QUOTES) == ProjectNumber("XVP-1136", "XVP-1136")

    @pytest.mark.parametrize("law", ["XIII-804", "I-1489", "VIII-2043", "XV-25", "IX-569"])
    def test_enacted_law_numbers_are_never_project_numbers(self, law):
        """No trailing P. These five each stood for dozens of projects at once."""
        assert from_attribute(law) is None
        assert from_title(f"Kažkokio įstatymo Nr. {law} pakeitimo projektas") is None


class TestBaseAndRevision:
    """Two facts, kept apart. `XVP-851(2)` is the second version of project 851."""

    def test_a_revision_keeps_both_numbers(self):
        assert from_title(REVISED) == ProjectNumber("XVP-1119(2)", "XVP-1119")

    def test_base_of_strips_only_a_trailing_revision(self):
        assert base_of("XVP-851(2)") == "XVP-851"
        assert base_of("XVP-851") == "XVP-851"

    def test_an_unrevised_project_is_its_own_base(self):
        got = from_title(AMENDMENT)
        assert got.registration == got.base


class TestTheAttributeAsFallback:
    def test_a_clean_attribute_is_used_directly(self):
        assert resolve("XVP-105", None) == ProjectNumber("XVP-105", "XVP-105")

    def test_an_attribute_that_is_not_a_project_number_falls_through_to_the_title(self):
        # `registracijos_nr` also carries agenda ordinals like „250-I-1". Storing
        # those as project ids is how the column came to hold three kinds of
        # identifier at once.
        assert resolve("250-I-1", AMENDMENT) == ProjectNumber("XVP-247", "XVP-247")

    def test_case_and_stray_whitespace_are_normalised(self):
        assert resolve("  xvp-105 ", None) == ProjectNumber("XVP-105", "XVP-105")

    def test_nothing_anywhere_yields_nothing(self):
        assert resolve(None, NO_PROJECT) is None
        assert resolve("", "") is None

    def test_a_vote_with_no_project_is_not_guessed_at(self):
        """Procedural questions and question-groups are genuinely about no
        project. Inventing one for them is the failure mode being replaced."""
        assert from_title(NO_PROJECT) is None


class TestQuestionGroups:
    """A package vote is about several projects. Picking one is a guess."""

    GROUP = (
        "Klausimų grupė (2 - 11. 1, 2 - 11. 2): Ribojamųjų priemonių ... įstatymo "
        "projektas (Nr. XVP-1716) • Administracinių nusižengimų kodekso 542 straipsnio "
        "pakeitimo įstatymo projektas (Nr. XVP-1715)"
    )

    def test_a_question_group_resolves_to_no_single_project(self):
        assert resolve(None, self.GROUP) is None

    def test_it_does_not_silently_take_the_first_of_several(self):
        # from_title alone would return XVP-1716 — a real project, and an
        # arbitrary pick among the several this vote actually covered.
        assert from_title(self.GROUP) is not None
        assert resolve(None, self.GROUP) is None

    def test_an_ordinary_title_mentioning_a_group_elsewhere_is_unaffected(self):
        # Only a title that STARTS with the marker is a group.
        ordinary = "Seimo nutarimo dėl klausimų grupės sudarymo projektas (Nr. XVP-9)"
        assert resolve(None, ordinary) == ProjectNumber("XVP-9", "XVP-9")


class TestTruncatedTitles:
    """LRS clips titles at exactly 200 characters, and the number is last.

    588 of 5,286 production titles are clipped. The fragment left behind is
    often a REAL and unrelated project number, so accepting it files one
    document under another — the collapse this module exists to undo, recreated
    one level down. Found by reading the data, not by a failing test.
    """

    # Verbatim from production, clipped by the source at 200 characters.
    CLIPPED = (
        "Seimo nutarimo „Dėl Lietuvos Respublikos Seimo 2024 m. lapkričio 21 d. "
        "nutarimo Nr. XV-21 „Dėl Lietuvos Respublikos Seimo delegacijos NATO "
        "Parlamentinėje Asamblėjoje“ pakeitimo“ projektas (Nr. XVP-111"
    )

    def test_a_number_cut_off_mid_digit_is_refused(self):
        assert len(self.CLIPPED) == 200, "fixture is no longer the clipped string"
        assert from_title(self.CLIPPED) is None

    def test_the_fragment_would_have_been_a_real_other_project(self):
        # „XVP-111" is a VAT amendment. Without the closing-bracket requirement
        # a decision about NATO delegates would have been filed under it.
        assert from_title("Pridėtinės vertės mokesčio įstatymo projektas (Nr. XVP-111)") == (
            ProjectNumber("XVP-111", "XVP-111")
        )

    def test_a_closed_bracket_is_still_accepted(self):
        assert from_title(AMENDMENT) == ProjectNumber("XVP-247", "XVP-247")

    def test_a_revision_bracket_does_not_look_like_a_missing_close(self):
        assert from_title(REVISED) == ProjectNumber("XVP-1119(2)", "XVP-1119")


class TestTitleWinsOverAttribute:
    def test_the_revision_in_the_title_is_not_discarded(self):
        # The attribute never carries a revision; the title does on 415 votes.
        # Preferring the attribute would lose which version was voted on.
        assert resolve("XVP-1119", REVISED) == ProjectNumber("XVP-1119(2)", "XVP-1119")

    def test_the_attribute_still_covers_titles_with_no_bracketed_number(self):
        assert resolve("XVP-105", "Koks nors pavadinimas be numerio") == ProjectNumber(
            "XVP-105", "XVP-105"
        )


class TestProjectTitle:
    def test_the_trailing_number_is_stripped_for_the_legislation_row(self):
        assert project_title(AMENDMENT) == (
            "Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ir priedo "
            "pakeitimo įstatymo projektas"
        )

    def test_a_number_mid_sentence_is_left_alone(self):
        # Only a TRAILING bracket goes. The „Nr. XIII-804" above is part of the
        # law's name and removing it would damage the sentence.
        assert "Nr. XIII-804" in project_title(AMENDMENT)

    def test_internal_double_spacing_is_collapsed(self):
        # The feed spells the same title with one space and with two. Two rows
        # differing only by that would render as two different projects.
        assert project_title("Kažkokio  įstatymo   projektas (Nr. XVP-1)") == (
            "Kažkokio įstatymo projektas"
        )

    def test_a_title_that_is_only_a_number_yields_nothing_rather_than_empty(self):
        assert project_title("(Nr. XVP-247)") is None
        assert project_title("") is None
