"""The list and the profile divide by the same numbers.

Charter §1.4: one source of truth per metric, and the agreement test between
list and profile is permanent. There was no such test, and on 2026-09-07 the
two disagreed in production — one member's published `experience` dimension
read 12.35 on the profile and 61.98 on the leaderboard, on the same day, from
the same database.

Every published dimension is a normalized score: a member's value divided by
the cohort maximum. So the maxima are the agreement. `_fetch_metric_maxima`
computed its own set in SQL over every row of `politicians`, with
`COALESCE(0, 0) AS max_years_in_parliament` — a literal zero, which
`_normalize` maps to 0.0, deleting the seniority half of `experience` from the
profile while the leaderboard's real maximum kept it there.
"""
from __future__ import annotations

import datetime as dt
import re
from unittest import mock

from backend import hero_engine as he

TODAY = dt.date.today()

ROWS = [
    {
        "mp_id": "a", "is_active": True,
        "bills_authored_count": 4, "committee_leadership_roles": 1,
        "speeches_given": 120, "amendment_votes": 30,
        "amendments_proposed_count": 7, "total_votes_cast": 900,
        "first_vote_date": TODAY - dt.timedelta(days=365 * 12),
    },
    {
        "mp_id": "b", "is_active": True,
        "bills_authored_count": 16, "committee_leadership_roles": 0,
        "speeches_given": 40, "amendment_votes": 9,
        "amendments_proposed_count": 2, "total_votes_cast": 1500,
        # A member with no recorded vote yet — must not poison the maximum.
        "first_vote_date": None,
    },
]

SHARED = (
    "max_bills_authored", "max_committee_leadership", "max_speeches_given",
    "max_amendments_proposed_proxy", "max_amendments_proposed_count",
    "max_total_votes_cast", "max_years_in_parliament",
)


class _MatviewCursor:
    """A cursor that has the leaderboard view and nothing else."""

    def __init__(self, rows):
        self._rows = rows
        self._pending = None

    def execute(self, sql, params=None):
        if "to_regclass" in sql:
            self._pending = [{"t": "mp_leaderboard_metrics"}]
        elif "mp_leaderboard_metrics" in sql:
            self._pending = list(self._rows)
        else:
            # amendment_profiles existence probe and anything else: absent.
            self._pending = [{"exists": False, "t": None}]

    def fetchone(self):
        return self._pending[0] if self._pending else None

    def fetchall(self):
        return list(self._pending or [])


def test_the_profile_divides_by_the_same_maxima_as_the_list():
    """The one assertion that would have caught the production disagreement."""
    with mock.patch.object(he, "_table_exists", lambda cur, name: False):
        profile_maxima = he._fetch_metric_maxima(_MatviewCursor(ROWS))
    list_maxima = he._maxima_from_rows(ROWS)
    for key in SHARED:
        assert profile_maxima[key] == list_maxima[key], key


def test_seniority_is_not_normalized_against_zero():
    """The specific defect: a maximum of 0 makes `_normalize` return 0.0, so
    half of `experience` disappears without any value looking wrong."""
    maxima = he._maxima_from_rows(ROWS)
    assert maxima["max_years_in_parliament"] > 11
    assert he._normalize(6.0, maxima["max_years_in_parliament"]) > 0


def test_a_member_with_no_recorded_vote_does_not_set_the_maximum():
    """`_years_since(None)` is 0.0, which is correct as a member's value and
    would be wrong as the cohort's."""
    assert he._maxima_from_rows([ROWS[1]])["max_years_in_parliament"] == 0.0


def test_experience_scores_identically_on_both_paths_for_one_member():
    """Agreement asserted through the scorer, not only the inputs."""
    with mock.patch.object(he, "_table_exists", lambda cur, name: False):
        profile_maxima = he._fetch_metric_maxima(_MatviewCursor(ROWS))
    list_maxima = he._maxima_from_rows(ROWS)
    row = ROWS[0]
    args = lambda m: (
        he._years_since(row["first_vote_date"]), m["max_years_in_parliament"],
        float(row["total_votes_cast"]), m["max_total_votes_cast"],
        float(row["amendments_proposed_count"]), m["max_amendments_proposed_count"],
    )
    assert he.score_experience(*args(profile_maxima)) == he.score_experience(*args(list_maxima))


def test_no_maximum_is_a_hardcoded_constant():
    """`COALESCE(0, 0) AS max_years_in_parliament` compiled, ran, and returned a
    number for months. A constant standing in for a cohort maximum is not a
    typo class that a value check finds — it produces a plausible score."""
    import inspect

    source = inspect.getsource(he._fetch_metric_maxima)
    aliases = re.findall(r"AS\s+(max_\w+|earliest_\w+)", source)
    assert aliases, "the fallback query stopped aliasing its maxima"
    for match in re.finditer(r"AS\s+(?:max_\w+|earliest_\w+)", source):
        clause = source[source.rfind("\n", 0, match.start()):match.end()]
        assert re.search(r"\b(MAX|MIN)\s*\(", clause), (
            f"a cohort maximum that queries nothing: {clause.strip()}"
        )


def test_one_predicate_decides_whether_a_choice_was_recorded():
    """Migration 015 exists because `!= 'Nedalyvavo'` counted LRS's empty
    `kaip_balsavo=""` as a vote, showing every member 100% attendance. It
    fixed the two materialized views and left six copies of the same
    expression in hero_engine.py, so the leaderboard and the profile ran
    different definitions of participation until 2026-09-07."""
    import inspect

    source = inspect.getsource(he)
    # Comments stripped first: the constant's own docstring quotes the old
    # predicate, and a guard that forbids writing down what was fixed pushes
    # the project toward forgetting why.
    code = re.sub(r"^\s*#.*$", "", source, flags=re.M)
    assert "!~* '^nedalyvavo$'" not in code, (
        "the pre-015 participation predicate is back in the engine"
    )
    # Deferred to, not retyped: six copies drifting from the views is exactly
    # how this happened.
    assert source.count("_CHOICE_RECORDED = (") == 1
    assert source.count("{_CHOICE_RECORDED}") >= 6


def test_the_engine_predicate_matches_the_materialized_view_definition():
    """Same three values, whatever the spelling. The view uses
    `LIKE 'susilaik%'` and the engine `~ '^susilaik'` — identical matches, and
    the engine avoids the `%` because psycopg2 interpolates parameterized
    queries whole."""
    view = (
        __import__("pathlib").Path(he.__file__).resolve().parent.parent
        / "migrations" / "015_fix_cast_vote_filter.sql"
    ).read_text()
    assert "IN ('už', 'uz', 'prieš', 'pries')" in view
    assert "IN ('už', 'uz', 'prieš', 'pries')" in he._CHOICE_RECORDED
    assert "LIKE 'susilaik%'" in view
    assert "~ '^susilaik'" in he._CHOICE_RECORDED
    assert "%" not in he._CHOICE_RECORDED
