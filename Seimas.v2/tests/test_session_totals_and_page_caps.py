"""Session totals are counted, and public pages are bounded.

The sessions page counted its own totals in the browser from the first 2,600
votes `/api/votes` returned. There are 5,286. Sessions 140 and 139 — 1,517 and
391 votes — fell almost entirely outside that window, and the page published
the short numbers as session totals. A number presented as a total has to be
one, so the counting moved into SQL.

The same route was also unbounded: an anonymous caller could ask for every row
and get it, on one worker with a small pool.
"""
from __future__ import annotations

import datetime as dt
from contextlib import contextmanager
from unittest import mock

import backend.routes_public as rp
import backend.routes_meta as rm
from tests.degraded import empty_cursor


@contextmanager
def _db(cur):
    conn = mock.MagicMock()
    conn.cursor.return_value = cur
    conn.cursor.return_value.__enter__ = lambda s: cur
    conn.cursor.return_value.__exit__ = lambda s, *a: None
    yield conn


class _SessionsCursor:
    """Sessions with counts, or without a votes table at all."""

    def __init__(self, votes_table: bool):
        self._votes_table = votes_table
        self._rows: list = []

    def execute(self, sql, params=None):
        if "to_regclass" in sql and "sessions" in sql:
            self._rows = [{"t": "sessions"}]
        elif "to_regclass" in sql and "votes" in sql:
            self._rows = [{"t": "votes" if self._votes_table else None}]
        elif "GROUP BY s.seimas_session_id" in sql:
            self._rows = [{"sid": 144, "vote_count": 1812, "sitting_days": 29}]
        elif "FROM sessions" in sql:
            self._rows = [
                {"seimas_session_id": 144, "number": 60, "name": "4 eilinė",
                 "date_from": dt.date(2026, 3, 10), "date_to": dt.date(2026, 7, 14),
                 "synced_at": None},
                # A session LRS records that no vote falls in.
                {"seimas_session_id": 145, "number": 62, "name": "5 eilinė",
                 "date_from": dt.date(2026, 9, 10), "date_to": None,
                 "synced_at": None},
            ]
        else:
            self._rows = []

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_a_session_carries_its_own_complete_total():
    with mock.patch.object(rm, "get_db_conn", lambda: _db(_SessionsCursor(True))):
        out = rm.get_sessions()
    by_id = {s["id"]: s for s in out["sessions"]}
    assert by_id[144]["vote_count"] == 1812
    assert by_id[144]["sitting_days"] == 29


def test_a_session_no_vote_falls_in_reports_zero():
    """Zero is a fact about a session that has not opened. It must not be the
    same value as "we could not count"."""
    with mock.patch.object(rm, "get_db_conn", lambda: _db(_SessionsCursor(True))):
        out = rm.get_sessions()
    by_id = {s["id"]: s for s in out["sessions"]}
    assert by_id[145]["vote_count"] == 0
    assert by_id[145]["sitting_days"] == 0


def test_an_absent_votes_table_reports_unknown_not_zero():
    """§1.1. A session that met and decided nothing is a real thing; claiming
    it about every session because a table is missing is not."""
    with mock.patch.object(rm, "get_db_conn", lambda: _db(_SessionsCursor(False))):
        out = rm.get_sessions()
    for s in out["sessions"]:
        assert s["vote_count"] is None
        assert s["sitting_days"] is None


def test_the_public_vote_pages_are_bounded():
    assert rp._page_size(10_000_000) == rp.MAX_PAGE
    assert rp._page_size(50) == 50
    # A caller asking for nothing, or for a negative page, still gets a query
    # that terminates.
    assert rp._page_size(0) == 1
    assert rp._page_size(-1) == 1


def test_an_oversized_request_is_clamped_rather_than_rejected():
    """A 422 would break a caller doing nothing wrong; it wants as much as it
    can have."""
    captured: dict = {}
    cur = empty_cursor()
    real_execute = cur.execute

    def spy(sql, params=None):
        captured["params"] = params
        return real_execute(sql, params)

    cur.execute = spy
    with mock.patch.object(rp, "get_db_conn", lambda: _db(cur)):
        assert rp.get_votes(limit=99_999, offset=-5) == []
    assert captured["params"] == (rp.MAX_PAGE, 0)
