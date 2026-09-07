"""Health, admin (auth-gated sync/refresh), and root endpoints."""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Response
from typing import Optional

from backend.core import _refresh_state, _refresh_materialized_view

from backend import core
from backend.core import (
    _leaderboard_cache,
    _leaderboard_cache_lock,
    CACHE_DURATION_SEC,
    OPENPLANTER_GRAPH_CACHE_SEC,
    logger,
)


# Call-time proxies — keep bare names in route bodies patchable via backend.core.
def get_db_conn():
    return core.get_db_conn()


def check_rate_limit(ip):
    return core.check_rate_limit(ip)


def _table_exists(cur, table_name):
    return core._table_exists(cur, table_name)


def _require_admin_auth(authorization):
    return core._require_admin_auth(authorization)


router = APIRouter()



def _database_status() -> str:
    try:
        with get_db_conn() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    return "connected"
    except Exception:
        return "error"
    return "disconnected"


@router.get("/health")
def health():
    """Liveness: this process is running and answering.

    Always 200 while the process is up, deliberately. Render's
    `healthCheckPath` points here, and a failing check there does not route
    around a broken database — it restarts the service, which cannot fix a
    Neon outage and would loop through one on a free plan that already sleeps.

    The body still reports the database, and it is the body the uptime probe
    reads. Readiness — the thing that returns a non-2xx when the database is
    gone — is `/health/ready`.
    """
    db_status = _database_status()
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
    }


@router.get("/health/ready")
def health_ready(response: Response):
    """Readiness: this process can serve requests.

    503 when the database is unreachable. Every public route needs it, so a
    process without it is up and useless, and the HTTP status has to say so —
    `/health` returned 200 with `"status": "degraded"` in the body, which no
    load balancer reads.
    """
    db_status = _database_status()
    ready = db_status == "connected"
    if not ready:
        response.status_code = 503
    return {"ready": ready, "database": db_status}


@router.get("/api/admin/refresh-status")
def refresh_status():
    """Check the status of the background materialized view refresh."""
    return {
        "interval_seconds": core.REFRESH_INTERVAL_SEC,
        **_refresh_state,
    }


@router.post("/api/admin/refresh")
def trigger_refresh(background_tasks: BackgroundTasks, authorization: Optional[str] = Header(default=None)):
    """Manually trigger a materialized view refresh."""
    _require_admin_auth(authorization)
    background_tasks.add_task(_refresh_materialized_view)
    return {"status": "Refresh triggered"}


@router.post("/api/admin/sync/mps")
def trigger_sync_mps(background_tasks: BackgroundTasks, authorization: Optional[str] = Header(default=None)):
    """Trigger MP data sync from LRS."""
    _require_admin_auth(authorization)

    if not core.sync_mps:
        raise HTTPException(status_code=500, detail="Ingestion script not loaded")

    background_tasks.add_task(core.sync_mps)
    return {"status": "MP sync started in background"}


@router.post("/api/admin/sync/votes")
def trigger_sync_votes(background_tasks: BackgroundTasks, authorization: Optional[str] = Header(default=None)):
    """Trigger Vote data sync (recent votes)."""
    _require_admin_auth(authorization)

    if not core.sync_votes:
        raise HTTPException(status_code=500, detail="Ingestion script not loaded")

    background_tasks.add_task(core.sync_votes)
    return {"status": "Vote sync started in background"}


@router.get("/")
def root():
    return {"name": "Skaidrus Seimas API", "version": "2.0", "docs": "/docs"}


