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
    import backend.core as main_mod

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
    import backend.core as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    _patch_db(monkeypatch, [])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=%20%20%20")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_heroes_search_rejects_overlong_query(monkeypatch):
    import backend.core as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    _patch_db(monkeypatch, [])
    very_long_q = "a" * 121
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v2/heroes/search?q={very_long_q}")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_heroes_search_returns_results(monkeypatch):
    import backend.core as main_mod

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
    import backend.core as main_mod

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
    import backend.core as main_mod

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
    import backend.core as main_mod

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
    import backend.core as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=test")
    assert response.status_code == 429


@pytest.mark.asyncio
async def test_heroes_search_returns_empty_results(monkeypatch):
    import backend.core as main_mod

    monkeypatch.setattr(main_mod, "check_rate_limit", lambda _ip: True)
    _patch_db(monkeypatch, [])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v2/heroes/search?q=nomatch")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["results"] == []


class TestAttendanceMethodologyGate:
    """The published methodology governs which attendance formula is in force.

    v2 was announced 2026-08-12 with effective_from 2026-08-26; until that date
    passes the engine keeps serving v1, and afterwards switches with no code
    change (plan §7). Suppression of members with almost no eligible sitting
    days is separate and applies under either version.
    """

    def _cursor(self, v2_row, version_row):
        from unittest.mock import MagicMock

        cur = MagicMock()
        # resolve_attendance reads mp_attendance_v2 first, then the version.
        cur.fetchone.side_effect = [v2_row, version_row]
        return cur

    def test_serves_v1_while_v2_is_only_announced(self):
        from backend import hero_engine

        cur = self._cursor({"attendance_percentage": 72.04, "eligible_days": 93}, {"v": 1})
        assert hero_engine.resolve_attendance(cur, "mp-1", 70.97) == 70.97

    def test_serves_v2_once_effective(self):
        from backend import hero_engine

        cur = self._cursor({"attendance_percentage": 72.04, "eligible_days": 93}, {"v": 2})
        assert hero_engine.resolve_attendance(cur, "mp-1", 70.97) == 72.04

    def test_suppresses_members_with_almost_no_eligible_days_under_v1(self):
        """Members who took a seat and gave it up the same day must not read 0%.

        This does not wait for the v2 effective date: 0% states something false
        about a person under either formula.
        """
        from backend import hero_engine

        cur = self._cursor({"attendance_percentage": None, "eligible_days": 1}, {"v": 1})
        assert hero_engine.resolve_attendance(cur, "mp-1", 0.0) is None

    def test_falls_back_to_v1_when_the_view_has_no_row(self):
        from backend import hero_engine

        cur = self._cursor(None, {"v": 2})
        assert hero_engine.resolve_attendance(cur, "mp-1", 70.97) == 70.97

    def test_missing_methodology_table_means_v1(self):
        from unittest.mock import MagicMock
        from backend import hero_engine

        cur = MagicMock()
        cur.execute.side_effect = Exception("relation methodology_versions does not exist")
        assert hero_engine.effective_attendance_version(cur) == 1


class TestAttendanceIsAJsonNumber:
    """Attendance must reach the client as a number, or as null — never a string.

    The materialised view yields Decimal; without an explicit float() it
    serialises as a JSON string, every leaderboard row fails client-side schema
    validation, and the table silently renders empty with a 200 response and no
    console error.
    """

    def test_decimal_attendance_is_converted_to_float(self):
        import decimal
        from unittest.mock import MagicMock

        from backend import hero_engine

        cur = MagicMock()
        cur.fetchall.return_value = [
            {"mp_id": "mp-1", "attendance_percentage": decimal.Decimal("97.85"), "eligible_days": 93}
        ]
        cur.fetchone.return_value = {"v": 2}
        overrides = hero_engine.attendance_overrides(cur)

        assert isinstance(overrides["mp-1"], float)
        assert overrides["mp-1"] == 97.85

    def test_suppressed_member_maps_to_none_not_zero(self):
        from unittest.mock import MagicMock

        from backend import hero_engine

        cur = MagicMock()
        cur.fetchall.return_value = [
            {"mp_id": "mp-2", "attendance_percentage": None, "eligible_days": 1}
        ]
        cur.fetchone.return_value = {"v": 1}
        assert hero_engine.attendance_overrides(cur)["mp-2"] is None
