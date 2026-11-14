from contextlib import contextmanager

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


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
