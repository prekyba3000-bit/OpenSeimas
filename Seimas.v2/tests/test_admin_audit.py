"""SECA-05 audit attribution across privileged writes, against real Postgres."""
from __future__ import annotations

import os
import uuid

import psycopg2
import psycopg2.extras
import pytest
from fastapi.testclient import TestClient

from backend import core
from backend.main import app
from backend import routes_admin

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")
TOKEN = "test-audit-admin-token"


@pytest.fixture(autouse=True)
def _controls(monkeypatch):
    monkeypatch.setattr(core, "SYNC_SECRET", TOKEN)
    monkeypatch.setattr(core, "sync_mps", lambda: None)
    monkeypatch.setattr(core, "sync_votes", lambda: None)
    monkeypatch.setattr(routes_admin, "publish", lambda *a, **k: None)


@pytest.fixture()
def admin_entities():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    marker = "audit-" + uuid.uuid4().hex
    politician_id = str(uuid.uuid4())
    seimas_mp_id = -(int(uuid.uuid4().hex[:7], 16) + 1)
    cur.execute(
        """
        INSERT INTO corrections (entity_type, entity_id, description)
        VALUES ('other', %s, 'Sintetinė audito pataisa.')
        RETURNING id
        """,
        (marker,),
    )
    correction_id = str(cur.fetchone()["id"])
    cur.execute(
        """
        INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id)
        VALUES (%s, 'Audito Narys', %s, %s)
        """,
        (politician_id, marker, seimas_mp_id),
    )
    conn.commit()
    yield cur, conn, marker, correction_id, politician_id
    cur.execute("DELETE FROM mp_replies WHERE politician_id = %s", (politician_id,))
    cur.execute("DELETE FROM corrections WHERE id = %s", (correction_id,))
    cur.execute("DELETE FROM methodology_versions WHERE metric_key = %s", (marker,))
    cur.execute("DELETE FROM politicians WHERE id = %s", (politician_id,))
    conn.commit()
    conn.close()


def _post(client, path, payload=None):
    return client.post(path, json=payload, headers={"Authorization": f"Bearer {TOKEN}"})


def test_every_admin_write_route_is_attributed(admin_entities):
    cur, conn, marker, correction_id, politician_id = admin_entities
    with TestClient(app) as client:
        assert _post(client, f"/api/admin/corrections/{correction_id}/status", {"status": "resolved"}).status_code == 200
        assert _post(
            client,
            "/api/admin/methodology",
            {"metric_key": marker, "title_lt": "Audito metodika", "body_lt": "Sintetinis tekstas."},
        ).status_code == 201
        assert _post(
            client,
            "/api/admin/replies",
            {
                "politician_id": politician_id,
                "subject_type": "profile",
                "body_lt": "Sintetinis atsakymas.",
                "verified": False,
            },
        ).status_code == 201
        assert _post(client, "/api/admin/refresh").status_code == 200
        assert _post(client, "/api/admin/sync/mps").status_code == 200
        assert _post(client, "/api/admin/sync/votes").status_code == 200

    cur.execute(
        """
        SELECT route, credential_id FROM admin_audit_log
        WHERE credential_id = 'sync'
        ORDER BY id DESC LIMIT 6
        """
    )
    rows = list(reversed(cur.fetchall()))
    assert [row["route"] for row in rows] == [
        "/api/admin/corrections/{id}/status",
        "/api/admin/methodology",
        "/api/admin/replies",
        "/api/admin/refresh",
        "/api/admin/sync/mps",
        "/api/admin/sync/votes",
    ]
    assert {row["credential_id"] for row in rows} == {"sync"}


def test_admin_audit_log_rejects_update_delete_and_truncate():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO admin_audit_log (route, credential_id, entity_type)
        VALUES ('/test', 'test', 'test')
        RETURNING id
        """
    )
    audit_id = cur.fetchone()[0]
    for statement in (
        f"UPDATE admin_audit_log SET credential_id = 'forged' WHERE id = {int(audit_id)}",
        f"DELETE FROM admin_audit_log WHERE id = {int(audit_id)}",
        "TRUNCATE admin_audit_log",
    ):
        cur.execute("SAVEPOINT rejected_audit_mutation")
        with pytest.raises(psycopg2.Error, match="append-only"):
            cur.execute(statement)
        cur.execute("ROLLBACK TO SAVEPOINT rejected_audit_mutation")
        cur.execute("RELEASE SAVEPOINT rejected_audit_mutation")
    cur.execute("SELECT credential_id FROM admin_audit_log WHERE id = %s", (audit_id,))
    assert cur.fetchone()[0] == "test"
    conn.rollback()
    conn.close()
