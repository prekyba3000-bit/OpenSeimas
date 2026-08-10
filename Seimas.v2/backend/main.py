"""FastAPI app assembly: middleware, exception handlers, lifespan, routers.

Import surface kept stable: `backend.main:app` is the gunicorn/uvicorn target.
Runtime helpers live in backend.core; monkeypatch backend.core.* in tests.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import threading
from typing import Dict, Optional, Any

from backend import core
from backend.core import (  # noqa: F401 — re-exported for backward compatibility
    ALLOWED_ORIGINS,
    DB_DSN,
    SYNC_SECRET,
    REFRESH_INTERVAL_SEC,
    _refresh_state,
    _refresh_stop,
    _leaderboard_cache,
    _leaderboard_cache_lock,
    _scheduler_loop,
    _refresh_materialized_view,
    get_pool,
    get_db_conn,
    check_rate_limit,
    _table_exists,
    _require_admin_auth,
    calculate_hero_profile,
    calculate_all_hero_profiles,
    calculate_all_hero_profiles_fast,
    fetch_graph_mp_summaries,
    render_share_card,
    sync_mps,
    sync_votes,
    logger,
)
from backend.routes_public import router as public_router
from backend.routes_heroes import router as heroes_router
from backend.routes_forensics import router as forensics_router
from backend.routes_admin import router as admin_router
from backend.routes_meta import router as meta_router
from backend.routes_trust import router as trust_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=core._scheduler_loop, daemon=True, name="mv-refresh")
    t.start()
    print(f"[scheduler] Started background refresh every {core.REFRESH_INTERVAL_SEC}s")
    yield
    core._refresh_stop.set()
    t.join(timeout=5)
    print("[scheduler] Stopped background refresh")


app = FastAPI(title="Skaidrus Seimas API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=core.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://dashboard.*\.vercel\.app",
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)


def _problem_details(
    *,
    status: int,
    title: str,
    detail: str,
    instance: str,
    type_uri: str = "about:blank",
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "type": type_uri,
        "title": title,
        "status": status,
        "detail": detail,
        "instance": instance,
    }
    if extra:
        payload.update(extra)
    return payload


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    title = "HTTP Error"
    if exc.status_code == 404:
        title = "Not Found"
    elif exc.status_code == 429:
        title = "Too Many Requests"
    elif exc.status_code >= 500:
        title = "Internal Server Error"
    detail = str(exc.detail) if exc.detail else "Request failed"
    payload = _problem_details(
        status=exc.status_code,
        title=title,
        detail=detail,
        instance=request.url.path,
    )
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    payload = _problem_details(
        status=422,
        title="Validation Error",
        detail="Request validation failed",
        instance=request.url.path,
        type_uri="https://openseimas.local/problems/validation-error",
        extra={"errors": exc.errors()},
    )
    return JSONResponse(status_code=422, content=payload)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled exception at {request.url.path}: {exc}")
    payload = _problem_details(
        status=500,
        title="Internal Server Error",
        detail="Unexpected server error",
        instance=request.url.path,
    )
    return JSONResponse(status_code=500, content=payload)

# Suppress browser 404s for common static files
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/robots.txt", include_in_schema=False)
def robots():
    return Response("User-agent: *\nDisallow: /api/", media_type="text/plain")


app.include_router(public_router)
app.include_router(heroes_router)
app.include_router(forensics_router)
app.include_router(admin_router)
app.include_router(meta_router)
app.include_router(trust_router)
