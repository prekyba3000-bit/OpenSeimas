"""Shared runtime infrastructure: config, DB pool, caches, rate limiting, auth, scheduler.

All patchable callables live here — tests monkeypatch backend.core.* and every
router resolves these names through thin proxies, so patches propagate.
"""
from fastapi import HTTPException
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
import os
import sys
import time
import threading
import datetime
import logging
from typing import Optional
from collections import defaultdict

logger = logging.getLogger("seimas.api")

try:
    from backend.hero_engine import (
        calculate_hero_profile,
        calculate_all_hero_profiles,
        calculate_all_hero_profiles_fast,
        fetch_graph_mp_summaries,
    )
except ImportError:
    from hero_engine import (
        calculate_hero_profile,
        calculate_all_hero_profiles,
        calculate_all_hero_profiles_fast,
        fetch_graph_mp_summaries,
    )
try:
    from backend.share_card_renderer import render_share_card
except ImportError:
    from share_card_renderer import render_share_card

# Add root directory to sys.path to allow importing ingestion scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from pipeline.ingest_seimas import sync_db as sync_mps
    from pipeline.ingest_votes_v2 import sync_votes
except ImportError as e:
    print(f"Warning: Could not import ingestion scripts: {e}")
    sync_mps = None
    sync_votes = None

REFRESH_INTERVAL_SEC = int(os.getenv("REFRESH_INTERVAL", "1800"))  # 30 min default

_refresh_state = {
    "last_refresh": None,
    "last_error": None,
    "refresh_count": 0,
}
_refresh_stop = threading.Event()
_leaderboard_cache = {
    "entries": {},
    "openplanter_graph": None,  # {"timestamp": float, "data": dict} | None
}
_leaderboard_cache_lock = threading.Lock()
CACHE_DURATION_SEC = 3600
OPENPLANTER_GRAPH_CACHE_SEC = 300
# Caps keep the Cytoscape payload responsive when vote/declaration tables are large.
OPENPLANTER_GRAPH_MAX_VOTE_NODES = 55
OPENPLANTER_GRAPH_MAX_WEALTH_ROWS = 280
OPENPLANTER_GRAPH_MAX_INTEREST_ROWS = 120


def _refresh_materialized_view():
    """Refresh mp_stats_summary then mp_leaderboard_metrics (which depends on it).
    Runs in a background thread."""
    try:
        if not DB_DSN:
            _refresh_state["last_error"] = "DB_DSN not set"
            return
        conn = psycopg2.connect(DB_DSN)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_stats_summary;")
            cur.execute("SELECT to_regclass('public.mp_leaderboard_metrics') AS t")
            if cur.fetchone()[0]:
                cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_leaderboard_metrics;")
        conn.close()
        _refresh_state["last_refresh"] = datetime.datetime.utcnow().isoformat() + "Z"
        _refresh_state["last_error"] = None
        _refresh_state["refresh_count"] += 1
        print(f"[scheduler] Materialized view refreshed at {_refresh_state['last_refresh']}")
    except Exception as e:
        _refresh_state["last_error"] = str(e)
        print(f"[scheduler] Refresh failed: {e}")


def _scheduler_loop():
    """Periodically refresh the materialized view until stop event is set."""
    while not _refresh_stop.is_set():
        _refresh_materialized_view()
        _refresh_stop.wait(timeout=REFRESH_INTERVAL_SEC)



ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://dashboard-tawny-tau-42.vercel.app",
    "https://seimas-v2.vercel.app",
    "tauri://localhost",
]

DB_DSN = os.getenv("DB_DSN")
SYNC_SECRET = os.getenv("SYNC_SECRET")

if not SYNC_SECRET:
    print("WARNING: SYNC_SECRET not set — admin endpoints will reject all requests")

# Rate limiter (60 requests per minute per IP)
RATE_LIMIT = 60
RATE_WINDOW = 60
_rate_tracker: dict = defaultdict(list)


def check_rate_limit(ip: str) -> bool:
    now = time.time()
    _rate_tracker[ip] = [t for t in _rate_tracker[ip] if now - t < RATE_WINDOW]
    if len(_rate_tracker[ip]) >= RATE_LIMIT:
        return False
    _rate_tracker[ip].append(now)
    return True


def _table_exists(cur, table_name: str) -> bool:
    """Safe table existence check for optional pipeline tables."""
    cur.execute("SELECT to_regclass(%s) AS reg", (f"public.{table_name}",))
    return cur.fetchone()["reg"] is not None


def _require_admin_auth(authorization: Optional[str]) -> None:
    """
    Require Authorization: Bearer <SYNC_SECRET> for admin endpoints.
    When SYNC_SECRET is not configured, all admin requests are rejected.
    """
    if not SYNC_SECRET:
        raise HTTPException(status_code=503, detail="Admin endpoints disabled — SYNC_SECRET not configured")
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != SYNC_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# Connection pool (lazy init)
_pool = None


def get_pool():
    global _pool
    if _pool is None and DB_DSN:
        try:
            _pool = ThreadedConnectionPool(2, 10, DB_DSN)
        except Exception as e:
            print(f"Failed to create connection pool: {e}")
    return _pool


@contextmanager
def get_db_conn():
    """Context manager for database connections with automatic return to pool."""
    pool = get_pool()
    if not pool:
        yield None
        return
    conn = None
    try:
        conn = pool.getconn()
        conn.cursor_factory = RealDictCursor
        yield conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise
    finally:
        if conn:
            pool.putconn(conn)


# ─── API Endpoints ───────────────────────────────────────────────────────────

