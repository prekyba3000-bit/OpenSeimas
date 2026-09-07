"""A floor-speech run that failed must not report success.

Two things went wrong together. The checkpoint that says "this sitting is
read" was committed before the speeches were inserted, so a failed INSERT
rolled back only the rows — and `should_skip` then treats the sitting as
settled once it is 14 days old, dropping its speeches for good. And every
failure printed a line and returned normally, so the process exited 0, the
provenance row said 'ok', and the daily sync's non-fatal branch could never
fire. A silent loss reported as a success is the worst of the two.
"""
from __future__ import annotations

from unittest import mock

import pytest

import pipeline.ingest_floor_speeches as ifs

SITTINGS = [
    {"posedis_id": "-1", "stenograma_url": "https://x/1", "pradzia": "2026-08-01",
     "numeris": "1", "tipas": None},
    {"posedis_id": "-2", "stenograma_url": "https://x/2", "pradzia": "2026-08-02",
     "numeris": "2", "tipas": None},
]

TURN = {"asm_id": "111", "klb_id": "k1", "session_date": "2026-08-01",
        "duration_seconds": 30, "speech_date": "2026-08-01", "title": "t"}


def _run_ingest(insert_side_effect=None, fetch_side_effect=None):
    conn = mock.MagicMock()
    with mock.patch.object(ifs, "DB_DSN", "postgres://stub"), \
         mock.patch.object(ifs.psycopg2, "connect", return_value=conn), \
         mock.patch.object(ifs, "build_asm_id_map", return_value={"111": "uuid-1"}), \
         mock.patch.object(ifs, "fetch_sessions", return_value=[{"sesijos_id": "9", "pavadinimas": "s"}]), \
         mock.patch.object(ifs, "fetch_sittings", return_value=SITTINGS), \
         mock.patch.object(ifs, "load_sitting_state", return_value={}), \
         mock.patch.object(ifs, "record_sitting_state") as record, \
         mock.patch.object(ifs, "fetch_turns",
                           side_effect=fetch_side_effect or (lambda *a: [TURN])), \
         mock.patch.object(ifs, "execute_values", side_effect=insert_side_effect):
        result = ifs._ingest()
    return conn, record, result


def test_a_failed_insert_leaves_no_checkpoint_behind():
    """The checkpoint and the rows commit together or neither does.

    Asserted as: the failing sitting produced a rollback and no commit. If the
    two ever separate again, the second sitting's commit count gives it away.
    """
    conn, record, (_, _, failed_fetch, failed_write) = _run_ingest(
        insert_side_effect=[Exception("deadlock detected"), None]
    )
    assert failed_write == ["-1"]
    assert failed_fetch == []
    assert conn.rollback.call_count == 1
    # One commit, for the sitting that succeeded — not two.
    assert conn.commit.call_count == 1
    # record_sitting_state is still *called* for the failing sitting; what
    # matters is that its transaction is the one rolled back.
    assert record.call_count == 1


def test_a_fetch_failure_is_reported_and_writes_nothing():
    def boom(posedis_id, *a):
        if posedis_id == "-1":
            raise Exception("502 from lrs.lt")
        return [TURN]

    conn, record, (_, _, failed_fetch, failed_write) = _run_ingest(fetch_side_effect=boom)
    assert failed_fetch == ["-1"]
    assert failed_write == []
    assert conn.commit.call_count == 1


def test_a_clean_run_reports_no_failures():
    _, _, (attempted, _, failed_fetch, failed_write) = _run_ingest()
    assert (failed_fetch, failed_write) == ([], [])
    assert attempted == 2


def _run_run(ingest_result):
    conn = mock.MagicMock()
    fetch: dict = {}

    class _Recorder:
        def __enter__(self):
            return fetch

        def __exit__(self, exc_type, exc, tb):
            return False  # re-raise, exactly as record_fetch does

    with mock.patch.object(ifs, "DB_DSN", "postgres://stub"), \
         mock.patch.object(ifs.psycopg2, "connect", return_value=conn), \
         mock.patch.object(ifs, "record_fetch", lambda *a, **k: _Recorder()), \
         mock.patch.object(ifs, "_ingest", return_value=ingest_result):
        return ifs.run()


def test_run_exits_nonzero_when_a_sitting_failed():
    """The daily sync's `|| echo "floor-speech ingest failed"` branch is
    unreachable while this returns 0, and so is any future gate on it."""
    assert _run_run((10, 10, [], ["-1"])) == 1
    assert _run_run((10, 10, ["-2"], [])) == 1


def test_run_exits_zero_on_a_clean_run():
    assert _run_run((10, 10, [], [])) == 0


def test_the_failure_reaches_provenance_as_an_error():
    """record_fetch stamps status='error' only if the exception escapes the
    with-block, so the raise must happen inside it, not after."""
    conn = mock.MagicMock()
    seen: list = []

    class _Recorder:
        def __enter__(self):
            return {}

        def __exit__(self, exc_type, exc, tb):
            seen.append(exc_type)
            return False

    with mock.patch.object(ifs, "DB_DSN", "postgres://stub"), \
         mock.patch.object(ifs.psycopg2, "connect", return_value=conn), \
         mock.patch.object(ifs, "record_fetch", lambda *a, **k: _Recorder()), \
         mock.patch.object(ifs, "_ingest", return_value=(1, 1, [], ["-1"])):
        assert ifs.run() == 1
    assert seen == [ifs.IncompleteRun]
