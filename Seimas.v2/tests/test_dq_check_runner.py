"""Fault injection for the data-quality runner.

Each test plants a known-bad condition and asserts the runner reports it. The
point is not that the SQL is clever — it is that a check which cannot run is
never mistaken for a check that passed.
"""
import os
import uuid

import psycopg2
import psycopg2.extras
import pytest

from scripts import dq_check_runner as runner

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")


@pytest.fixture()
def conn():
    c = psycopg2.connect(DSN)
    yield c
    c.rollback()
    c.close()


def _check(sql, severity="error", action="block_publish", key=None):
    return {
        "check_key": key or f"synthetic_{uuid.uuid4().hex[:8]}",
        "sql": sql, "severity": severity, "action": action,
        "description_lt": "sintetinis testas",
    }


def test_zero_rows_is_a_pass(conn):
    r = runner.run_check(conn, _check("SELECT 1 WHERE false"))
    assert r["status"] == "pass"
    assert r["failing_row_count"] == 0
    assert r["sample_rows"] is None


def test_violating_rows_take_the_check_severity(conn):
    r = runner.run_check(conn, _check("SELECT 1 AS x", severity="error"))
    assert r["status"] == "error"
    assert r["failing_row_count"] == 1


def test_broken_sql_is_unknown_not_pass(conn):
    """The failure this exists to prevent: a check that cannot execute must not
    be indistinguishable from one that found nothing wrong."""
    r = runner.run_check(conn, _check("SELECT * FROM table_that_does_not_exist"))
    assert r["status"] == "unknown"
    assert r["status"] != "pass"
    assert r["failing_row_count"] is None
    assert "UndefinedTable" in r["error"] or "does not exist" in r["error"]


def test_missing_column_is_unknown(conn):
    """Exactly what three_way_reconciliation does in production until migration
    027 is applied there: the columns it reads do not exist yet."""
    r = runner.run_check(conn, _check("SELECT no_such_column FROM politicians"))
    assert r["status"] == "unknown"


def test_per_row_severity_beats_the_check_severity(conn):
    """Freshness grades per row: one stale source can warn while another errors
    inside a single check."""
    sql = """SELECT 'a' AS src, 'warn' AS severity
             UNION ALL SELECT 'b', 'error'"""
    r = runner.run_check(conn, _check(sql, severity="warn"))
    assert r["status"] == "error", "the worst row must win"


def test_per_row_severity_can_stay_a_warn(conn):
    sql = "SELECT 'a' AS src, 'warn' AS severity UNION ALL SELECT 'b', 'warn'"
    r = runner.run_check(conn, _check(sql, severity="error"))
    assert r["status"] == "warn"


def test_sample_rows_are_capped(conn):
    r = runner.run_check(conn, _check("SELECT generate_series(1, 200) AS n"))
    assert r["failing_row_count"] == 200, "the count is the true total"
    assert len(r["sample_rows"]) == runner.SAMPLE_CAP, "the sample is bounded"


def test_sample_rows_are_json_serialisable(conn):
    import json
    r = runner.run_check(conn, _check("SELECT now() AS t, uuid_generate_v4() AS u"))
    json.dumps(r["sample_rows"])  # must not raise on date/uuid types


