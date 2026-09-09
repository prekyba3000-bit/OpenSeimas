"""The two ways this project counts a vote must agree.

Every published tally exists twice. `votes.votes_for/against/abstained` is the
protocol summary LRS writes; the vote page counts `mp_votes` rows instead, and
the P5 summaries read the protocol columns. Two paths, one published fact.

That is the shape that produced the list/profile disagreement fixed on
2026-09-07 — a member's `experience` read 12.35 on the profile and 61.98 on
the leaderboard, because two paths normalised against different maxima and
nothing asserted they matched. The P5 recon verified this agreement on all
3,630 tallied votes and filed a permanent check rather than building one.
This is that check, exercised in both directions against a real Postgres.
"""
from __future__ import annotations

import os
import uuid

import psycopg2
import pytest

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")

CHECK_KEY = "vote_tally_agreement"


@pytest.fixture()
def db():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    marker = uuid.uuid4().int % 1_000_000 + 8_000_000
    ids = [marker, marker + 1, marker + 2]
    mps = [str(uuid.uuid4()) for _ in range(3)]
    for i, u in enumerate(mps):
        cur.execute(
            """INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id)
               VALUES (%s, %s, %s, %s)""",
            (u, f"Testinis {marker}{i}", f"testinis {marker}{i}", str(marker * 10 + i)),
        )
    conn.commit()
    yield conn, cur, mps, ids
    cur.execute("DELETE FROM mp_votes WHERE vote_id = ANY(%s)", (ids,))
    cur.execute("DELETE FROM votes WHERE seimas_vote_id = ANY(%s)", (ids,))
    cur.execute("DELETE FROM politicians WHERE id = ANY(%s::uuid[])", (mps,))
    conn.commit()
    conn.close()


def _check_sql(cur) -> str:
    cur.execute("SELECT sql FROM dq_checks WHERE check_key = %s", (CHECK_KEY,))
    row = cur.fetchone()
    assert row, f"{CHECK_KEY} is not seeded; migration 046 did not apply"
    return row[0]


def _rows_for(cur, ids):
    cur.execute(_check_sql(cur))
    return [r for r in cur.fetchall() if r[0] in {str(i) for i in ids}]


def _vote(cur, vid, f, a, s, participated):
    cur.execute(
        """INSERT INTO votes (seimas_vote_id, sitting_date, title, votes_for,
                              votes_against, votes_abstained, votes_participated)
           VALUES (%s,'2026-01-01','t',%s,%s,%s,%s)""",
        (vid, f, a, s, participated),
    )


def test_the_check_is_seeded_and_blocks_publication(db):
    """A disagreement means one of two numbers a reader can see is wrong, and
    refreshing the views would carry it onto a profile."""
    _, cur, _, _ = db
    cur.execute(
        "SELECT severity, action FROM dq_checks WHERE check_key = %s", (CHECK_KEY,)
    )
    assert cur.fetchone() == ("error", "block_publish")


def test_agreeing_counts_report_nothing(db):
    conn, cur, mps, ids = db
    _vote(cur, ids[0], 2, 1, 0, 3)
    cur.executemany(
        "INSERT INTO mp_votes (vote_id, politician_id, vote_choice) VALUES (%s,%s,%s)",
        [(ids[0], mps[0], "Už"), (ids[0], mps[1], "Už"), (ids[0], mps[2], "Prieš")],
    )
    conn.commit()
    assert _rows_for(cur, ids) == []


def test_a_protocol_that_overstates_the_members_is_caught(db):
    """Protocol says three voted for; two member rows say so."""
    conn, cur, mps, ids = db
    _vote(cur, ids[0], 3, 0, 0, 3)
    cur.executemany(
        "INSERT INTO mp_votes (vote_id, politician_id, vote_choice) VALUES (%s,%s,%s)",
        [(ids[0], mps[0], "Už"), (ids[0], mps[1], "Už")],
    )
    conn.commit()
    rows = _rows_for(cur, ids)
    assert len(rows) == 1
    assert rows[0][2] == "protokolas"
    assert (rows[0][3], rows[0][4]) == ("3", "2")


def test_a_vote_that_hides_real_choices_is_caught(db):
    """The other direction. 1,656 votes publish nothing, and
    `votes_participated = 0` is what every surface uses to say so — if that
    predicate stops being clean, those surfaces start hiding real data."""
    conn, cur, mps, ids = db
    _vote(cur, ids[0], 0, 0, 0, 0)
    cur.execute(
        "INSERT INTO mp_votes (vote_id, politician_id, vote_choice) VALUES (%s,%s,'Už')",
        (ids[0], mps[0]),
    )
    conn.commit()
    rows = _rows_for(cur, ids)
    assert len(rows) == 1
    assert rows[0][2] == "nepaskelbta, bet yra balsų"


def test_an_unpublished_vote_with_no_choices_is_not_a_finding(db):
    """The ordinary case for those 1,656: nothing published, nothing recorded."""
    conn, cur, mps, ids = db
    _vote(cur, ids[0], 0, 0, 0, 0)
    cur.executemany(
        "INSERT INTO mp_votes (vote_id, politician_id, vote_choice) VALUES (%s,%s,NULL)",
        [(ids[0], mps[0]), (ids[0], mps[1])],
    )
    conn.commit()
    assert _rows_for(cur, ids) == []


def test_the_check_uses_the_positive_choice_predicate(db):
    """Migration 015's definition, not "anything that is not nedalyvavo". An
    empty `kaip_balsavo` is how the source records an absence, and counting it
    as participation is the bug 015 exists to have fixed."""
    _, cur, _, _ = db
    sql = _check_sql(cur)
    assert "nedalyvavo" not in sql.lower()
    assert "susilaik" in sql
