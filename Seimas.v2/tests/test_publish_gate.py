"""The data-quality gate holds every published view, against a real Postgres.

Evaluation ARC-01: the gate guarded one of six refresh paths, so a block_publish
failure held mp_attendance_v2 while the API kept republishing vote counts and the
leaderboard every 30 minutes. A mocked cursor cannot show what a held view
serves; a real one can.
"""
from __future__ import annotations

import datetime as dt
import os
import uuid

import psycopg2
import psycopg2.extras
import pytest
from fastapi.testclient import TestClient

from backend import core, routes_admin
from backend.main import app
from backend.publish import PUBLISH_STEPS, publish

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")


@pytest.fixture()
def gate_db():
    """Only this test's check is enabled, so the gate's verdict is ours to set.

    dq_check_runs is append-only and references dq_checks, so the test check is
    disabled afterwards rather than deleted; the real checks are restored.
    """
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT check_key FROM dq_checks WHERE enabled")
    were_enabled = [r["check_key"] for r in cur.fetchall()]
    cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE enabled")
    check_key = "arc01_test_blocks_" + uuid.uuid4().hex[:8]
    cur.execute(
        """INSERT INTO dq_checks (check_key, description_lt, sql, severity, action)
           VALUES (%s, 'Testinis blokuojantis patikrinimas.', 'SELECT 1 AS violation',
                   'error', 'block_publish')""",
        (check_key,),
    )
    mp_id = str(uuid.uuid4())
    marker = uuid.uuid4().int % 1_000_000 + 8_000_000
    try:
        yield cur, check_key, mp_id, marker
    finally:
        cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE check_key = %s", (check_key,))
        if were_enabled:
            cur.execute("UPDATE dq_checks SET enabled = TRUE WHERE check_key = ANY(%s)", (were_enabled,))
        cur.execute("DELETE FROM politicians WHERE id = %s::uuid", (mp_id,))
        for view, sql in PUBLISH_STEPS:
            cur.execute("SELECT ispopulated FROM pg_matviews WHERE matviewname = %s", (view,))
            row = cur.fetchone()
            if row:
                cur.execute(sql if row["ispopulated"] else sql.replace(" CONCURRENTLY", ""))
        conn.close()


def _ingest_member(cur, mp_id, marker):
    """What an ingest does: change base tables, publish nothing."""
    cur.execute(
        """INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id,
                                    is_active, mandate_start_date)
           VALUES (%s, %s, %s, %s, TRUE, %s)""",
        (mp_id, f"Vartai {marker}", f"vartai {marker}", str(marker), dt.date(2024, 11, 14)),
    )


def _published(cur, mp_id):
    cur.execute("SELECT count(*) AS n FROM mp_stats_summary WHERE mp_id = %s::uuid", (mp_id,))
    in_stats = cur.fetchone()["n"]
    cur.execute("SELECT count(*) AS n FROM mp_leaderboard_metrics WHERE mp_id = %s::uuid", (mp_id,))
    return in_stats, cur.fetchone()["n"]


def _publish_rows(cur, job_id):
    cur.execute("SELECT count(*) AS n FROM source_fetches WHERE job_id = %s", (job_id,))
    return cur.fetchone()["n"]


def test_a_blocking_check_holds_every_published_view(gate_db):
    cur, _, mp_id, marker = gate_db
    job = "test-held-" + uuid.uuid4().hex[:6]
    _ingest_member(cur, mp_id, marker)

    result = publish(DSN, job_id=job)

    assert result == {"status": "held", "refreshed": []}
    assert _published(cur, mp_id) == (0, 0), "a held publish changed a published view"
    assert _publish_rows(cur, job) == 0, "a held publish was recorded as a refresh"


def test_a_clear_gate_publishes_every_view_and_records_it(gate_db):
    cur, check_key, mp_id, marker = gate_db
    job = "test-clear-" + uuid.uuid4().hex[:6]
    cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE check_key = %s", (check_key,))
    _ingest_member(cur, mp_id, marker)

    result = publish(DSN, job_id=job)

    assert result["status"] == "published" and result["gate"] == "clear"
    assert result["refreshed"] == [view for view, _ in PUBLISH_STEPS]
    assert _published(cur, mp_id) == (1, 1)
    assert _publish_rows(cur, job) == len(PUBLISH_STEPS)


def test_the_admin_route_publishes_through_the_same_gate(gate_db, monkeypatch):
    cur, _, mp_id, marker = gate_db
    token = "test-arc01-token"
    monkeypatch.setattr(core, "SYNC_SECRET", token)
    _ingest_member(cur, mp_id, marker)

    with TestClient(app) as client:
        response = client.post("/api/admin/refresh", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert routes_admin.publish is publish
    assert _published(cur, mp_id) == (0, 0), "the admin route published past a blocking check"
    assert _publish_rows(cur, "POST /api/admin/refresh") == 0


def test_starting_the_api_publishes_nothing(gate_db):
    """It used to: every worker refreshed both views at boot, gate or no gate."""
    cur, check_key, mp_id, marker = gate_db
    cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE check_key = %s", (check_key,))
    _ingest_member(cur, mp_id, marker)

    with TestClient(app) as client:
        client.get("/health")

    assert _published(cur, mp_id) == (0, 0)
