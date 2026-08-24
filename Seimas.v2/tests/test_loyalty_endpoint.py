"""The loyalty endpoint publishes evidence, not a ranking.

Three defects, all measured against production before the change:

  * `float(x) if x else 100` — zero is falsy, so 28 of 11,809 rows recording a
    member who agreed with their party on *no* vote that day were published as
    100% aligned. The strongest possible disagreement became the strongest
    possible agreement.
  * the summary was sorted by alignment ascending and sliced to 50, so the
    response was a least-loyal league table of named people.
  * percentages travelled without their counts, so nothing downstream could
    show a reader what the number was made of.
"""
from contextlib import contextmanager
from unittest.mock import MagicMock
import datetime

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app

D = datetime.date


def _rows(*specs):
    out = []
    for name, date, pct, aligned, total in specs:
        out.append({
            "mp_id": f"id-{name}", "display_name": name, "current_party": "P",
            "sitting_date": date, "alignment_pct": pct,
            "aligned_votes": aligned, "votes_on_day": total,
        })
    return out


def _fake_db(rows, has_view=True):
    @contextmanager
    def fake_get_db():
        cur = MagicMock()
        # routes_forensics._table_exists reads row["reg"], not ["table_name"].
        cur.execute.side_effect = lambda sql, params=None: setattr(
            cur, "_one", {"reg": "faction_alignment" if has_view else None}
        )
        cur.fetchone.side_effect = lambda: cur._one
        cur.fetchall.side_effect = lambda: rows
        conn, cm = MagicMock(), MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn.cursor.return_value = cm
        yield conn
    return fake_get_db


async def _get(monkeypatch, rows, has_view=True):
    import backend.core as core_mod
    monkeypatch.setattr(core_mod, "get_db_conn", _fake_db(rows, has_view))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        return (await ac.get("/api/forensics/loyalty")).json()


@pytest.mark.asyncio
async def test_zero_alignment_is_not_published_as_one_hundred(monkeypatch):
    body = await _get(monkeypatch, _rows(("Aa", D(2026, 3, 10), 0, 0, 12)))
    mp = body["alignment"][0]
    assert mp["daily"][0]["alignment"] == 0
    assert mp["alignment_pct"] == 0
    assert mp["aligned_votes"] == 0 and mp["comparable_votes"] == 12


@pytest.mark.asyncio
async def test_a_null_day_stays_null(monkeypatch):
    body = await _get(monkeypatch, _rows(("Aa", D(2026, 3, 10), None, None, None)))
    assert body["alignment"][0]["daily"][0]["alignment"] is None
    # No comparable votes at all means no percentage, not zero and not 100.
    assert body["alignment"][0]["alignment_pct"] is None


@pytest.mark.asyncio
async def test_members_are_ordered_by_name_not_by_the_metric(monkeypatch):
    body = await _get(monkeypatch, _rows(
        ("Zebra", D(2026, 3, 10), 99, 99, 100),
        ("Ana", D(2026, 3, 10), 10, 10, 100),
        ("Milda", D(2026, 3, 10), 50, 50, 100),
    ))
    assert [m["name"] for m in body["alignment"]] == ["Ana", "Milda", "Zebra"]


@pytest.mark.asyncio
async def test_every_member_is_returned_not_a_bottom_slice(monkeypatch):
    specs = [(f"M{i:03}", D(2026, 3, 10), i % 100, i % 100, 100) for i in range(60)]
    body = await _get(monkeypatch, _rows(*specs))
    assert len(body["alignment"]) == 60
    assert body["total_mps"] == 60


@pytest.mark.asyncio
async def test_percentage_comes_from_summed_counts_not_a_mean_of_daily(monkeypatch):
    """A sitting day carries 1 to 124 votes. Averaging the daily percentages
    weighs a one-vote day like a hundred-vote one; in production the two differ
    by up to 4.1 points."""
    body = await _get(monkeypatch, _rows(
        ("Aa", D(2026, 3, 10), 100.0, 1, 1),      # perfect, but one vote
        ("Aa", D(2026, 3, 11), 50.0, 50, 100),    # half, on a hundred
    ))
    mp = body["alignment"][0]
    assert mp["aligned_votes"] == 51 and mp["comparable_votes"] == 101
    assert mp["alignment_pct"] == round(51 / 101 * 100, 2)   # 50.5
    assert mp["alignment_pct"] != 75.0                        # the mean of 100 and 50


@pytest.mark.asyncio
async def test_missing_view_reports_empty_not_error(monkeypatch):
    body = await _get(monkeypatch, [], has_view=False)
    assert body["alignment"] == [] and body["total_mps"] == 0
