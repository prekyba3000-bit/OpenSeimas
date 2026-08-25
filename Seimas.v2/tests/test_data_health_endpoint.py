"""The internal data-health endpoint must never imply health it cannot see."""
from unittest.mock import MagicMock
from contextlib import contextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


def _cursor(present):
    """A cursor where to_regclass returns NULL for absent tables."""
    cur = MagicMock()
    state = {"rows": [], "row": None}

    def execute(sql, params=None):
        if "to_regclass" in sql:
            name = (params[0] if params else "").replace("public.", "")
            state["row"] = {"t": name if name in present else None}
        else:
            state["rows"] = []
    cur.execute.side_effect = execute
    cur.fetchone.side_effect = lambda: state["row"]
    cur.fetchall.side_effect = lambda: state["rows"]
    cur.__enter__ = lambda s: cur
    cur.__exit__ = lambda s, *a: False
    return cur


def _db(present):
    @contextmanager
    def fake():
        conn = MagicMock()
        conn.cursor.return_value = _cursor(present)
        yield conn
    return fake


@pytest.mark.asyncio
async def test_absent_tables_read_unknown_never_pass(monkeypatch):
    """Before migration 027 lands in a given database, 'we have no results'
    must not render as 'nothing failed'."""
    import backend.routes_data_health as mod
    monkeypatch.setattr(mod, "get_db_conn", _db(present=set()))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/internal/data-health")).json()

    assert body["checks"]["state"] == "unknown"
    assert body["snapshots"]["state"] == "unknown"
    assert body["quarantine"]["state"] == "unknown"
    assert body["cz3"]["state"] == "unknown"
    assert "pass" not in str(body["checks"]).lower()


@pytest.mark.asyncio
async def test_a_never_probed_cz3_is_unknown_not_not_live(monkeypatch):
    """Never asked is not the same as asked and found dead. Only the second
    would justify a claim about the feed."""
    import backend.routes_data_health as mod
    monkeypatch.setattr(mod, "get_db_conn", _db(present={"snapshot_manifest"}))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        body = (await ac.get("/api/internal/data-health")).json()
    assert body["cz3"]["state"] == "unknown"
    assert body["cz3"]["reason"] == "never probed"
    assert "activity_metrics_permitted" not in body["cz3"], \
        "no permission claim may be made from an unprobed feed"


@pytest.mark.asyncio
async def test_unreachable_database_is_unknown_not_an_error(monkeypatch):
    import backend.routes_data_health as mod

    @contextmanager
    def no_db():
        yield None
    monkeypatch.setattr(mod, "get_db_conn", no_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/internal/data-health")
    assert resp.status_code == 200
    assert resp.json()["state"] == "unknown"
