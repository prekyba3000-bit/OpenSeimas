"""Boundary drill for the votes payload validator.

The drill that matters is the rename: a source quietly renames a column, the
parser reads the new name as absent, and every downstream value derived from it
becomes null. That failure is silent by construction, which is why it is
classified as a block rather than a warn.
"""
import os

import pytest

pandera = pytest.importorskip("pandera", reason="pipeline-only dependency; see requirements-pipeline.txt")

from pipeline.validation import votes_schema as vs  # noqa: E402

DSN = os.environ.get("DB_DSN")


def rec(vote_id=5190, mp=90947, choice="Už", date="2026-07-14"):
    return {
        "seimas_vote_id": vote_id, "politician_seimas_id": mp,
        "vote_choice": choice, "sitting_date": date,
    }


def test_a_clean_batch_passes_whole():
    out = vs.validate([rec(), rec(vote_id=5191)])
    assert out["drift"] == "ok"
    assert len(out["clean"]) == 2
    assert out["quarantine"] == []


def test_null_choice_is_clean_not_quarantined():
    """54.9% of production rows carry a null choice. Quarantining them would
    call the unpublished state a data defect."""
    out = vs.validate([rec(choice=None)])
    assert out["quarantine"] == []
    assert len(out["clean"]) == 1


def test_bad_choice_is_quarantined_and_the_rest_survives():
    out = vs.validate([rec(), rec(vote_id=5191, choice="Neaišku"), rec(vote_id=5192)])
    assert len(out["clean"]) == 2, "one bad row must not condemn the batch"
    assert len(out["quarantine"]) == 1
    q = out["quarantine"][0]
    assert q["record"]["vote_choice"] == "Neaišku"
    assert q["column"] == "vote_choice"
    assert "Neaišku" in q["reason"]


def test_type_failure_is_quarantined():
    out = vs.validate([rec(), {**rec(vote_id=5191), "politician_seimas_id": "not-a-number"}])
    assert len(out["quarantine"]) == 1
    assert len(out["clean"]) == 1


def test_added_column_warns_and_the_batch_proceeds():
    """A column the parser ignores costs nothing."""
    out = vs.validate([{**rec(), "naujas_laukas": "x"}])
    assert out["drift"] == "warn"
    assert any("added" in n for n in out["drift_notes"])
    assert out["quarantine"] == [], "a warn must not hold the batch"


def test_renamed_column_blocks_the_batch():
    """The drill. `vote_choice` arrives as `balso_reiksme`: strict mode sees an
    unexpected column and a missing one at the same time."""
    payload = [{"seimas_vote_id": 5190, "politician_seimas_id": 90947,
                "balso_reiksme": "Už", "sitting_date": "2026-07-14"}]
    out = vs.validate(payload)
    assert out["drift"] == "block"
    assert out["clean"] == [], "nothing may be written from a drifted batch"
    assert len(out["quarantine"]) == 1
    assert out["quarantine"][0]["check"] == "schema_drift"
    notes = " ".join(out["drift_notes"])
    assert "vote_choice" in notes and "balso_reiksme" in notes


def test_missing_column_blocks_even_without_a_replacement():
    payload = [{"seimas_vote_id": 5190, "politician_seimas_id": 90947,
                "sitting_date": "2026-07-14"}]
    out = vs.validate(payload)
    assert out["drift"] == "block"
    assert out["clean"] == []


def test_drift_classification_is_directional():
    assert vs.classify_drift(
        ["seimas_vote_id", "politician_seimas_id", "vote_choice", "sitting_date"])[0] == "ok"
    assert vs.classify_drift(
        ["seimas_vote_id", "politician_seimas_id", "vote_choice", "sitting_date", "extra"])[0] == "warn"
    assert vs.classify_drift(["seimas_vote_id", "politician_seimas_id", "sitting_date"])[0] == "block"


@pytest.mark.skipif(not DSN, reason="DB_DSN not set")
def test_quarantined_rows_persist_with_the_original_intact():
    import psycopg2
    conn = psycopg2.connect(DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.quarantine_rows')")
            if cur.fetchone()[0] is None:
                pytest.skip("quarantine_rows not present (migration 027 not applied here)")
        out = vs.validate([rec(), rec(vote_id=5191, choice="Neaišku")])
        n = vs.persist_quarantine(conn, "test_votes", out["quarantine"], batch_id="drill")
        assert n == 1
        with conn.cursor() as cur:
            cur.execute("""SELECT original_record, failure_reason, parser_version
                           FROM quarantine_rows WHERE batch_id='drill'
                           ORDER BY quarantined_at DESC LIMIT 1""")
            row = cur.fetchone()
        assert row[0]["vote_choice"] == "Neaišku", "the original record is kept verbatim"
        assert "vote_choice" in row[1]
        assert row[2] == vs.PARSER_VERSION
    finally:
        conn.rollback()
        conn.close()
