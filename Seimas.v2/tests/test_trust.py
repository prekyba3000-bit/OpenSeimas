"""Tests for backend/routes_trust.py (V.4 trust floor).

Follows the repo convention: monkeypatch backend.core.* — routers resolve helpers
through call-time proxies, so patches propagate (see backend/core.py docstring).
"""
import datetime
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

NOW = datetime.datetime(2026, 8, 10, 12, 0, 0)


def _fake_conn(rows=None, fetchone=None):
    """Minimal fake of the pooled connection + RealDictCursor used by core."""
    cur = MagicMock()
    cur.fetchall.return_value = rows or []
    cur.fetchone.return_value = fetchone
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)
    conn = MagicMock()
    conn.cursor.return_value = cur
    conn.__enter__ = lambda s: s
    conn.__exit__ = MagicMock(return_value=False)
    return conn


@contextmanager
def _ctx(conn):
    yield conn


@pytest.fixture(autouse=True)
def _no_rate_limit():
    with patch("backend.core.check_rate_limit", return_value=True):
        yield


def test_corrections_log_never_exposes_emails():
    rows = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "entity_type": "vote",
            "entity_id": "12345",
            "description": "Klaida: balsavimo rezultatas neatitinka oficialaus šaltinio.",
            "status": "open",
            "resolution_note": None,
            "created_at": NOW,
            "resolved_at": None,
        }
    ]
    conn = _fake_conn(rows=rows)
    with patch("backend.core.get_db_conn", side_effect=lambda: _ctx(conn)), \
         patch("backend.core._table_exists", return_value=True):
        resp = client.get("/api/trust/corrections")
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 1
    # The public payload must not contain the reporter's email, even if the DB row had one.
    assert "reporter_email" not in body["corrections"][0]
    # ...and the SELECT itself must not fetch it.
    sql = conn.cursor.return_value.execute.call_args[0][0]
    assert "reporter_email" not in sql


def test_submit_correction_honeypot_silently_accepts():
    # Bot fills the hidden field → 201 but nothing is written.
    with patch("backend.core.get_db_conn") as db:
        resp = client.post(
            "/api/trust/corrections",
            json={
                "entity_type": "vote",
                "entity_id": "1",
                "description": "spam spam spam spam spam",
                "website": "http://spam.example",
            },
        )
    assert resp.status_code == 201
    db.assert_not_called()


def test_submit_correction_rejects_bad_entity_type():
    resp = client.post(
        "/api/trust/corrections",
        json={"entity_type": "nope", "entity_id": "1", "description": "valid length description"},
    )
    assert resp.status_code == 422


def test_methodology_404_for_unknown_metric():
    conn = _fake_conn(rows=[])
    with patch("backend.core.get_db_conn", side_effect=lambda: _ctx(conn)), \
         patch("backend.core._table_exists", return_value=True):
        resp = client.get("/api/trust/methodology/does_not_exist")
    assert resp.status_code == 404


def test_methodology_current_plus_history():
    rows = [
        {"metric_key": "attendance", "version": 2, "title_lt": "Dalyvavimas v2",
         "body_lt": "Naudojami registracijos duomenys.", "announced_at": NOW, "effective_from": NOW},
        {"metric_key": "attendance", "version": 1, "title_lt": "Dalyvavimas v1",
         "body_lt": "Išvestinis iš balsavimų.", "announced_at": None, "effective_from": NOW},
    ]
    conn = _fake_conn(rows=rows)
    with patch("backend.core.get_db_conn", side_effect=lambda: _ctx(conn)), \
         patch("backend.core._table_exists", return_value=True):
        resp = client.get("/api/trust/methodology/attendance")
    assert resp.status_code == 200
    body = resp.json()
    assert body["current"]["version"] == 2
    assert len(body["history"]) == 1 and body["history"][0]["version"] == 1


def test_trust_503_when_migration_missing():
    conn = _fake_conn()
    with patch("backend.core.get_db_conn", side_effect=lambda: _ctx(conn)), \
         patch("backend.core._table_exists", return_value=False):
        resp = client.get("/api/trust/corrections")
    assert resp.status_code == 503
    assert "017" in resp.json()["detail"]


def test_admin_requires_auth():
    resp = client.post("/api/admin/methodology", json={
        "metric_key": "attendance", "title_lt": "t", "body_lt": "b",
    })
    assert resp.status_code in (401, 503)
