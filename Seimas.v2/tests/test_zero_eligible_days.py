"""A member whose mandate covers no ingested sitting day has no attendance.

Evaluation CORA-03 (2026-11-22). `mp_attendance_v2` is built from an inner
join of politicians and sitting days, so a member with no sitting day inside
their mandate — every newly sworn-in replacement, until the next sitting is
ingested — has *no row*. Both resolvers suppressed only on a row with fewer
than three eligible days, so this member skipped suppression and fell through
to the v1 summary view, whose `ELSE 0` published „0 %" on the list, the
profile and the leaderboard: the most damaging false thing this platform can
say about a named person.

Against a real Postgres, because the defect lives in how two views encode
"no data" differently; a mocked cursor would only restate the assumption.
"""
from __future__ import annotations

import datetime as dt
import os
import uuid

import psycopg2
import psycopg2.extras
import pytest

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")


@pytest.fixture()
def newcomer():
    """A member sworn in after the last ingested sitting day."""
    conn = psycopg2.connect(DSN)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    mp_id = str(uuid.uuid4())
    marker = uuid.uuid4().int % 1_000_000 + 7_000_000
    start = dt.date.today() + dt.timedelta(days=3650)
    cur.execute(
        """INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id,
                                    is_active, mandate_start_date)
           VALUES (%s, %s, %s, %s, TRUE, %s)""",
        (mp_id, f"Naujokas {marker}", f"naujokas {marker}", str(marker), start),
    )
    conn.commit()
    for view in ("mp_stats_summary", "mp_attendance_v2", "mp_leaderboard_metrics"):
        cur.execute(f"REFRESH MATERIALIZED VIEW {view}")
    conn.commit()
    yield conn, cur, mp_id
    cur.execute("DELETE FROM politicians WHERE id = %s::uuid", (mp_id,))
    conn.commit()
    for view in ("mp_stats_summary", "mp_attendance_v2", "mp_leaderboard_metrics"):
        cur.execute(f"REFRESH MATERIALIZED VIEW {view}")
    conn.commit()
    conn.close()


def test_the_two_views_encode_no_data_differently(newcomer):
    """The precondition, pinned so the fix is not mistaken for unnecessary:
    v2 has no row for this member, v1 says 0."""
    _, cur, mp_id = newcomer
    cur.execute("SELECT 1 FROM mp_attendance_v2 WHERE mp_id = %s::uuid", (mp_id,))
    assert cur.fetchone() is None
    cur.execute("SELECT attendance_percentage FROM mp_stats_summary WHERE mp_id = %s::uuid", (mp_id,))
    assert float(cur.fetchone()["attendance_percentage"]) == 0.0


def test_the_profile_resolver_returns_unknown(newcomer):
    from backend.hero_engine import resolve_attendance

    _, cur, mp_id = newcomer
    assert resolve_attendance(cur, mp_id, 0.0) is None


def test_the_bulk_resolver_returns_unknown(newcomer):
    """List and leaderboard apply this map with the v1 value as the default,
    so the member must be *in* it, mapped to None."""
    from backend.hero_engine import attendance_overrides

    _, cur, mp_id = newcomer
    overrides = attendance_overrides(cur)
    assert mp_id in overrides
    assert overrides[mp_id] is None


def test_the_members_list_serves_null(newcomer):
    from fastapi.testclient import TestClient
    from backend.main import app

    _, _, mp_id = newcomer
    rows = TestClient(app).get("/api/mps?status=all").json()
    mine = [r for r in rows if r["id"] == mp_id]
    assert mine, "the newcomer is missing from the list"
    assert mine[0]["attendance"] is None


def test_the_profile_serves_null(newcomer):
    from fastapi.testclient import TestClient
    from backend.main import app

    _, _, mp_id = newcomer
    response = TestClient(app).get(f"/api/v2/heroes/{mp_id}")
    assert response.status_code == 200
    assert response.json()["metrics"]["attendance_percentage"] is None


def test_the_leaderboard_serves_null(newcomer):
    from fastapi.testclient import TestClient
    from backend.main import app

    _, _, mp_id = newcomer
    response = TestClient(app).get("/api/v2/heroes/leaderboard?limit=200")
    assert response.status_code == 200
    mine = [p for p in response.json() if p["mp"]["id"] == mp_id]
    assert mine, "the newcomer is missing from the leaderboard"
    assert mine[0]["metrics"]["attendance_percentage"] is None
