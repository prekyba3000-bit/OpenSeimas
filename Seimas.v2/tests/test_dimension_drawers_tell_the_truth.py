"""The „Kaip skaičiuojama?" drawers state what the engine computes.

Evaluation CORF-03 (2026-11-22). The drawers described what the dimensions
were meant to measure: „Viešumas" as speeches relative to the top speaker,
„Patirtis ir aktyvumas" as terms served plus votes. The engine gives half of
visibility to a social-media term with no data, and a fifth of experience to
an amendment term with no data — so the top speaker read 50 and nobody could
pass 80, under drawers that implied 100.

The human chose to make the drawers true rather than change the computation.
This pins the two together: if a coefficient or a data source changes, the
ceiling changes, and this test fails until the drawer says so.
"""
from __future__ import annotations

import pathlib
import re

from backend import hero_engine as he

EXPLAINERS = (
    pathlib.Path(__file__).resolve().parent.parent
    / "dashboard" / "src" / "utils" / "dimensionExplainers.ts"
).read_text(encoding="utf-8")


def _drawer(key: str) -> str:
    m = re.search(rf"\n  {key}: \{{(.*?)\n  \}},", EXPLAINERS, re.S)
    assert m, f"no drawer for {key}"
    return m.group(1)


def test_the_top_speaker_reads_50_and_the_drawer_says_so():
    # The bulk path hard-codes social_bonus = 0.0; the profile path finds no
    # social column. Either way the top speaker scores 50 on the 0–100 scale.
    assert he.score_visibility(187, 187, 0.0) == 50
    assert "50 iš 100" in _drawer("visibility")


def test_the_visibility_drawer_names_every_input():
    text = _drawer("visibility")
    for needle in ("posėdyje", "du kartus", "pranešimas spaudai", "socialiniuose tinkluose"):
        assert needle in text, needle


def test_nobody_can_pass_80_on_experience_and_the_drawer_says_so():
    # Maximum on every input that has data; the amendment term has none.
    assert round(he.score_experience(2.0, 2.0, 2900, 2900, 0, 0), 6) == 80
    assert "80 iš 100" in _drawer("experience")


def test_the_experience_drawer_names_every_input_and_weight():
    text = _drawer("experience")
    for needle in ("pirmo nario balso", "30 %", "atiduotų balsų", "20 %", "pataisų"):
        assert needle in text, needle
    # What it used to claim, and does not compute.
    assert "kadencijų skaičius" not in text


def test_the_legislative_drawer_states_the_weights():
    # 0.6 / 0.4 in score_legislative.
    assert he.score_legislative(1, 1, 0, 1) == 60
    text = _drawer("legislativeActivity")
    assert "60 %" in text and "40 %" in text
