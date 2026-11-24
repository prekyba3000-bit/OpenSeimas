"""Public trust boundaries that depend on SQL, exercised against real Postgres.

Evaluation CORA-07 / SECF-01 / SECA-02. Mock cursors cannot prove what a CASE,
an approval predicate, or an advisory lock actually does.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import os
import uuid

import psycopg2
import psycopg2.extras
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend import core
from backend.routes_trust import CORRECTIONS_BURST_LIMIT, CORRECTIONS_OPEN_LIMIT

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")
TOKEN = "test-trust-boundary-token"


@pytest.fixture(autouse=True)
def _test_controls(monkeypatch):
    monkeypatch.setattr(core, "SYNC_SECRET", TOKEN, raising=False)
    monkeypatch.setattr(core, "check_rate_limit", lambda _ip: True)


@pytest.fixture()
def corrections_db():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    marker = "trust-boundary-" + uuid.uuid4().hex
    yield conn, cur, marker
    cur.execute("DELETE FROM corrections WHERE entity_id LIKE %s", (marker + "%",))
    conn.commit()
    conn.close()


def _insert_correction(cur, conn, entity_id, body, status="open", created_at=None):
    cur.execute(
        """
        INSERT INTO corrections (entity_type, entity_id, description, status, resolution_note, created_at)
        VALUES ('other', %s, %s, %s, 'Prižiūrėtojo sprendimas.', COALESCE(%s, NOW()))
        RETURNING id
        """,
        (entity_id, body, status, created_at),
    )
    row = cur.fetchone()
    conn.commit()
    return str(row["id"])


def _seed_open(cur, conn, marker, count, created_at=None):
    for i in range(count):
        _insert_correction(cur, conn, f"{marker}-{i}", "Laukiama peržiūros sintetinė pastaba.", created_at=created_at)


def _post_submission(entity_id, forwarded_for="198.51.100.10"):
    with TestClient(app) as client:
        return client.post(
            "/api/trust/corrections",
            json={"entity_type": "other", "entity_id": entity_id, "description": "Nauja sintetinė pastaba apie klaidą."},
            headers={"X-Forwarded-For": forwarded_for},
        )


def test_rejected_text_is_private_and_withheld_is_terminal(corrections_db):
    conn, cur, marker = corrections_db
    raw = "SYNTHETIC-UNVERIFIED-CLAIM-IR-ASMENS-DUOMENYS"
    rejected_id = _insert_correction(cur, conn, marker + "-rejected", raw, "rejected")
    withheld_id = _insert_correction(cur, conn, marker + "-withheld", raw + "-WITHHELD", "withheld")

    with TestClient(app) as client:
        response = client.get("/api/trust/corrections?limit=200")
        assert response.status_code == 200
        rows = {row["id"]: row for row in response.json()["corrections"]}
        assert rejected_id in rows
        assert rows[rejected_id]["description"] is None
        assert rows[rejected_id]["resolution_note"] == "Prižiūrėtojo sprendimas."
        assert withheld_id not in rows
        assert raw not in response.text


def test_admin_can_withhold_without_publishing(corrections_db):
    conn, cur, marker = corrections_db
    correction_id = _insert_correction(cur, conn, marker + "-admin", "Privati sintetinė pastaba.")
    with TestClient(app) as client:
        response = client.post(
            f"/api/admin/corrections/{correction_id}/status",
            json={"status": "withheld", "resolution_note": "Peržiūrėta, neskelbiama."},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        assert response.status_code == 200
        assert correction_id not in client.get("/api/trust/corrections?limit=200").text
    cur.execute("SELECT status, resolved_at FROM corrections WHERE id = %s", (correction_id,))
    row = cur.fetchone()
    assert row["status"] == "withheld"
    assert row["resolved_at"] is not None


def test_global_burst_budget_cannot_be_bypassed_by_a_new_ip(corrections_db):
    conn, cur, marker = corrections_db
    _seed_open(cur, conn, marker, CORRECTIONS_BURST_LIMIT)
    response = _post_submission(marker + "-over-burst", "203.0.113.99")
    assert response.status_code == 429
    cur.execute("SELECT count(*) AS n FROM corrections WHERE entity_id LIKE %s", (marker + "%",))
    assert cur.fetchone()["n"] == CORRECTIONS_BURST_LIMIT


def test_open_backlog_budget_applies_to_old_rows(corrections_db):
    conn, cur, marker = corrections_db
    _seed_open(cur, conn, marker, CORRECTIONS_OPEN_LIMIT, "2026-01-01T00:00:00Z")
    response = _post_submission(marker + "-over-backlog")
    assert response.status_code == 429
    cur.execute("SELECT count(*) AS n FROM corrections WHERE entity_id LIKE %s", (marker + "%",))
    assert cur.fetchone()["n"] == CORRECTIONS_OPEN_LIMIT


def test_simultaneous_requests_cannot_cross_the_global_budget(corrections_db):
    conn, cur, marker = corrections_db
    _seed_open(cur, conn, marker, CORRECTIONS_BURST_LIMIT - 1)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(
            lambda i: _post_submission(f"{marker}-concurrent-{i}", f"203.0.113.{i + 1}"),
            range(2),
        ))
    assert sorted(response.status_code for response in responses) == [201, 429]
    cur.execute("SELECT count(*) AS n FROM corrections WHERE entity_id LIKE %s", (marker + "%",))
    assert cur.fetchone()["n"] == CORRECTIONS_BURST_LIMIT
