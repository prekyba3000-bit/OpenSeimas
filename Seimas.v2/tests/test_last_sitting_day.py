"""The landing page's primacy strip, and the one number it must not invent.

The strip states what happened on the most recent day the Seimas voted. Two of
its three facts are counted from rows (`vote_count`, `mps_present`); the third
— how many motions passed — has no source. `votes.result_type` is NULL on
every row because the LRS results feed publishes tallies and no pass/fail
field, so the endpoint returns `outcomes: None` and the client renders nothing
rather than "0 priimta".
"""
from contextlib import contextmanager
from unittest.mock import MagicMock

import datetime

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


def _fake_db(*, sitting_date, vote_count, mps_present, decided=0):
    """Cursor mock keyed on distinctive fragments of each query."""

    def _row_for(sql):
        if "MAX(sitting_date)" in sql:
            return {"d": sitting_date}
        if "COUNT(DISTINCT mv.politician_id)" in sql:
            return {"n": mps_present}
        if "result_type IS NOT NULL" in sql:
            return {"decided": decided}
        if "COUNT(*) AS n FROM votes" in sql:
            return {"n": vote_count}
        raise AssertionError(f"unexpected query: {sql}")

    @contextmanager
    def fake_get_db():
        cur = MagicMock()
        cur.execute.side_effect = lambda sql, params=None: setattr(
            cur, "_row", _row_for(sql)
        )
        cur.fetchone.side_effect = lambda: cur._row
        cm = MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn = MagicMock()
        conn.cursor.return_value = cm
        yield conn

    return fake_get_db


async def _get(monkeypatch, **kwargs):
    import backend.core as core_mod

    monkeypatch.setattr(core_mod, "get_db_conn", _fake_db(**kwargs))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get("/api/meta/last-sitting-day")


@pytest.mark.asyncio
async def test_reports_counted_facts(monkeypatch):
    resp = await _get(
        monkeypatch,
        sitting_date=datetime.date.today() - datetime.timedelta(days=3),
        vote_count=61,
        mps_present=127,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["vote_count"] == 61
    assert body["mps_present"] == 127
    assert body["days_since"] == 3


@pytest.mark.asyncio
async def test_outcomes_are_null_when_nothing_is_decided(monkeypatch):
    """The whole point. No result_type anywhere means no outcome line — not a
    line of zeroes, which would read as 'nothing passed today'."""
    resp = await _get(
        monkeypatch,
        sitting_date=datetime.date.today(),
        vote_count=61,
        mps_present=127,
        decided=0,
    )
    assert resp.json()["outcomes"] is None


@pytest.mark.asyncio
async def test_outcomes_appear_once_the_source_provides_them(monkeypatch):
    """Guards the other direction: when result_type is populated the strip must
    start reporting it, so this endpoint does not quietly stay silent forever."""
    resp = await _get(
        monkeypatch,
        sitting_date=datetime.date.today(),
        vote_count=61,
        mps_present=127,
        decided=7,
    )
    assert resp.json()["outcomes"] == {"decided": 7}


@pytest.mark.asyncio
async def test_recess_flag_flips_past_the_threshold(monkeypatch):
    from backend.routes_meta import RECESS_AFTER_DAYS

    recent = await _get(
        monkeypatch,
        sitting_date=datetime.date.today() - datetime.timedelta(days=RECESS_AFTER_DAYS),
        vote_count=1,
        mps_present=1,
    )
    assert recent.json()["is_recess"] is False

    stale = await _get(
        monkeypatch,
        sitting_date=datetime.date.today() - datetime.timedelta(days=RECESS_AFTER_DAYS + 1),
        vote_count=1,
        mps_present=1,
    )
    assert stale.json()["is_recess"] is True


@pytest.mark.asyncio
async def test_empty_database_does_not_invent_a_sitting_day(monkeypatch):
    resp = await _get(monkeypatch, sitting_date=None, vote_count=0, mps_present=0)
    body = resp.json()
    assert body["sitting_date"] is None
    assert body["days_since"] is None
    assert body["is_recess"] is False
