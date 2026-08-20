"""Vote tally parsing.

The LRS protocol totals element is the richest summary the source publishes per
vote, and the ingest discarded five sixths of it. These tests pin the parse, and
pin the two things it must refuse to do: invent zeros, and invent an outcome.
"""
import datetime

import pytest

from pipeline.ingest_votes_v2 import _parse_tallies


class FakeEl:
    """Minimal stand-in for an ElementTree element."""

    def __init__(self, **attrs):
        self._attrs = attrs

    def get(self, k):
        return self._attrs.get(k)


# The real element, copied from p2b.ad_sp_balsavimo_rezultatai?balsavimo_id=-59934
REAL = FakeEl(**{
    "balsavimo_laikas": "2026-07-14 14:23:05",
    "balsavo": "81", "viso": "140",
    "už": "73", "prieš": "1", "susilaikė": "7",
    "komentaras": "Elektroninėmis priemonėmis gauti individualūs balsavimo rezultatai "
                  "neatitinka protokole įrašytų suminių rezultatų",
})


def test_parses_a_real_element():
    t = _parse_tallies(REAL)
    assert t["votes_for"] == 73
    assert t["votes_against"] == 1
    assert t["votes_abstained"] == 7
    assert t["votes_participated"] == 81
    assert t["seats_eligible"] == 140
    assert t["voted_at"] == datetime.datetime(2026, 7, 14, 14, 23, 5)


def test_missing_element_yields_nulls_not_zeros():
    """A vote whose tally was never published must not look like a vote where
    nobody voted for it."""
    t = _parse_tallies(None)
    assert set(t.values()) == {None}


def test_absent_attributes_yield_none():
    t = _parse_tallies(FakeEl(komentaras="x"))
    assert t["votes_for"] is None
    assert t["seats_eligible"] is None
    assert t["voted_at"] is None


def test_empty_string_attribute_is_none_not_zero():
    t = _parse_tallies(FakeEl(**{"už": "", "prieš": "0"}))
    assert t["votes_for"] is None, "empty means unpublished"
    assert t["votes_against"] == 0, "an explicit 0 is a real tally"


def test_non_numeric_tally_does_not_crash():
    """A source anomaly must not take down the whole sitting."""
    t = _parse_tallies(FakeEl(**{"už": "n/a", "prieš": "2"}))
    assert t["votes_for"] is None
    assert t["votes_against"] == 2


def test_minute_precision_timestamp_accepted():
    t = _parse_tallies(FakeEl(balsavimo_laikas="2026-07-14 14:23"))
    assert t["voted_at"] == datetime.datetime(2026, 7, 14, 14, 23)


def test_unparseable_timestamp_is_none():
    assert _parse_tallies(FakeEl(balsavimo_laikas="liepos 14")) ["voted_at"] is None


def test_parser_never_returns_an_outcome():
    """The source has no pass/fail field. The parser must not manufacture one
    from the tallies — už > prieš is not the rule (constitutional laws need
    3/5), so a derived outcome would be wrong and would look recorded."""
    t = _parse_tallies(REAL)
    for key in t:
        assert "result" not in key and "outcome" not in key
    assert "73" and t["votes_for"] > t["votes_against"]  # lopsided, still no verdict


@pytest.mark.parametrize("attr,field", [
    ("už", "votes_for"),
    ("prieš", "votes_against"),
    ("susilaikė", "votes_abstained"),
    ("balsavo", "votes_participated"),
    ("viso", "seats_eligible"),
])
def test_each_lithuanian_attribute_maps(attr, field):
    """Diacritics in the attribute names are load-bearing — 'prieš' is not
    'pries'. A silent rename upstream would show up here."""
    assert _parse_tallies(FakeEl(**{attr: "5"}))[field] == 5