def test_seeded_checks_all_parse(conn):
    """Every seeded check must at least be executable against a real schema.
    A check that has never run is not a check."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT check_key, sql, severity, action FROM dq_checks WHERE enabled")
        checks = cur.fetchall()
    # Asserted by name, not by count. A frozen total fails the moment a new
    # failure class earns a check — which is the system working, not breaking —
    # and the cheapest way to make it green is to edit the number. Removing a
    # check still fails here; adding one does not.
    WAVE1 = {
        "politicians_asmens_id_unique_not_null",
        "active_mp_count_in_band",
        "mp_votes_orphan_politicians",
        "mp_votes_unique_member_per_vote",
        "mp_votes_choice_in_domain",
        "mp_votes_orphan_votes",
        "legislation_project_id_unique_not_null",
        "source_freshness",
        "frozen_feed",
        "three_way_reconciliation",
    }
    present = {c["check_key"] for c in checks}
    assert WAVE1 <= present, f"seeded checks went missing: {WAVE1 - present}"
    unknown = []
    for ch in checks:
        r = runner.run_check(conn, dict(ch))
        if r["status"] == "unknown":
            unknown.append((ch["check_key"], r["error"]))
    assert not unknown, f"checks failed to execute: {unknown}"


def test_out_of_domain_vote_choice_is_caught(conn):
    """Plant a vote position the domain does not allow and confirm the check
    sees it. NULL is deliberately not planted: 54.9% of production rows carry a
    NULL choice, and that is the unpublished state, not a violation."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id, is_active) "
            "VALUES (uuid_generate_v4(), 'Testas', 'testas', 999001, true) RETURNING id"
        )
        pid = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO votes (seimas_vote_id, sitting_date, title) "
            "VALUES (999001, DATE '2026-01-01', 'testas') RETURNING seimas_vote_id"
        )
        vid = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO mp_votes (id, vote_id, politician_id, vote_choice) "
            "VALUES (uuid_generate_v4(), %s, %s, 'Neaišku')", (vid, pid),
        )

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT check_key, sql, severity, action FROM dq_checks "
                    "WHERE check_key = 'mp_votes_choice_in_domain'")
        check = dict(cur.fetchone())
    r = runner.run_check(conn, check)
    assert r["status"] == "warn"
    assert r["failing_row_count"] >= 1
    assert any(row.get("vote_choice") == "Neaišku" for row in r["sample_rows"])


