"""Every path that serves attendance goes through the resolver.

Two things had to hold and only one did. `hero_engine` applied
`attendance_overrides()` after fetching, so `/api/v2/heroes/*` served v2 values
and suppressed members as null. `/api/mps` and
`/api/accountability/heroes-villains` read `mp_stats_summary` directly through
`COALESCE(attendance_percentage, 0)` and never called the resolver, which meant:

  * from 2026-08-26 the MP list would serve v1 while the profile served v2 —
    the same member reading two different attendances on two pages; and
  * the four members whose mandate covers fewer than three sitting days were
    served as `0.0`, which reads as "never showed up" rather than "not enough
    data".

The second is the one that matters to a citizen, and it is the pattern the
corrections log already names.
"""
from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend import core

SUPPRESSED_ID = "11111111-1111-1111-1111-111111111111"
NORMAL_ID = "22222222-2222-2222-2222-222222222222"

# What the v1 summary view holds: the suppressed member has no percentage.
_MP_ROWS = [
    {
        "id": SUPPRESSED_ID, "display_name": "Gabrielius Landsbergis",
        "full_name_normalized": "gabrielius landsbergis", "current_party": "TS-LKD",
        "is_active": False, "photo_url": None, "mandate_start_date": None,
        "mandate_end_date": None, "vote_count": 0, "attendance": None,
        "most_frequent_vote": None,
    },
    {
        "id": NORMAL_ID, "display_name": "Agnė Bilotaitė",
        "full_name_normalized": "agne bilotaite", "current_party": "TS-LKD",
        "is_active": True, "photo_url": None, "mandate_start_date": None,
        "mandate_end_date": None, "vote_count": 1420, "attendance": 70.97,
        "most_frequent_vote": "Už",
    },
]

# The override map the resolver builds: suppressed → None, normal → v2 value.
_OVERRIDES = [
    {"mp_id": SUPPRESSED_ID, "attendance_percentage": None, "eligible_days": 1},
    {"mp_id": NORMAL_ID, "attendance_percentage": 72.04, "eligible_days": 93},
]


def _fake_db(*, v2_in_force: bool):
    def _result(sql: str):
        if "information_schema.columns" in sql and "social_links" in sql:
            return None, None
        if "to_regclass" in sql:
            return {"reg": "public.mp_stats_summary"}, None
        if "information_schema.tables" in sql:
            return {"exists": True}, None
        if "FROM mp_attendance_v2" in sql:
            return None, _OVERRIDES
        if "methodology_versions" in sql:
            return {"v": 2 if v2_in_force else 1}, None
        if "FROM politicians p" in sql:
            return None, _MP_ROWS
        return None, []

    @contextmanager
    def fake_get_db():
        cur = MagicMock()

        def execute(sql, params=None):
            cur._row, cur._rows = _result(sql)

        cur.execute.side_effect = execute
        cur.fetchone.side_effect = lambda: cur._row
        cur.fetchall.side_effect = lambda: cur._rows
        cm = MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn = MagicMock()
        conn.cursor.return_value = cm
        yield conn

    return fake_get_db


async def _get_mps(monkeypatch, *, v2_in_force=True):
    monkeypatch.setattr(core, "get_db_conn", _fake_db(v2_in_force=v2_in_force))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        resp = await c.get("/api/mps?status=all")
    assert resp.status_code == 200, resp.text
    return {m["name"]: m for m in resp.json()}


@pytest.mark.asyncio
async def test_suppressed_member_is_null_not_zero(monkeypatch):
    """The whole point. 0.0 is a claim about a person; null is the absence of one."""
    mps = await _get_mps(monkeypatch)
    served = mps["Gabrielius Landsbergis"]["attendance"]
    assert served is None
    assert served != 0.0


@pytest.mark.asyncio
async def test_list_serves_the_v2_value_once_in_force(monkeypatch):
    """The list and the profile must not disagree about the same member."""
    mps = await _get_mps(monkeypatch, v2_in_force=True)
    assert mps["Agnė Bilotaitė"]["attendance"] == pytest.approx(72.04)


@pytest.mark.asyncio
async def test_list_serves_the_v1_value_before_the_switch(monkeypatch):
    """The switch is governed by the published methodology, not by deploy timing."""
    mps = await _get_mps(monkeypatch, v2_in_force=False)
    assert mps["Agnė Bilotaitė"]["attendance"] == pytest.approx(70.97)


@pytest.mark.asyncio
async def test_suppression_does_not_wait_for_the_switch(monkeypatch):
    """Suppression is not part of the v1→v2 formula change: a member with too
    few eligible days reads as 0% under *either* formula, which is false under
    both."""
    mps = await _get_mps(monkeypatch, v2_in_force=False)
    assert mps["Gabrielius Landsbergis"]["attendance"] is None


def test_no_endpoint_coalesces_attendance_to_zero():
    """Cheapest guard against the pattern returning: it is one SQL fragment,
    and it looks entirely reasonable in review."""
    import pathlib

    backend = pathlib.Path(__file__).resolve().parent.parent / "backend"
    offenders = []
    for path in backend.glob("routes_*.py"):
        text = path.read_text()
        if "COALESCE(s.attendance_percentage, 0)" in text or "COALESCE(attendance_percentage, 0)" in text:
            offenders.append(path.name)
    assert offenders == [], f"attendance coalesced to zero in: {offenders}"
