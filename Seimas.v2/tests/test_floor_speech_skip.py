"""The skip rule for already-read sittings.

The optimisation removes ~172 of 177 HTTP requests per run, which is only safe
if it skips exactly the sittings where re-reading has been observed to find
nothing. Every other case must fall through to a re-read, so each assertion
below is a way the assumption could be wrong.
"""
import datetime as dt

from pipeline.ingest_floor_speeches import SETTLED_AFTER_DAYS, _as_date, should_skip

SETTLED = str(dt.date.today() - dt.timedelta(days=SETTLED_AFTER_DAYS + 30))
RECENT = str(dt.date.today())

# posedis_id -> (stenogram_present, turns_seen, sitting_date)
STATE = {
    "-1": (True, 42, None),    # read, had a stenogram, yielded turns
    "-2": (False, 0, None),    # no stenogram — may gain one later
    "-3": (True, 0, None),     # stenogram but no turns — may be an early read
}


def test_a_settled_sitting_that_yielded_turns_is_skipped():
    assert should_skip("-1", SETTLED, STATE, False) is True


def test_a_recent_sitting_is_never_skipped():
    """A stenogram can be revised shortly after the sitting."""
    assert should_skip("-1", RECENT, STATE, False) is False


def test_a_sitting_without_a_stenogram_is_never_skipped():
    """Two sittings on the 2026-08-25 catch-up had none; they may gain one."""
    assert should_skip("-2", SETTLED, STATE, False) is False


def test_a_sitting_that_yielded_no_turns_is_never_skipped():
    """Zero turns may mean we read it too early, not that nobody spoke."""
    assert should_skip("-3", SETTLED, STATE, False) is False


def test_an_unseen_sitting_is_never_skipped():
    assert should_skip("-999", SETTLED, STATE, False) is False


def test_full_flag_overrides_every_skip():
    assert should_skip("-1", SETTLED, STATE, True) is False


def test_an_unparseable_date_is_never_skipped():
    """The feed sends `pradzia` as a string. An unreadable one must mean
    'read it again', never 'assume it is settled' — the first version of this
    compared a str to a date and raised instead of deciding."""
    assert should_skip("-1", "not a date", STATE, False) is False
    assert should_skip("-1", None, STATE, False) is False


def test_as_date_accepts_what_the_feed_actually_sends():
    assert _as_date("2024-12-19 10:00") == dt.date(2024, 12, 19)
    assert _as_date(dt.datetime(2024, 12, 19, 10, 0)) == dt.date(2024, 12, 19)
    assert _as_date(dt.date(2024, 12, 19)) == dt.date(2024, 12, 19)
    assert _as_date(None) is None
    assert _as_date("nonsense") is None


def test_the_grace_window_is_generous_enough_to_be_safe():
    """A boundary this tight would be a bug; assert the intent, not the value."""
    assert SETTLED_AFTER_DAYS >= 7
