"""A corrected vote is recorded, and the stored one is not rewritten.

`ingest_votes_v2` inserts per-member choices with `ON CONFLICT DO NOTHING`. An
external audit called that a defect — a correction at the source never reaches
a reader — and proposed an upsert. Overwriting `mp_votes.vote_choice` changes a
historical ingested record, which is a §4.5 STOP condition: what a named member
is recorded as having voted is not a row this project quietly rewrites.

Measured before deciding, 2026-09-08, read-only against production: 40 votes
sampled across the term, re-fetched from the source, 5,632 member-choice
comparisons, zero differences. The correction has never once been needed.

What was missing is that we would not have known if it were. So the
disagreement is recorded and nothing is changed. These run against a real
Postgres because the whole behaviour is the SQL.
"""
from __future__ import annotations

import os
import uuid

import psycopg2
import pytest

from pipeline.ingest_votes_v2 import _record_choice_drift

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")


@pytest.fixture()
def seeded():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    mp = str(uuid.uuid4())
    marker = uuid.uuid4().int % 1_000_000 + 9_000_000
    ids = [marker, marker + 1, marker + 2]
    cur.execute(
        """INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id)
           VALUES (%s, 'Testinis Narys', %s, %s)""",
        (mp, f"testinis narys {marker}", str(marker)),
    )
    for vid in ids:
        cur.execute(
            "INSERT INTO votes (seimas_vote_id, sitting_date, title) VALUES (%s,'2026-01-01','t')",
            (vid,),
        )
    cur.execute(
        """INSERT INTO mp_votes (vote_id, politician_id, vote_choice)
           VALUES (%s,%s,'Už'), (%s,%s,NULL), (%s,%s,'Prieš')""",
        (ids[0], mp, ids[1], mp, ids[2], mp),
    )
    conn.commit()
    yield conn, cur, mp, ids
    cur.execute("DELETE FROM mp_vote_choice_drift WHERE politician_id = %s", (mp,))
    cur.execute("DELETE FROM mp_votes WHERE politician_id = %s", (mp,))
    cur.execute("DELETE FROM votes WHERE seimas_vote_id = ANY(%s)", (ids,))
    cur.execute("DELETE FROM politicians WHERE id = %s", (mp,))
    conn.commit()
    conn.close()


def _batch(mp, ids):
    """What the source serves now: first unchanged, second gained a value,
    third changed outright."""
    return [
        (str(ids[0]), mp, "Už"),
        (str(ids[1]), mp, "Susilaikė"),
        (str(ids[2]), mp, "Už"),
    ]


def test_the_stored_choice_is_never_rewritten(seeded):
    conn, cur, mp, ids = seeded
    _record_choice_drift(cur, _batch(mp, ids))
    conn.commit()

    cur.execute(
        "SELECT vote_id, vote_choice FROM mp_votes WHERE politician_id = %s ORDER BY vote_id",
        (mp,),
    )
    assert cur.fetchall() == [(ids[0], "Už"), (ids[1], None), (ids[2], "Prieš")]


def test_a_disagreement_is_recorded_with_both_values(seeded):
    conn, cur, mp, ids = seeded
    _record_choice_drift(cur, _batch(mp, ids))
    conn.commit()

    cur.execute(
        """SELECT vote_id, stored_choice, source_choice FROM mp_vote_choice_drift
           WHERE politician_id = %s ORDER BY vote_id""",
        (mp,),
    )
    rows = cur.fetchall()
    # Blank-to-value and value-to-value are both drift. A plain `<>` would call
    # the first one nothing, because NULL <> 'x' is NULL.
    assert rows == [(ids[1], None, "Susilaikė"), (ids[2], "Prieš", "Už")]


def test_an_unchanged_vote_records_nothing(seeded):
    conn, cur, mp, ids = seeded
    _record_choice_drift(cur, _batch(mp, ids))
    conn.commit()

    cur.execute(
        "SELECT count(*) FROM mp_vote_choice_drift WHERE politician_id = %s AND vote_id = %s",
        (mp, ids[0]),
    )
    assert cur.fetchone()[0] == 0


def test_a_daily_rerun_counts_rather_than_accumulates(seeded):
    """The ingest sees the same sittings every day. Without this the table
    would grow by one row per drift per run and read as an escalation."""
    conn, cur, mp, ids = seeded
    for _ in range(3):
        _record_choice_drift(cur, _batch(mp, ids))
        conn.commit()

    cur.execute(
        "SELECT count(*), max(times_seen) FROM mp_vote_choice_drift WHERE politician_id = %s",
        (mp,),
    )
    assert cur.fetchone() == (2, 3)


def test_a_tree_without_the_table_degrades_to_doing_nothing(seeded):
    """An ingest must not fail over its own bookkeeping."""
    from unittest import mock

    conn, cur, mp, ids = seeded
    fake = mock.MagicMock()
    fake.fetchone.return_value = [None]
    _record_choice_drift(fake, _batch(mp, ids))
    # One probe for the table, and no write attempted.
    assert fake.execute.call_count == 1


def test_the_runner_records_provenance_and_reports_an_incomplete_run():
    """`record_fetch` was imported at the top of ingest_votes_v2 and never
    called, so the runner for the project's core dataset was the only one
    leaving no trace in `source_fetches`. A run that missed vote results
    printed a warning, returned a dict nobody read, and exited 0."""
    from contextlib import contextmanager
    from unittest import mock

    import pipeline.ingest_votes_v2 as ivv

    seen = {}

    @contextmanager
    def recorder(conn, name, url):
        seen["name"] = name
        payload: dict = {}
        try:
            yield payload
        except Exception as exc:
            seen["error"] = str(exc)
            raise
        seen["ok"] = payload

    with mock.patch.object(ivv, "DB_DSN", "postgres://stub"), \
         mock.patch.object(ivv.psycopg2, "connect", return_value=mock.MagicMock()), \
         mock.patch.object(ivv, "record_fetch", recorder), \
         mock.patch.object(ivv, "ingest_term_votes",
                           return_value={"votes": 12, "failed_vote_ids": ["-77"]}):
        assert ivv.run() == 1
    assert seen["name"] == "seimas_votes_v2"
    assert "-77" in seen["error"]
    assert "ok" not in seen

    with mock.patch.object(ivv, "DB_DSN", "postgres://stub"), \
         mock.patch.object(ivv.psycopg2, "connect", return_value=mock.MagicMock()), \
         mock.patch.object(ivv, "record_fetch", recorder), \
         mock.patch.object(ivv, "ingest_term_votes",
                           return_value={"votes": 12, "failed_vote_ids": []}):
        assert ivv.run() == 0
    assert seen["ok"] == {"rows": 12, "parsed": 12, "inserted": 12}


def test_the_daily_sync_does_not_abort_on_an_incomplete_vote_run():
    """Under `set -e` a nonzero exit here would stop the whole sync, taking
    the registrations ingest with it — and registrations arriving late is
    exactly what understated 25 members' attendance on 2026-08-25."""
    import pathlib

    script = (
        pathlib.Path(__file__).resolve().parent.parent.parent
        / "scripts" / "local-ops" / "daily_sync.sh"
    ).read_text()
    line = next(l for l in script.splitlines() if "pipeline.ingest_votes_v2" in l)
    assert "||" in line, "an incomplete vote run would abort the sync"
