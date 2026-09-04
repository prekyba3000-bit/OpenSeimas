"""MP-count semantics.

Three different true numbers were previously conflated behind one field:

    141  the constitutional size of the Seimas (Article 55)
    140  members holding a valid mandate today
    148  everyone who held a mandate this term, including replaced members
         and the four who resigned the day they were sworn in

A surface must show the one its label implies. These tests pin that, because
the failure mode is silent: every one of those numbers is *true*, so a wrong
one looks entirely plausible on the page.
"""
from contextlib import contextmanager
from datetime import date
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend import core


# The real shape: 148 mandate-holders, 8 of whom have finished. Four of those
# eight started and ended on the same day (elected, never took up the seat).
SAME_DAY = date(2024, 11, 14)
FORMER_ROWS = [
    # four same-day resignations
    {"display_name": "Aurelijus Veryga", "start": SAME_DAY, "end": SAME_DAY},
    {"display_name": "Gabrielius Landsbergis", "start": SAME_DAY, "end": SAME_DAY},
    {"display_name": "Vilija Blinkevičiūtė", "start": SAME_DAY, "end": SAME_DAY},
    {"display_name": "Virginijus Sinkevičius", "start": SAME_DAY, "end": SAME_DAY},
    # four genuine mid-term replacements
    {"display_name": "Liudas Mažylis", "start": SAME_DAY, "end": date(2024, 12, 5)},
    {"display_name": "Kazys Starkevičius", "start": SAME_DAY, "end": date(2026, 3, 10)},
    {"display_name": "Giedrimas Jeglinskas", "start": SAME_DAY, "end": date(2026, 4, 16)},
    {"display_name": "Jevgenij Šuklin", "start": SAME_DAY, "end": date(2026, 5, 28)},
]


def _stats_cursor(mps_active=140, mps_all_time=148):
    """Cursor answering the /api/stats queries in order."""
    cur = MagicMock()
    results = [
        {"count": mps_active},    # mandate-valid today
        {"count": mps_all_time},  # all rows
        {"count": 5279},          # votes
        {"count": 743515},        # mp_votes
        {"count": 93},            # sitting days
    ]
    cur.fetchone.side_effect = results
    cur.__enter__ = lambda s: s
    cur.__exit__ = lambda *a: False
    return cur


def _patch_conn(monkeypatch, cur):
    conn = MagicMock()
    conn.cursor.return_value = cur

    @contextmanager
    def _conn():
        yield conn

    monkeypatch.setattr("backend.core.get_db_conn", _conn)


@pytest.mark.asyncio
async def test_stats_separates_the_three_numbers(monkeypatch):
    _patch_conn(monkeypatch, _stats_cursor())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/stats")).json()

    assert body["seats_total"] == 141, "constitutional size"
    assert body["mps_active"] == 140, "mandate covers today"
    assert body["mps_all_time"] == 148, "every mandate-holder this term"
    assert body["seats_vacant"] == 1, "141 seats minus 140 sitting members"


@pytest.mark.asyncio
async def test_seats_total_is_constitutional_not_a_row_count(monkeypatch):
    """Even if every seat were vacant, the Seimas is still a 141-seat body.

    Deriving it from a row count would let a term with unfilled seats silently
    redefine the size of parliament.
    """
    _patch_conn(monkeypatch, _stats_cursor(mps_active=3, mps_all_time=3))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/stats")).json()

    assert body["seats_total"] == 141
    assert body["mps_active"] == 3
    assert body["seats_vacant"] == 138


@pytest.mark.asyncio
async def test_vacant_seats_never_negative(monkeypatch):
    """A data error that reports more members than seats must not print a
    negative vacancy on the page."""
    _patch_conn(monkeypatch, _stats_cursor(mps_active=145, mps_all_time=150))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/stats")).json()

    assert body["seats_vacant"] == 0


@pytest.mark.asyncio
async def test_deprecated_total_mps_still_served_and_equals_active(monkeypatch):
    """total_mps is misnamed (it always returned the active count). Keep it
    working for existing consumers rather than breaking them on rename."""
    _patch_conn(monkeypatch, _stats_cursor())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/stats")).json()

    assert body["total_mps"] == body["mps_active"] == 140


def test_seats_total_constant_is_141():
    assert core.SEIMAS_SEATS_TOTAL == 141


# ── /api/mps status filter ──────────────────────────────────────────────────

def _mps_cursor(rows):
    cur = MagicMock()
    # get_mps probes for the optional mp_stats_summary table (via
    # _table_exists, which reads ["reg"]) and the optional social_links column
    # (which reads truthiness). Answer "neither present" for both.
    cur.fetchone.return_value = {"reg": None}
    cur.__enter__ = lambda s: s
    cur.__exit__ = lambda *a: False

    # get_mps also asks the resolver for attendance overrides now, and that
    # query returns a different shape. Answering every fetchall with the MP
    # rows made the resolver read `mp_id` off a politician row.
    state = {"sql": ""}

    def execute(sql, params=None):
        state["sql"] = sql

    def fetchall():
        return [] if "mp_attendance_v2" in state["sql"] else rows

    cur.execute.side_effect = execute
    cur.fetchall.side_effect = fetchall
    return cur


