"""A dropped database connection must not become a run of failures.

Neon closes idle sessions. The pool then hands out a socket whose far end is
gone, the query dies with "SSL SYSCALL error: EOF detected", and — before this
— `putconn` returned that same dead connection to the pool for the next request
to collect. One dropped socket became a sequence of 500s on a site that is idle
most of the day by design.
"""
from unittest.mock import MagicMock

import psycopg2
import pytest

from backend import core


class _Pool:
    def __init__(self, conn):
        self.conn = conn
        self.returned = []

    def getconn(self):
        return self.conn

    def putconn(self, conn, close=False):
        self.returned.append((conn, close))


def test_a_dropped_connection_is_evicted_not_recycled(monkeypatch):
    conn = MagicMock()
    pool = _Pool(conn)
    monkeypatch.setattr(core, "get_pool", lambda: pool)

    with pytest.raises(psycopg2.OperationalError):
        with core.get_db_conn() as c:
            assert c is conn
            raise psycopg2.OperationalError("SSL SYSCALL error: EOF detected")

    assert pool.returned == [(conn, True)], "a dead connection must not go back in the pool"


def test_a_healthy_connection_is_returned_for_reuse(monkeypatch):
    conn = MagicMock()
    pool = _Pool(conn)
    monkeypatch.setattr(core, "get_pool", lambda: pool)

    with core.get_db_conn() as c:
        assert c is conn

    assert pool.returned == [(conn, False)], "a live connection must be reused"


def test_an_ordinary_error_does_not_evict_the_connection(monkeypatch):
    """A bad query is the query's fault, not the socket's. Evicting on every
    exception would churn the pool for reasons that have nothing to do with it."""
    conn = MagicMock()
    pool = _Pool(conn)
    monkeypatch.setattr(core, "get_pool", lambda: pool)

    with pytest.raises(ValueError):
        with core.get_db_conn():
            raise ValueError("bad query")

    assert pool.returned == [(conn, False)]


def test_no_pool_yields_none_rather_than_raising(monkeypatch):
    monkeypatch.setattr(core, "get_pool", lambda: None)
    with core.get_db_conn() as c:
        assert c is None


def test_the_pool_sets_keepalives(monkeypatch):
    """Without these Neon drops the session and the first request after a quiet
    spell fails, which on this site is most requests."""
    captured = {}

    def fake_pool(minconn, maxconn, dsn, **kwargs):
        captured.update(kwargs)
        return MagicMock()

    monkeypatch.setattr(core, "ThreadedConnectionPool", fake_pool)
    monkeypatch.setattr(core, "_pool", None)
    monkeypatch.setattr(core, "DB_DSN", "postgresql://x/y")
    core.get_pool()
    assert captured.get("keepalives") == 1
    assert captured.get("keepalives_idle", 0) > 0
