"""Attendance over time, and the three things a month can mean.

The aggregate figure answers "how often does this member turn up". It cannot
answer "is that changing", which is the question a citizen deciding how to vote
actually has. „Attendance rising across the term" is a reading the aggregate
makes impossible and a trajectory makes obvious.

Three states per bucket, deliberately distinct:

    eligible_days == 0    the Seimas did not sit — four such months this term.
                          Not the member's absence. Renders as a gap.
    0 < eligible < 3      too few sitting days for a percentage to mean
                          anything. Same floor as the aggregate (invariant 4).
    otherwise             days_present / eligible_days.
"""
from contextlib import contextmanager
from datetime import date
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend import core

MP = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def _fake_db(*, start, end, buckets):
    """`buckets` is [(date, eligible_days, days_present), ...] as the SQL returns."""

    def _result(sql):
        if "mandate_start_date, mandate_end_date FROM politicians" in sql:
            return {"mandate_start_date": start, "mandate_end_date": end}, None
        if "generate_series" in sql:
            return None, [
                {"bucket": b, "eligible_days": e, "days_present": p} for b, e, p in buckets
            ]
        return None, []

    @contextmanager
    def fake_get_db():
        cur = MagicMock()
        cur.execute.side_effect = lambda sql, params=None: setattr(
            cur, "_state", _result(sql)
        )
        cur.fetchone.side_effect = lambda: cur._state[0]
        cur.fetchall.side_effect = lambda: cur._state[1]
        cm = MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn = MagicMock()
        conn.cursor.return_value = cm
        yield conn

    return fake_get_db


async def _get(monkeypatch, **kw):
    monkeypatch.setattr(core, "get_db_conn", _fake_db(**kw))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get(f"/api/mps/{MP}/attendance-trajectory")
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_a_month_the_seimas_did_not_sit_is_a_gap_not_a_zero(monkeypatch):
    body = await _get(
        monkeypatch,
        start=date(2024, 11, 14),
        end=None,
        buckets=[(date(2024, 11, 1), 6, 5), (date(2024, 12, 1), 0, 0)],
    )
    recess = body["buckets"][1]
    assert recess["eligible_days"] == 0
    assert recess["attendance"] is None
    assert recess["attendance"] != 0


@pytest.mark.asyncio
async def test_too_few_sitting_days_is_suppressed_not_rounded(monkeypatch):
    """One sitting day yields 0% or 100%. Neither is information."""
    body = await _get(
        monkeypatch,
        start=date(2024, 11, 14),
        end=date(2024, 11, 14),
        buckets=[(date(2024, 11, 1), 1, 0)],
    )
    only = body["buckets"][0]
    assert only["eligible_days"] == 1
    assert only["days_present"] == 0
    # The case 0.0 would have lied about most loudly: present on zero of one day.
    assert only["attendance"] is None


@pytest.mark.asyncio
async def test_the_client_can_tell_a_gap_from_thin_data(monkeypatch):
    """Both suppress the percentage; they are not the same fact, so
    eligible_days travels and the client distinguishes them."""
    body = await _get(
        monkeypatch,
        start=date(2024, 11, 14),
        end=None,
        buckets=[(date(2024, 11, 1), 0, 0), (date(2024, 12, 1), 2, 1)],
    )
    gap, thin = body["buckets"]
    assert (gap["attendance"], thin["attendance"]) == (None, None)
    assert gap["eligible_days"] == 0 and thin["eligible_days"] == 2


@pytest.mark.asyncio
async def test_a_published_month_carries_its_own_denominator(monkeypatch):
    body = await _get(
        monkeypatch,
        start=date(2024, 11, 14),
        end=None,
        buckets=[(date(2024, 11, 1), 6, 5)],
    )
    b = body["buckets"][0]
    assert b == {
        "period": "2024-11",
        "eligible_days": 6,
        "days_present": 5,
        "attendance": 83.33,
    }


@pytest.mark.asyncio
async def test_unknown_member_is_404_not_an_empty_trajectory(monkeypatch):
    """An empty strip would read as "never attended anything"."""

    @contextmanager
    def no_such_mp():
        cur = MagicMock()
        cur.fetchone.return_value = None
        cm = MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn = MagicMock()
        conn.cursor.return_value = cm
        yield conn

    monkeypatch.setattr(core, "get_db_conn", no_such_mp)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get(f"/api/mps/{MP}/attendance-trajectory")
    assert resp.status_code == 404
