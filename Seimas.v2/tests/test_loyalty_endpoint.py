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
    """One row per member. The view aggregates now, so the endpoint no longer
    sees sitting days and cannot average percentages even by accident."""
    out = []
    for name, pct, aligned, comparable, *rest in specs:
        out.append({
            "mp_id": f"id-{name}", "display_name": name, "current_party": "P",
            "alignment_pct": pct, "aligned_votes": aligned,
            "comparable_votes": comparable,
            "suppression_reason": rest[0] if rest else None,
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
    """`float(x) if x else 100` published perfect agreement for a member who
    agreed on nothing, because 0 is falsy."""
    body = await _get(monkeypatch, _rows(("Aa", 0, 0, 12)))
    mp = body["alignment"][0]
    assert mp["alignment_pct"] == 0
    assert mp["aligned_votes"] == 0 and mp["comparable_votes"] == 12


@pytest.mark.asyncio
async def test_no_comparable_votes_stays_null(monkeypatch):
    body = await _get(monkeypatch, _rows(("Aa", None, 0, 0, "faction_too_small")))
    mp = body["alignment"][0]
    # Not zero and not 100: we did not measure, which is neither agreement nor
    # disagreement.
    assert mp["alignment_pct"] is None
    assert mp["suppression_reason"] == "faction_too_small"


@pytest.mark.asyncio
async def test_a_suppressed_member_is_still_returned(monkeypatch):
    """Dropping them would make the list shorter than the chamber, and a reader
    cannot ask about a row that is not there."""
    body = await _get(monkeypatch, _rows(
        ("Aa", 91.0, 91, 100),
        ("Bb", None, 0, 0, "faction_too_small"),
    ))
    assert [m["name"] for m in body["alignment"]] == ["Aa", "Bb"]
    assert body["total_mps"] == 2


@pytest.mark.asyncio
async def test_members_are_ordered_by_name_not_by_the_metric(monkeypatch):
    body = await _get(monkeypatch, _rows(
        ("Zebra", 99, 99, 100),
        ("Ana", 10, 10, 100),
        ("Milda", 50, 50, 100),
    ))
    assert [m["name"] for m in body["alignment"]] == ["Ana", "Milda", "Zebra"]


@pytest.mark.asyncio
async def test_every_member_is_returned_not_a_bottom_slice(monkeypatch):
    specs = [(f"M{i:03}", i % 100, i % 100, 100) for i in range(60)]
    body = await _get(monkeypatch, _rows(*specs))
    assert len(body["alignment"]) == 60
    assert body["total_mps"] == 60


@pytest.mark.asyncio
async def test_the_endpoint_publishes_counts_beside_every_percentage(monkeypatch):
    """A percentage without its denominator cannot be argued with. 91% of 100
    and 91% of 11 are different claims."""
    body = await _get(monkeypatch, _rows(("Aa", 50.5, 51, 101)))
    mp = body["alignment"][0]
    assert mp["aligned_votes"] == 51 and mp["comparable_votes"] == 101
    assert mp["alignment_pct"] == 50.5


@pytest.mark.asyncio
async def test_missing_view_reports_empty_not_error(monkeypatch):
    body = await _get(monkeypatch, [], has_view=False)
    assert body["alignment"] == [] and body["total_mps"] == 0


# --- agreement with a faction the member does not have -------------------

class _Cur:
    """Cursor stub returning one canned row per execute()."""

    def __init__(self, row):
        self._row = row

    def execute(self, *_a, **_k):
        pass

    def fetchone(self):
        return self._row


def test_no_comparable_basis_is_none_not_zero(monkeypatch):
    """0.0 means "agrees with his faction 0% of the time". For a member who
    sits in no faction that is not a low score, it is a sentence about a thing
    that does not exist. The Seimo Pirmininkas steps out of his faction, and
    the SQL join can never match him because NULL never equals NULL."""
    from backend import hero_engine

    monkeypatch.setattr(hero_engine, "_table_exists", lambda *a, **k: False)
    assert hero_engine._fetch_party_loyalty("x", _Cur(None)) is None
    assert hero_engine._fetch_party_loyalty("x", _Cur({"party_loyalty": None})) is None


def test_a_real_figure_still_comes_through(monkeypatch):
    from backend import hero_engine

    monkeypatch.setattr(hero_engine, "_table_exists", lambda *a, **k: False)
    assert hero_engine._fetch_party_loyalty("x", _Cur({"party_loyalty": 75.84})) == 75.84


def test_missing_loyalty_is_not_inverted_into_independence():
    """`100 - None` would crash; `100 - 0` is worse — it turns "we cannot
    measure this" into a perfect independence score and pays an integrity bonus
    for it. Both breakdown paths must agree."""
    from backend.hero_engine import _build_forensic_breakdown_fast

    row = {"mp_id": "x", "display_name": "Testas"}
    out = _build_forensic_breakdown_fast(row, None)
    bonus = out["loyalty_bonus"]
    assert bonus["status"] == "unavailable"
    assert bonus["bonus"] == 0
    assert bonus["independent_voting_days_pct"] is None


def test_present_loyalty_still_scores_the_bonus():
    from backend.hero_engine import _build_forensic_breakdown_fast

    row = {"mp_id": "x", "display_name": "Testas"}
    # 75% agreement -> 25% independent, inside the calibrated 10-40% band.
    out = _build_forensic_breakdown_fast(row, 75.0)
    assert out["loyalty_bonus"]["status"] == "warning"
    assert out["loyalty_bonus"]["bonus"] == 10
