r"""Which browsers may read this API, and on whose behalf.

`allow_origin_regex=r"https://dashboard.*\.vercel\.app"` matched any Vercel
project whose name begins with "dashboard" — anyone's, since that namespace is
open to registration. Not an authentication bypass: admin routes take a Bearer
token and CORS never hands one out. But a browser trust policy far wider than
the three deployments that exist, all already named in ALLOWED_ORIGINS.

`allow_credentials=True` went with it. Nothing in the dashboard, the Tauri
build or the Android WebView sends a credentialed request, so it granted an
ability no client uses.
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app
import backend.core as core


async def _preflight(origin: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        return await c.options(
            "/api/stats",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )


@pytest.mark.asyncio
@pytest.mark.parametrize("origin", [
    "https://seimas-v2.vercel.app",
    "https://open-seimas-dashboard.vercel.app",
    "http://localhost:5173",
    "https://localhost",          # Capacitor Android WebView
])
async def test_the_real_deployments_are_allowed(origin):
    resp = await _preflight(origin)
    assert resp.headers.get("access-control-allow-origin") == origin


@pytest.mark.asyncio
@pytest.mark.parametrize("origin", [
    # Registrable by anyone, and matched by the old regex.
    "https://dashboard-evil.vercel.app",
    "https://dashboard.vercel.app",
    "https://dashboardanything.vercel.app",
    "https://not-ours.example.com",
])
async def test_a_lookalike_vercel_project_is_not_allowed(origin):
    resp = await _preflight(origin)
    assert resp.headers.get("access-control-allow-origin") is None


@pytest.mark.asyncio
async def test_no_credentialed_access_is_granted():
    resp = await _preflight("https://seimas-v2.vercel.app")
    assert resp.headers.get("access-control-allow-credentials") is None


def test_the_wildcard_is_not_reintroduced():
    """A regex is the natural place to put the next preview URL. Add it to
    CORS_EXTRA_ORIGINS instead — deliberately, and one origin at a time."""
    import inspect

    source = inspect.getsource(__import__("backend.main", fromlist=["x"]))
    code = "\n".join(l for l in source.splitlines() if not l.strip().startswith("#"))
    assert "allow_origin_regex" not in code
    assert "allow_credentials=True" not in code


def test_every_listed_origin_is_a_concrete_origin():
    for origin in core.ALLOWED_ORIGINS:
        assert "*" not in origin, origin
        assert origin == origin.strip()
        assert "://" in origin, origin
