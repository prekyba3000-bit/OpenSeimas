from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


@pytest.mark.asyncio
async def test_openplanter_graph_ok(monkeypatch):
    """Graph endpoint returns Cytoscape payload with nodes and edges (DB mocked)."""
    import backend.main as main_mod

    fake_profiles = [
        {
            "mp": {
                "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "name": "Test MP",
                "party": "Test Party",
                "active": True,
            },
            "alignment": "Lawful Good",
            "attributes": {"INT": 72.0},
            "level": 2,
            "xp": 500,
        }
    ]

    def fake_calculate_all(*, db_cursor, active_only=True, limit=None):
        return fake_profiles

    def fake_table_exists(cur, name):
        return False

    @contextmanager
    def fake_get_db():
        conn = MagicMock()
        cur = MagicMock()
        cm = MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn.cursor.return_value = cm
        yield conn

    monkeypatch.setattr(main_mod, "calculate_all_hero_profiles", fake_calculate_all)
    monkeypatch.setattr(main_mod, "_table_exists", fake_table_exists)
    monkeypatch.setattr(main_mod, "get_db_conn", fake_get_db)
    monkeypatch.setattr(main_mod, "check_rate_limit", lambda ip: True)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/openplanter/graph")

    assert response.status_code == 200
    body = response.json()
    assert "nodes" in body
    assert "edges" in body
    assert "generated_at" in body
    assert len(body["nodes"]) >= 1
    n0 = body["nodes"][0]["data"]
    assert n0.get("category") == "politician"
    assert n0.get("alignment") == "Lawful Good"
    assert n0.get("integrity_score") == 72


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data

@pytest.mark.asyncio
async def test_stats_endpoint_error_no_db():
    # This test assumes DB_DSN is not set or invalid in the test environment
    # and verifies the 500 error handling
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/stats")
    assert response.status_code == 500
