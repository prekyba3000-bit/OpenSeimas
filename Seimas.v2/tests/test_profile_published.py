"""The profile publishes when the views do, against a real Postgres.

Evaluation ARC-01 part 2: the profile recomputed votes, speeches and committee
roles live from the base tables, so while the data-quality gate held the views
the profile showed ingested-but-unchecked figures beside a list showing the
held ones. These tests ingest, hold, and look.
"""
from __future__ import annotations

import datetime as dt
import os
import uuid

import psycopg2
import psycopg2.extras
import pytest

from backend.hero_engine import calculate_hero_profile
from backend.publish import PUBLISH_STEPS, publish

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")


@pytest.fixture()
def member_db():
    """A member, a chamber with no other enabled checks, and a switchable block."""
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT check_key FROM dq_checks WHERE enabled")
    were_enabled = [r["check_key"] for r in cur.fetchall()]
    cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE enabled")
    block = "arc01_profile_block_" + uuid.uuid4().hex[:8]
    cur.execute(
        """INSERT INTO dq_checks (check_key, description_lt, sql, severity, action, enabled)
           VALUES (%s, 'Testinis blokuojantis patikrinimas.', 'SELECT 1 AS violation',
                   'error', 'block_publish', FALSE)""",
        (block,),
    )
    mp_id = str(uuid.uuid4())
    marker = uuid.uuid4().int % 1_000_000 + 9_000_000
    vote_ids = []
    cur.execute(
        """INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id,
                                    is_active, mandate_start_date)
           VALUES (%s, %s, %s, %s, TRUE, %s)""",
        (mp_id, f"Profilis {marker}", f"profilis {marker}", str(marker), dt.date(2024, 11, 14)),
    )

    def set_block(on: bool):
        cur.execute("UPDATE dq_checks SET enabled = %s WHERE check_key = %s", (on, block))

    def ingest_vote(sitting_date):
        vote_id = marker * 10 + len(vote_ids)
        vote_ids.append(vote_id)
        cur.execute("INSERT INTO votes (seimas_vote_id, sitting_date, title) VALUES (%s, %s, 'Testas')",
                    (vote_id, sitting_date))
        cur.execute("INSERT INTO mp_votes (vote_id, politician_id, vote_choice) VALUES (%s, %s, 'Už')",
                    (vote_id, mp_id))

    def ingest_speech():
        cur.execute("INSERT INTO speeches (mp_id, speech_type) VALUES (%s, 'floor_speech')", (mp_id,))

    try:
        yield cur, mp_id, set_block, ingest_vote, ingest_speech
    finally:
        cur.execute("UPDATE dq_checks SET enabled = FALSE WHERE check_key = %s", (block,))
        if were_enabled:
            cur.execute("UPDATE dq_checks SET enabled = TRUE WHERE check_key = ANY(%s)", (were_enabled,))
        cur.execute("DELETE FROM mp_votes WHERE politician_id = %s::uuid", (mp_id,))
        cur.execute("DELETE FROM speeches WHERE mp_id = %s::uuid", (mp_id,))
        if vote_ids:
            cur.execute("DELETE FROM votes WHERE seimas_vote_id = ANY(%s)", (vote_ids,))
        cur.execute("DELETE FROM politicians WHERE id = %s::uuid", (mp_id,))
        for view, sql in PUBLISH_STEPS:
            cur.execute("SELECT ispopulated FROM pg_matviews WHERE matviewname = %s", (view,))
            row = cur.fetchone()
            if row:
                cur.execute(sql if row["ispopulated"] else sql.replace(" CONCURRENTLY", ""))
        conn.close()


def _profile(mp_id):
    """As the route reads it: its own transaction (the engine uses savepoints)."""
    conn = psycopg2.connect(DSN)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            return calculate_hero_profile(mp_id, cur)
    finally:
        conn.rollback()
        conn.close()


def _figures(cur, mp_id):
    m = _profile(mp_id)["metrics"]
    return m["total_votes_cast"], m["speeches_given"], m["years_in_parliament"]


def test_a_member_added_since_the_last_publish_has_no_figures(member_db):
    cur, mp_id, _, ingest_vote, ingest_speech = member_db
    ingest_vote(dt.date(2025, 3, 11))
    ingest_speech()

    profile = _profile(mp_id)

    assert profile["dimensions"] == {"legislative_activity": None, "experience": None, "visibility": None}
    assert _figures(cur, mp_id) == (None, None, None), "an unpublished member's figures left as numbers"
    assert set(profile["metrics_provenance"].values()) == {"unpublished"}
    assert profile["mp"]["name"].startswith("Profilis"), "identity is not a figure; it still shows"


def test_the_profile_holds_while_the_gate_holds(member_db):
    cur, mp_id, set_block, ingest_vote, ingest_speech = member_db
    ingest_vote(dt.date(2025, 3, 11))
    assert publish(DSN, job_id="test-profile")["status"] == "published"
    before = _figures(cur, mp_id)
    assert before[0] == 1 and before[1] == 0  # one vote, no speech yet

    set_block(True)
    ingest_vote(dt.date(2024, 11, 19))   # earlier first vote: changes years too
    ingest_speech()
    assert publish(DSN, job_id="test-profile")["status"] == "held"

    assert _figures(cur, mp_id) == before, "the profile published past a blocking check"

    set_block(False)
    assert publish(DSN, job_id="test-profile")["status"] == "published"
    after = _figures(cur, mp_id)
    assert after[0] == 2 and after[1] == 2 and after[2] > before[2]  # a floor speech counts twice


def test_profile_and_published_row_agree(member_db):
    """List/profile agreement (§1.4) for the figures that moved."""
    cur, mp_id, _, ingest_vote, ingest_speech = member_db
    ingest_vote(dt.date(2025, 3, 11))
    ingest_speech()
    publish(DSN, job_id="test-profile")

    m = _profile(mp_id)["metrics"]
    cur.execute("SELECT * FROM mp_leaderboard_metrics WHERE mp_id = %s::uuid", (mp_id,))
    row = cur.fetchone()
    assert m["total_votes_cast"] == float(row["total_votes_cast"])
    assert m["speeches_given"] == float(row["speeches_given"])
    assert m["committee_leadership"] == float(row["committee_leadership_roles"])
    assert m["bills_authored_count"] == float(row["bills_authored_count"])