def test_a_null_choice_is_not_a_violation(conn):
    """The tri-state rule, asserted where it would otherwise be quarantined."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id, is_active) "
            "VALUES (uuid_generate_v4(), 'Testas2', 'testas2', 999002, true) RETURNING id"
        )
        pid = cur.fetchone()[0]
        cur.execute("INSERT INTO votes (seimas_vote_id, sitting_date, title) "
                    "VALUES (999002, DATE '2026-01-01', 'testas2')")
        cur.execute(
            "INSERT INTO mp_votes (id, vote_id, politician_id, vote_choice) "
            "VALUES (uuid_generate_v4(), 999002, %s, NULL)", (pid,),
        )
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT check_key, sql, severity, action FROM dq_checks "
                    "WHERE check_key = 'mp_votes_choice_in_domain'")
        check = dict(cur.fetchone())
    r = runner.run_check(conn, check)
    assert not any(row.get("vote_choice") is None for row in (r["sample_rows"] or []))


# ─── Named fault-injection fixtures ─────────────────────────────────────────
# Two of the four cannot simply be inserted: the schema already forbids them
# (politicians_seimas_mp_id_key, mp_votes_vote_id_fkey). Dropping the constraint
# inside a savepoint is the honest way to prove the check catches the condition
# — it answers "would this check fire if the constraint were ever absent",
# which is exactly the case a data-quality check exists for. Every fixture is
# rolled back.

def _run_named(conn, key):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT check_key, sql, severity, action FROM dq_checks WHERE check_key = %s", (key,))
        row = cur.fetchone()
    assert row, f"check {key} is not seeded"
    return runner.run_check(conn, dict(row))


def test_fixture_duplicate_asmens_id(conn):
    key = "politicians_asmens_id_unique_not_null"
    assert _run_named(conn, key)["status"] == "pass", "clean before injection"
    with conn.cursor() as cur:
        cur.execute("SAVEPOINT inject")
        cur.execute("ALTER TABLE politicians DROP CONSTRAINT politicians_seimas_mp_id_key")
        for name in ("Dubl A", "Dubl B"):
            cur.execute(
                "INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id, is_active) "
                "VALUES (uuid_generate_v4(), %s, %s, 424242, true)", (name, name.lower()),
            )
    result = _run_named(conn, key)
    with conn.cursor() as cur:
        cur.execute("ROLLBACK TO SAVEPOINT inject")
    assert result["status"] == "error"
    assert result["failing_row_count"] >= 1
    assert any(str(r.get("seimas_mp_id")) == "424242" for r in result["sample_rows"])


def test_fixture_orphan_vote(conn):
    key = "mp_votes_orphan_votes"
    assert _run_named(conn, key)["status"] == "pass", "clean before injection"
    with conn.cursor() as cur:
        cur.execute("SAVEPOINT inject")
        cur.execute(
            "INSERT INTO politicians (id, display_name, full_name_normalized, seimas_mp_id, is_active) "
            "VALUES (uuid_generate_v4(), 'Orphan', 'orphan', 424243, true) RETURNING id"
        )
        pid = cur.fetchone()[0]
        cur.execute("ALTER TABLE mp_votes DROP CONSTRAINT mp_votes_vote_id_fkey")
        # 999999 exists in no votes row.
        cur.execute("INSERT INTO mp_votes (id, vote_id, politician_id, vote_choice) "
                    "VALUES (uuid_generate_v4(), 999999, %s, 'Už')", (pid,))
    result = _run_named(conn, key)
    with conn.cursor() as cur:
        cur.execute("ROLLBACK TO SAVEPOINT inject")
    assert result["status"] == "error"
    assert any(str(r.get("vote_id")) == "999999" for r in result["sample_rows"])


def test_fixture_tally_mismatch(conn):
    """The three-way reconciliation: parsed vs rows_affected vs inserted.
    A parser that silently drops records shows up here and nowhere else."""
    key = "three_way_reconciliation"
    assert _run_named(conn, key)["status"] == "pass", "clean before injection"
    with conn.cursor() as cur:
        cur.execute("SAVEPOINT inject")
        cur.execute(
            """INSERT INTO source_fetches
               (source_name, source_url, job_id, status, rows_affected,
                parsed_count, inserted_count, started_at, finished_at)
               VALUES ('fixture_tally', 'http://x', 'j', 'ok', 100, 140, 100, NOW(), NOW())"""
        )
    result = _run_named(conn, key)
    with conn.cursor() as cur:
        cur.execute("ROLLBACK TO SAVEPOINT inject")
    assert result["status"] == "error", "140 parsed but 100 inserted is an unexplained delta"
    assert any(r.get("source_name") == "fixture_tally" for r in result["sample_rows"])


def test_fixture_tally_mismatch_with_a_note_is_explained(conn):
    """An explained delta is not a failure. Without this the check would punish
    every legitimately filtered batch and be switched off within a week."""
    with conn.cursor() as cur:
        cur.execute("SAVEPOINT inject")
        cur.execute(
            """INSERT INTO source_fetches
               (source_name, source_url, job_id, status, rows_affected,
                parsed_count, inserted_count, reconciliation_note, started_at, finished_at)
               VALUES ('fixture_explained', 'http://x', 'j', 'ok', 100, 140, 100,
                       '40 records belong to a prior term', NOW(), NOW())"""
        )
    result = _run_named(conn, "three_way_reconciliation")
    with conn.cursor() as cur:
        cur.execute("ROLLBACK TO SAVEPOINT inject")
    assert result["status"] == "pass"


def test_fixture_stale_fetch(conn):
    key = "source_freshness"
    with conn.cursor() as cur:
        cur.execute("SAVEPOINT inject")
        cur.execute(
            """INSERT INTO source_fetches
               (source_name, source_url, job_id, status, rows_affected, started_at, finished_at)
               VALUES ('fixture_stale', 'http://x', 'j', 'ok', 5,
                       NOW() - interval '60 hours', NOW() - interval '60 hours')"""
        )
        cur.execute(
            """INSERT INTO source_fetches
               (source_name, source_url, job_id, status, rows_affected, started_at, finished_at)
               VALUES ('fixture_warn', 'http://x', 'j', 'ok', 5,
                       NOW() - interval '30 hours', NOW() - interval '30 hours')"""
        )
    result = _run_named(conn, key)
    with conn.cursor() as cur:
        cur.execute("ROLLBACK TO SAVEPOINT inject")
    by_source = {r["source_name"]: r["severity"] for r in result["sample_rows"]}
    assert by_source.get("fixture_stale") == "error", "60h is past the 50h error limit"
    assert by_source.get("fixture_warn") == "warn", "30h is past 26h but inside 50h"
    assert result["status"] == "error", "the worst row governs the check"
