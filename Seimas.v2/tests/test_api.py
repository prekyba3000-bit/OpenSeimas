from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


@pytest.mark.asyncio
async def test_openplanter_graph_ok(monkeypatch):
    """Graph endpoint returns Cytoscape payload with nodes and edges (DB mocked)."""
    import backend.core as main_mod

    fake_summaries = [
        {
            "mp_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "display_name": "Test MP",
            "current_party": "Test Party",
            "alignment": "Lawful Good",
            "integrity_score": 72,
            "xp": 500,
            "level": 2,
        }
    ]

    def fake_fetch_summaries(*, db_cursor, active_only=True):
        return fake_summaries

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

    monkeypatch.setattr(main_mod, "fetch_graph_mp_summaries", fake_fetch_summaries)
    monkeypatch.setattr(main_mod, "_table_exists", fake_table_exists)
    monkeypatch.setattr(main_mod, "get_db_conn", fake_get_db)
    monkeypatch.setattr(main_mod, "check_rate_limit", lambda ip: True)
    with main_mod._leaderboard_cache_lock:
        main_mod._leaderboard_cache["openplanter_graph"] = None

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
    # The graph node carries identity, not a verdict. It used to ship
    # `alignment: "Lawful Good"` and an `integrity_score` — a D&D morality
    # label and a composite, attached to a named politician.
    assert n0.get("alignment") is None
    assert n0.get("integrity_score") is None
    assert n0.get("label")


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data

@pytest.mark.asyncio
async def test_stats_endpoint_error_no_db(monkeypatch):
    # Deterministic: simulate the pool being unavailable regardless of environment.
    # (Previously assumed DB_DSN unset — broke under CI where a real Postgres exists.)
    @contextmanager
    def _no_conn():
        yield None

    monkeypatch.setattr("backend.core.get_db_conn", _no_conn)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/stats")
    assert response.status_code == 500


def test_client_ip_prefers_forwarded_header_over_proxy_peer():
    """Behind Render's proxy, request.client.host is the proxy for every visitor.

    Keying the limiter on it throttles all users as one bucket and an abuser
    not at all, so the originating X-Forwarded-For entry wins when present.
    """
    from types import SimpleNamespace
    from backend import core

    request = SimpleNamespace(
        headers={"x-forwarded-for": "203.0.113.9, 10.0.0.1"},
        client=SimpleNamespace(host="10.0.0.1"),
    )
    assert core.client_ip(request) == "203.0.113.9"

    without_header = SimpleNamespace(headers={}, client=SimpleNamespace(host="10.0.0.1"))
    assert core.client_ip(without_header) == "10.0.0.1"


def test_rate_limiter_evicts_expired_ips():
    """The tracker must not grow unbounded for the life of the process."""
    from backend import core

    core._rate_tracker.clear()
    try:
        for i in range(1100):
            core.check_rate_limit(f"198.51.100.{i}")
        # Expire every recorded hit, then one more call triggers the sweep.
        for key in list(core._rate_tracker):
            core._rate_tracker[key] = [0.0]
        core.check_rate_limit("198.51.100.1")
        assert len(core._rate_tracker) < 1100
    finally:
        core._rate_tracker.clear()
