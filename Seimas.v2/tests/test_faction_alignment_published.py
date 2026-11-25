"""The votes behind faction alignment publish with the figure (real Postgres).

Evaluation ARC-01: GET /api/mps/{id}/faction-alignment recomputed its vote list
and its own percentage live from mp_votes while the dial read the gated
faction_alignment view. Migration 059 publishes the votes as a view and counts
the figure from it; these tests hold a publish and look at both.
"""
from __future__ import annotations

import datetime as dt
import os
import uuid

import psycopg2
import psycopg2.extras
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.publish import PUBLISH_STEPS, publish

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")
FACTION_SIZE = 10  # the view's floor: at least ten of the faction voting


@pytest.fixture()
def faction_db():
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT check_key FROM dq_checks WHERE enabled")
    were_enabled = [r["check_key"] for r in cur.fetchall()]
    cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE enabled")
    block = "arc01_faction_block_" + uuid.uuid4().hex[:8]
    cur.execute(
        """INSERT INTO dq_checks (check_key, description_lt, sql, severity, action, enabled)
           VALUES (%s, 'Testinis blokuojantis patikrinimas.', 'SELECT 1 AS violation',
                   'error', 'block_publish', FALSE)""",
        (block,),
    )
    base = uuid.uuid4().int % 100_000 + 9_500_000
    party = f"Testinė frakcija {base}"
    members = [str(uuid.uuid4()) for _ in range(FACTION_SIZE)]
    for i, mp_id in enumerate(members):
        cur.execute(
            """INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id,
                                        is_active, mandate_start_date, current_party)
               VALUES (%s, %s, %s, %s, TRUE, %s, %s)""",
            (mp_id, f"Frakcija {base}-{i}", f"frakcija {base}-{i}", str(base * 100 + i),
             dt.date(2024, 11, 14), party),
        )
    votes = []

    def ingest_vote(dissenter_choice="Prieš"):
        vote_id = base * 100 + len(votes)
        votes.append(vote_id)
        cur.execute("INSERT INTO votes (seimas_vote_id, sitting_date, title) VALUES (%s, %s, %s)",
                    (vote_id, dt.date(2025, 3, 1) + dt.timedelta(days=len(votes)), f"Testas {len(votes)}"))
        for i, mp_id in enumerate(members):
            choice = dissenter_choice if i == 0 else "Už"
            cur.execute("INSERT INTO mp_votes (vote_id, politician_id, vote_choice) VALUES (%s, %s, %s)",
                        (vote_id, mp_id, choice))

    def set_block(on):
        cur.execute("UPDATE dq_checks SET enabled = %s WHERE check_key = %s", (on, block))

    try:
        yield cur, members, ingest_vote, set_block
    finally:
        cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE check_key = %s", (block,))
        if were_enabled:
            cur.execute("UPDATE dq_checks SET enabled = TRUE WHERE check_key = ANY(%s)", (were_enabled,))
        cur.execute("DELETE FROM mp_votes WHERE politician_id = ANY(%s::uuid[])", (members,))
        if votes:
            cur.execute("DELETE FROM votes WHERE seimas_vote_id = ANY(%s)", (votes,))
        cur.execute("DELETE FROM politicians WHERE id = ANY(%s::uuid[])", (members,))
        for view, sql in PUBLISH_STEPS:
            cur.execute("SELECT ispopulated FROM pg_matviews WHERE matviewname = %s", (view,))
            row = cur.fetchone()
            if row:
                cur.execute(sql if row["ispopulated"] else sql.replace(" CONCURRENTLY", ""))
        conn.close()


def _route(mp_id):
    with TestClient(app) as client:
        response = client.get(f"/api/mps/{mp_id}/faction-alignment", params={"limit": 100})
    assert response.status_code == 200
    return response.json()


def _figure(cur, mp_id):
    cur.execute("SELECT comparable_votes, aligned_votes FROM faction_alignment WHERE mp_id = %s::uuid",
                (mp_id,))
    return cur.fetchone()


def test_the_vote_list_holds_while_the_gate_holds(faction_db):
    cur, members, ingest_vote, set_block = faction_db
    dissenter = members[0]
    ingest_vote()
    publish(DSN, job_id="test-faction")
    assert [v["agreed"] for v in _route(dissenter)["votes"]] == [False]

    set_block(True)
    ingest_vote()
    assert publish(DSN, job_id="test-faction")["status"] == "held"
    held = _route(dissenter)
    assert held["comparable_votes"] == 1 and len(held["votes"]) == 1, (
        "the vote list published past a blocking check"
    )

    set_block(False)
    publish(DSN, job_id="test-faction")
    assert _route(dissenter)["comparable_votes"] == 2


def test_the_card_and_the_dial_count_the_same_votes(faction_db):
    cur, members, ingest_vote, _ = faction_db
    for _ in range(21):  # past the 20-vote floor, so a percentage exists
        ingest_vote()
    publish(DSN, job_id="test-faction")
    for mp_id in members[:2]:
        card, dial = _route(mp_id), _figure(cur, mp_id)
        assert (card["comparable_votes"], card["aligned_votes"]) == (
            dial["comparable_votes"], dial["aligned_votes"])
    assert _route(members[0])["alignment_pct"] == 0.0
    assert _route(members[1])["alignment_pct"] == 100.0


def test_the_figure_is_the_count_of_its_published_votes():
    """By construction since migration 059 — asserted over every member here."""
    with psycopg2.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT count(*) FROM faction_alignment fa
            LEFT JOIN (SELECT mp_id, count(*) AS n, count(*) FILTER (WHERE agreed) AS a
                       FROM faction_alignment_votes GROUP BY mp_id) v ON v.mp_id = fa.mp_id
            WHERE fa.comparable_votes <> COALESCE(v.n, 0) OR fa.aligned_votes <> COALESCE(v.a, 0)
            """
        )
        assert cur.fetchone()[0] == 0