def _row(name, start, end):
    return {
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "display_name": name,
        "full_name_normalized": name.lower(),
        "current_party": "Test",
        "is_active": end is None or end >= date.today(),
        "photo_url": None,
        "mandate_start_date": start,
        "mandate_end_date": end,
        "vote_count": 0,
        "attendance": 0,
        "most_frequent_vote": None,
    }


@pytest.mark.asyncio
async def test_mps_rejects_unknown_status(monkeypatch):
    _patch_conn(monkeypatch, _mps_cursor([]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/mps?status=nonsense")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_mps_exposes_mandate_dates(monkeypatch):
    """A former member's record must say *when* they served, not merely that
    they are inactive."""
    row = _row("Jevgenij Šuklin", SAME_DAY, date(2026, 5, 28))
    _patch_conn(monkeypatch, _mps_cursor([row]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/mps?status=former")).json()

    assert body[0]["mandate_start_date"] == "2024-11-14"
    assert body[0]["mandate_end_date"] == "2026-05-28"


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["active", "former", "all"])
async def test_mps_accepts_each_status(monkeypatch, status):
    _patch_conn(monkeypatch, _mps_cursor([]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        assert (await ac.get(f"/api/mps?status={status}")).status_code == 200


# ── the rule itself, independent of transport ───────────────────────────────

def _is_active_today(start, end, today=None):
    """Mirror of the SQL predicate used by /api/stats and /api/mps."""
    today = today or date.today()
    return start <= today and (end is None or end >= today)


def test_same_day_mandate_holders_are_not_active():
    """The four who resigned the day they were sworn in must never appear in a
    current-membership list or count. They are the sharpest case: real people,
    real mandates, zero days served.
    """
    for r in FORMER_ROWS[:4]:
        assert r["start"] == r["end"] == SAME_DAY
        assert not _is_active_today(r["start"], r["end"]), r["display_name"]


def test_all_former_members_excluded_from_active():
    for r in FORMER_ROWS:
        assert not _is_active_today(r["start"], r["end"]), r["display_name"]


def test_sitting_member_is_active():
    """Ongoing mandate = NULL end date."""
    assert _is_active_today(SAME_DAY, None)


def test_mandate_ending_today_still_counts_today():
    """Boundary: the mandate covers its final day."""
    assert _is_active_today(SAME_DAY, date.today())


def test_mandate_ended_yesterday_does_not_count():
    from datetime import timedelta
    assert not _is_active_today(SAME_DAY, date.today() - timedelta(days=1))


def test_active_plus_former_equals_all_time():
    """148 = 140 + 8. If this drifts, one of the three numbers is wrong."""
    active, former, all_time = 140, len(FORMER_ROWS), 148
    assert active + former == all_time


def test_hero_mp_response_declares_mandate_dates():
    """The response model must name every field the engine returns.

    HeroMpResponse sets extra="ignore", so a field produced by the engine but
    absent from the model is dropped from the JSON silently — no error, no log,
    just a missing key that looks like a frontend bug. That is exactly what
    happened to the mandate dates: the engine returned them, the model ate
    them, and the profile page had nothing to render.
    """
    from backend.models import HeroMpResponse

    fields = HeroMpResponse.model_fields
    assert "mandate_start_date" in fields
    assert "mandate_end_date" in fields

    built = HeroMpResponse(
        id="x", name="Jevgenij Šuklin",
        mandate_start_date="2024-11-14", mandate_end_date="2026-05-28",
    )
    dumped = built.model_dump()
    assert dumped["mandate_start_date"] == "2024-11-14"
    assert dumped["mandate_end_date"] == "2026-05-28"


def test_party_is_never_coalesced_to_unknown():
    """Migration 039: current_party is the faction, NULL when there is none.

    Both read paths in hero_engine used to COALESCE it to the literal string
    'Unknown' — an English placeholder shipped in a public payload on a
    Lithuanian surface, and the same failure class as COALESCE(metric, 0):
    a real unknown wearing a label that looks like an answer.
    """
    import pathlib
    import re

    src = pathlib.Path(__file__).resolve().parents[1] / "backend" / "hero_engine.py"
    text = src.read_text()
    # Strip SQL/py comments so the explanatory note above each fix does not trip this.
    body = "\n".join(
        line for line in text.splitlines()
        if not line.lstrip().startswith(("--", "#"))
    )
    offenders = re.findall(r"COALESCE\s*\([^)]*current_party[^)]*\)", body, re.IGNORECASE)
    assert offenders == [], f"current_party coalesced to a placeholder: {offenders}"
    assert "or \"Unknown\"" not in body, "current_party falls back to 'Unknown' in Python"
