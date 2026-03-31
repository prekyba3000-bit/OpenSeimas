from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_http_exception_uses_problem_details(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)

    @contextmanager
    def fake_get_db():
        conn = MagicMock()
        cur = MagicMock()
        cm = MagicMock()
        cm.__enter__.return_value = cur
        cm.__exit__.return_value = None
        conn.cursor.return_value = cm
        yield conn

    monkeypatch.setattr(main_mod, "get_db_conn", fake_get_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=%20")

    assert response.status_code == 422
    body = response.json()
    assert body["status"] == 422
    assert body["title"]
    assert body["detail"]
    assert body["instance"] == "/api/v2/heroes/search"


@pytest.mark.asyncio
async def test_validation_exception_uses_problem_details():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search")

    assert response.status_code == 422
    body = response.json()
    assert body["status"] == 422
    assert body["type"].endswith("/validation-error")
    assert isinstance(body["errors"], list)


@pytest.mark.asyncio
async def test_unhandled_exception_uses_problem_details(monkeypatch):
    import backend.main as main_mod

    def _boom(_ip: str):
        raise RuntimeError("unexpected-failure")

    monkeypatch.setattr(main_mod, "check_rate_limit", _boom)
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test"
    ) as ac:
        response = await ac.get("/api/v2/heroes/search?q=test")

    assert response.status_code == 500
    body = response.json()
    assert body["status"] == 500
    assert body["title"] == "Internal Server Error"
    assert "unexpected-failure" not in body["detail"]
