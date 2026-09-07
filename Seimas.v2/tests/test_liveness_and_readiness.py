"""Liveness and readiness are different questions, and only one has an answer
a load balancer can act on.

`/health` returned 200 with `{"status": "degraded"}` in the body when the
database was gone. Render's health check reads the status code, so a service
that could not answer a single public request looked healthy to its host. The
body was correct and nothing that routes traffic reads bodies.

Splitting them rather than making `/health` fail: a failing `healthCheckPath`
on Render restarts the service, which cannot fix a Neon outage and would loop
through one on a free plan that already sleeps. Liveness stays 200 for the
host; readiness carries the status code, and the uptime probe reads that.
"""
from __future__ import annotations

from contextlib import contextmanager
from unittest import mock

import pytest
from httpx import ASGITransport, AsyncClient

import backend.core as core
from backend.main import app


@contextmanager
def _no_db():
    yield None


@contextmanager
def _raises_db():
    raise RuntimeError("could not connect to server")
    yield  # pragma: no cover


@contextmanager
def _working_db():
    conn = mock.MagicMock()
    cur = mock.MagicMock()
    conn.cursor.return_value.__enter__ = lambda s: cur
    conn.cursor.return_value.__exit__ = lambda s, *a: None
    yield conn


async def _get(path):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        return await c.get(path)


@pytest.mark.asyncio
@pytest.mark.parametrize("db", [_no_db, _raises_db])
async def test_readiness_fails_loudly_when_the_database_is_gone(monkeypatch, db):
    monkeypatch.setattr(core, "get_db_conn", db)
    resp = await _get("/health/ready")
    assert resp.status_code == 503
    assert resp.json()["ready"] is False


@pytest.mark.asyncio
async def test_readiness_is_200_when_the_database_answers(monkeypatch):
    monkeypatch.setattr(core, "get_db_conn", _working_db)
    resp = await _get("/health/ready")
    assert resp.status_code == 200
    assert resp.json() == {"ready": True, "database": "connected"}


@pytest.mark.asyncio
async def test_liveness_stays_200_and_says_degraded_in_the_body(monkeypatch):
    """Deliberate. Render restarts on a failing check, and a restart does not
    reconnect a database that is down."""
    monkeypatch.setattr(core, "get_db_conn", _no_db)
    resp = await _get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "degraded"
    assert resp.json()["database"] == "disconnected"


def test_the_hosting_health_check_still_points_at_liveness():
    """If `healthCheckPath` is ever moved to readiness, that is a decision
    about restart behaviour on a free plan, not a tidy-up."""
    import pathlib
    import re

    render = (
        pathlib.Path(__file__).resolve().parent.parent.parent / "render.yaml"
    ).read_text()
    assert re.search(r"healthCheckPath:\s*/health\s*$", render, flags=re.M)


def test_the_uptime_probe_reads_readiness():
    """It used to grep `"status":"ok"` out of the liveness body — correct, and
    dependent on nobody ever rewording that string."""
    import pathlib

    script = (
        pathlib.Path(__file__).resolve().parent.parent.parent
        / "scripts" / "local-ops" / "uptime_check.sh"
    ).read_text()
    assert "/health/ready" in script
