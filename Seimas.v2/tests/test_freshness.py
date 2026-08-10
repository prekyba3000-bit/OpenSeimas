from contextlib import contextmanager
from unittest.mock import MagicMock

import datetime

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


def _fake_cursor(rows_by_table):
    """Cursor mock: each freshness query 'FROM <table>' returns the queued row."""
    cur = MagicMock()

    def execute(sql, params=None):
        for table, row in rows_by_table.items():
            if f"FROM {table}" in sql:
                cur._current_row = row
                return
        cur._current_row = {"row_count": 0, "latest": None}

    cur.execute.side_effect = execute
    cur.fetchone.side_effect = lambda: cur._current_row
    return cur


def _fake_db(rows_by_table):
    @contextmanager
    def fake_get_db():
        conn = MagicMock()
        cm = MagicMock()
        cm.__enter__.return_value = _fake_cursor(rows_by_table)
        cm.__exit__.return_value = None
        conn.cursor.return_value = cm
        yield conn

    return fake_get_db


_ROWS = {
    "politicians": {"row_count": 141, "latest": datetime.datetime(2026, 7, 20, 8, 30, 0)},
    "votes": {"row_count": 5432, "latest": datetime.date(2026, 7, 17)},
    "mp_votes": {"row_count": 700000, "latest": None},
    "assets": {"row_count": 900, "latest": datetime.datetime(2026, 1, 5, 12, 0, 0)},
    "interests": {"row_count": 1200, "latest": datetime.datetime(2026, 2, 10, 9, 15, 0)},
    "speeches": {"row_count": 300, "latest": datetime.datetime(2026, 6, 1, 18, 45, 0)},
}


@pytest.mark.asyncio
async def test_freshness_ok(monkeypatch):
    """Freshness endpoint returns per-domain row counts and latest timestamps."""
    import backend.core as main_mod

    monkeypatch.setattr(main_mod, "get_db_conn", _fake_db(_ROWS))
    monkeypatch.setattr(
        main_mod,
        "_refresh_state",
        {"last_refresh": "2026-07-23T09:00:00Z", "last_error": None, "refresh_count": 3},
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/meta/freshness")

    assert response.status_code == 200
    body = response.json()
    assert "generated_at" in body

    assert body["politicians"]["row_count"] == 141
    assert body["politicians"]["latest"] == "2026-07-20T08:30:00"
    assert body["politicians"]["source_field"] == "last_synced_at"

    assert body["votes"]["row_count"] == 5432
    assert body["votes"]["latest"] == "2026-07-17"
    assert body["votes"]["source_field"] == "sitting_date"

    # mp_votes has no timestamp column in the schema
    assert body["mp_votes"]["row_count"] == 700000
    assert body["mp_votes"]["latest"] is None
    assert body["mp_votes"]["source_field"] is None

    assert body["assets"]["row_count"] == 900
    assert body["interests"]["row_count"] == 1200
    assert body["speeches"]["row_count"] == 300

    assert body["materialized_views"]["last_refresh"] == "2026-07-23T09:00:00Z"
    assert body["materialized_views"]["refresh_count"] == 3
    assert body["materialized_views"]["last_error"] is None


@pytest.mark.asyncio
async def test_freshness_empty_tables(monkeypatch):
    """Empty tables report zero rows and null timestamps, not an error."""
    import backend.core as main_mod

    monkeypatch.setattr(main_mod, "get_db_conn", _fake_db({}))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/meta/freshness")

    assert response.status_code == 200
    body = response.json()
    for domain in ("politicians", "votes", "mp_votes", "assets", "interests", "speeches"):
        assert body[domain]["row_count"] == 0
        assert body[domain]["latest"] is None


@pytest.mark.asyncio
async def test_freshness_error_no_db(monkeypatch):
    """Missing DB connection surfaces as a problem-details 500."""
    import backend.core as main_mod

    @contextmanager
    def fake_get_db():
        yield None

    monkeypatch.setattr(main_mod, "get_db_conn", fake_get_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/meta/freshness")

    assert response.status_code == 500
    body = response.json()
    assert body["status"] == 500
    assert body["instance"] == "/api/meta/freshness"
