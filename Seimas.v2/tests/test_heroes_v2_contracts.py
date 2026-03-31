from contextlib import contextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


def _fake_search_row(mp_id: str, name: str = "Test MP", party: str = "Test Party"):
    return {
        "id": mp_id,
        "display_name": name,
        "current_party": party,
        "photo_url": "https://example.com/photo.jpg",
        "is_active": True,
        "seimas_mp_id": 101,
    }


def _fake_hero_profile(mp_id: str, name: str = "Test MP"):
    return {
        "mp": {
            "id": mp_id,
            "name": name,
            "party": "Test Party",
            "photo": "https://example.com/photo.jpg",
            "active": True,
            "seimas_id": 101,
        },
        "level": 2,
        "xp": 450,
        "xp_current_level": 200,
        "xp_next_level": 800,
        "alignment": "Lawful Good",
        "attributes": {"STR": 55.0, "WIS": 61.0, "CHA": 49.0, "INT": 72.0, "STA": 66.0},
        "artifacts": [{"name": "Audit Seal", "rarity": "Rare"}],
        "metrics": {"risk_score": 0.22},
        "metrics_provenance": {"INT": "direct"},
        "forensic_breakdown": {
            "base_risk_score": 0.22,
            "base_risk_penalty": -11,
            "benford": {"status": "clean", "penalty": 0, "explanation": "ok"},
            "chrono": {"status": "warning", "penalty": -5, "explanation": "signal"},
            "vote_geometry": {"status": "clean", "penalty": 0, "explanation": "ok"},
            "phantom_network": {"status": "clean", "penalty": 0, "explanation": "ok"},
            "loyalty_bonus": {"status": "clean", "bonus": 2, "explanation": "ok"},
            "total_forensic_adjustment": -3,
            "final_integrity_score": 72,
        },
    }


class FakeCursor:
    def __init__(self, rows):
        self._rows = rows
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchall(self):
        return self._rows


class FakeConnection:
    def __init__(self, rows):
        self._cursor = FakeCursor(rows)

    def cursor(self):
        return self

    def __enter__(self):
        return self._cursor

    def __exit__(self, exc_type, exc, tb):
        return False


def _patch_db(monkeypatch, rows):
    import backend.main as main_mod

    fake_conn = FakeConnection(rows)

    @contextmanager
    def fake_get_db():
        yield fake_conn

    monkeypatch.setattr(main_mod, "get_db_conn", fake_get_db)
    return fake_conn._cursor


@pytest.mark.asyncio
async def test_openapi_leaderboard_response_model_is_explicit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    model = (
        schema["paths"]["/api/v2/heroes/leaderboard"]["get"]["responses"]["200"]["content"]["application/json"][
            "schema"
        ]
    )
    assert model.get("type") == "array"
    assert "$ref" in model.get("items", {})


@pytest.mark.asyncio
async def test_openapi_profile_response_model_is_explicit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    model = (
        schema["paths"]["/api/v2/heroes/{mp_id}"]["get"]["responses"]["200"]["content"]["application/json"][
            "schema"
        ]
    )
    assert "$ref" in model


@pytest.mark.asyncio
async def test_heroes_search_requires_query_param():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_heroes_search_rejects_blank_query(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    _patch_db(monkeypatch, [])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=%20%20%20")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_heroes_search_rejects_overlong_query(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    _patch_db(monkeypatch, [])
    very_long_q = "a" * 121
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v2/heroes/search?q={very_long_q}")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_heroes_search_returns_results(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    monkeypatch.setattr(main_mod, "calculate_hero_profile", lambda mp_id, db_cursor: _fake_hero_profile(mp_id))
    _patch_db(monkeypatch, [_fake_search_row("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=test")
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "test"
    assert body["total"] == 1
    assert len(body["results"]) == 1
    assert body["results"][0]["mp"]["id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


@pytest.mark.asyncio
async def test_heroes_search_is_parameterized_against_injection(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    monkeypatch.setattr(main_mod, "calculate_hero_profile", lambda mp_id, db_cursor: _fake_hero_profile(mp_id))
    fake_cursor = _patch_db(monkeypatch, [_fake_search_row("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")])
    attack = "'; DROP TABLE politicians;--"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v2/heroes/search?q={attack}")
    assert response.status_code == 200
    sql, params = fake_cursor.executed[0]
    assert "%s" in sql
    assert attack in params[0]
    assert "DROP TABLE politicians" not in sql


@pytest.mark.asyncio
async def test_heroes_search_clamps_limit(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    monkeypatch.setattr(main_mod, "calculate_hero_profile", lambda mp_id, db_cursor: _fake_hero_profile(mp_id))
    fake_cursor = _patch_db(monkeypatch, [_fake_search_row("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=test&limit=999")
    assert response.status_code == 200
    _, params = fake_cursor.executed[0]
    assert params[2] == 50


@pytest.mark.asyncio
async def test_heroes_search_returns_500_when_db_unavailable(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)

    @contextmanager
    def fake_get_db():
        yield None

    monkeypatch.setattr(main_mod, "get_db_conn", fake_get_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=test")
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_heroes_search_returns_429_on_rate_limit(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=test")
    assert response.status_code == 429


@pytest.mark.asyncio
async def test_heroes_search_returns_empty_results(monkeypatch):
    import backend.main as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    _patch_db(monkeypatch, [])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=nomatch")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["results"] == []
