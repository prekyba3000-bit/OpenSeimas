"""A run that failed must be able to say so.

`record_fetch`'s docstring promises that "failures are recorded with their
error and re-raised — a run that half failed must not look identical to one
that succeeded". It could not keep that promise against a real database: a
failed statement aborts the whole transaction in Postgres, so the UPDATE that
records the error raised "current transaction is aborted" instead of running.
The original exception was replaced by a second one about the recording, and
the `source_fetches` row stayed 'running' for good.
"""
from __future__ import annotations

import pytest

from pipeline.common import record_fetch


class _AbortingCursor:
    """Postgres after a failed statement: everything raises until a rollback."""

    def __init__(self):
        self.aborted = False
        self.statements: list[str] = []

    def execute(self, sql, params=None):
        if self.aborted:
            raise RuntimeError("current transaction is aborted, commands ignored")
        self.statements.append(sql)

    def fetchone(self):
        return ["source_fetches"] if "to_regclass" in self.statements[-1] else [7]


class _Conn:
    def __init__(self, cur):
        self._cur = cur

    def cursor(self):
        return self._cur

    def commit(self):
        pass

    def rollback(self):
        self._cur.aborted = False


def test_the_error_is_recorded_rather_than_masked_by_a_second_one():
    cur = _AbortingCursor()
    conn = _Conn(cur)

    with pytest.raises(ValueError, match="the real failure"):
        with record_fetch(conn, "seimas_test", "https://example.invalid"):
            cur.aborted = True  # the ingest's own statement failed
            raise ValueError("the real failure")

    assert any("status='error'" in s for s in cur.statements), (
        "the failure was never written; the row is still 'running'"
    )


def test_the_original_exception_still_reaches_the_caller():
    """Recording must not swallow it — the runner's exit status depends on it."""
    cur = _AbortingCursor()
    with pytest.raises(ValueError):
        with record_fetch(_Conn(cur), "seimas_test"):
            cur.aborted = True
            raise ValueError("boom")
