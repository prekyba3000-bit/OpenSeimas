"""Session boundaries come from LRS, and an unfinished session stays unfinished.

The surface this feeds used to hold its own five-row array. Its current row read
`2026-03-10 → dabar` with an end date of 2099-12-31, while LRS recorded session
144 as ending 2026-07-14 — so 128 real votes sat under a spring session that had
closed, and the extraordinary session opening 2026-08-25 was not in the array at
all. A far-future end date is not a placeholder; it is an assertion.
"""
import datetime
from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app

SYNCED = datetime.datetime(2026, 8, 23, 9, 0, 0)
_SESSIONS = [
    {"seimas_session_id": 145, "number": 62, "name": "5 eilinė",
     "date_from": datetime.date(2026, 9, 10), "date_to": None, "synced_at": SYNCED},
    {"seimas_session_id": 146, "number": 61, "name": "neeilinė",
     "date_from": datetime.date(2026, 8, 25), "date_to": None, "synced_at": SYNCED},
    {"seimas_session_id": 144, "number": 60, "name": "4 eilinė",
     "date_from": datetime.date(2026, 3, 10),
     "date_to": datetime.date(2026, 7, 14), "synced_at": SYNCED},
]


def _fake_db(rows, table_exists=True):
    @contextmanager
    def fake_get_db():
        cur = MagicMock()

        def execute(sql, params=None):
            cur._one = {"t": "sessions" if table_exists else None}

        cur.execute.side_effect = execute
        cur.fetchone.side_effect = lambda: cur._one
        cur.fetchall.side_effect = lambda: rows
        conn, cm = MagicMock(), MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn.cursor.return_value = cm
        yield conn

    return fake_get_db


async def _get(monkeypatch, rows, table_exists=True, today=datetime.date(2026, 8, 23)):
    import backend.core as core_mod
    import backend.routes_meta as meta

    monkeypatch.setattr(core_mod, "get_db_conn", _fake_db(rows, table_exists))

    class _Date(datetime.date):
        @classmethod
        def today(cls):
            return today

    monkeypatch.setattr(meta.datetime, "date", _Date)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        return (await ac.get("/api/meta/sessions")).json()


@pytest.mark.asyncio
async def test_unfinished_session_reports_null_end_not_a_far_future_date(monkeypatch):
    body = await _get(monkeypatch, _SESSIONS)
    by_id = {s["id"]: s for s in body["sessions"]}

    assert by_id[146]["date_to"] is None
    assert by_id[145]["date_to"] is None
    # The specific lie being prevented.
    assert not any(
        (s["date_to"] or "").startswith(("2099", "9999")) for s in body["sessions"]
    )


@pytest.mark.asyncio
async def test_status_distinguishes_ended_sitting_and_upcoming(monkeypatch):
    body = await _get(monkeypatch, _SESSIONS)
    by_id = {s["id"]: s for s in body["sessions"]}

    # LRS closed 144 on 2026-07-14. It is over, whatever the old array said.
    assert by_id[144]["status"] == "ended"
    assert by_id[144]["date_to"] == "2026-07-14"
    # On 2026-08-23 the extraordinary session has not opened yet. It opens on
    # the 25th — one day before attendance v2 takes effect, which is why the
    # array that omitted it entirely mattered.
    assert by_id[146]["status"] == "upcoming"
    # Opens 2026-09-10 — not yet, and not folded into its predecessor.
    assert by_id[145]["status"] == "upcoming"


@pytest.mark.asyncio
async def test_session_reads_as_sitting_once_it_has_opened(monkeypatch):
    body = await _get(monkeypatch, _SESSIONS, today=datetime.date(2026, 8, 26))
    by_id = {s["id"]: s for s in body["sessions"]}
    assert by_id[146]["status"] == "sitting"
    assert by_id[145]["status"] == "upcoming"
    assert by_id[144]["status"] == "ended"


@pytest.mark.asyncio
async def test_a_session_that_has_not_started_is_never_sitting(monkeypatch):
    """Ordering bug guard: `date_to is None` alone would call 145 sitting."""
    body = await _get(monkeypatch, _SESSIONS, today=datetime.date(2026, 8, 23))
    assert {s["id"]: s["status"] for s in body["sessions"]}[145] == "upcoming"


@pytest.mark.asyncio
async def test_missing_table_reports_empty_not_error(monkeypatch):
    body = await _get(monkeypatch, [], table_exists=False)
    assert body["sessions"] == []
    assert body["source"] is None
