from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Header, Query
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field
from contextlib import asynccontextmanager, contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
import os
import time
import sys
import threading
import datetime
import hashlib
from typing import List, Dict, Optional, Any
from collections import defaultdict
try:
    from backend.hero_engine import calculate_hero_profile, calculate_all_hero_profiles
except ImportError:
    from hero_engine import calculate_hero_profile, calculate_all_hero_profiles
try:
    from backend.share_card_renderer import render_share_card
except ImportError:
    from share_card_renderer import render_share_card

# Add root directory to sys.path to allow importing ingestion scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from ingest_seimas import sync_db as sync_mps
    from ingest_votes_v2 import sync_votes
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


class HeroMpResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    party: Optional[str] = None
    photo: Optional[str] = None
    active: Optional[bool] = None
    seimas_id: Optional[int] = None


class HeroAttributesResponse(BaseModel):
    STR: float
    WIS: float
    CHA: float
    INT: float
    STA: float


class HeroArtifactResponse(BaseModel):
    name: str
    rarity: str


class HeroProfileResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mp: HeroMpResponse
    level: int
    xp: int
    xp_current_level: int
    xp_next_level: int
    alignment: str
    attributes: HeroAttributesResponse
    artifacts: List[HeroArtifactResponse]
    metrics: Dict[str, Any] = Field(default_factory=dict)
    metrics_provenance: Dict[str, str] = Field(default_factory=dict)
    forensic_breakdown: Dict[str, Any] = Field(default_factory=dict)


class HeroSearchResponse(BaseModel):
    query: str
    total: int
    results: List[HeroProfileResponse]


def _openplanter_graph_slug(prefix: str, key: str) -> str:
    """Stable cytoscape id from human-readable text (party name, committee title, …)."""
    text = (key or "").strip()
    if not text:
        return f"{prefix}:unknown"
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}:{digest}"


def _openplanter_graph_node_element(
    node_id: str,
    label: str,
    category: str,
    **extra: Any,
) -> Dict[str, Any]:
    """Single Cytoscape node element with Seimas/OpenPlanter shared fields."""
    data: Dict[str, Any] = {
        "id": node_id,
        "label": (label or node_id)[:220],
        "category": category,
        "party": "",
        "alignment": "",
        "integrity_score": 0,
        "xp": 0,
        "level": 0,
    }
    for k, v in extra.items():
        if v is not None:
            data[k] = v
    return {"data": data}


def _refresh_materialized_view():
    """Refresh mp_stats_summary. Runs in a background thread."""
    try:
        if not DB_DSN:
            _refresh_state["last_error"] = "DB_DSN not set"
            return
        conn = psycopg2.connect(DB_DSN)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mp_stats_summary;")
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=_scheduler_loop, daemon=True, name="mv-refresh")
    t.start()
    print(f"[scheduler] Started background refresh every {REFRESH_INTERVAL_SEC}s")
    yield
    _refresh_stop.set()
    t.join(timeout=5)
    print("[scheduler] Stopped background refresh")


app = FastAPI(title="Skaidrus Seimas API", lifespan=lifespan)


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

# CORS — allow Vercel frontend, Render previews, and localhost dev
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://dashboard-tawny-tau-42.vercel.app",
    "https://seimas-v2.vercel.app",
    "tauri://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://dashboard.*\.vercel\.app",
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

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


@app.get("/api/stats")
def get_stats(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            cur.execute("SELECT count(*) as count FROM politicians WHERE is_active = TRUE")
            mp_count = cur.fetchone()["count"]

            cur.execute("SELECT count(*) as count FROM votes")
            vote_count = cur.fetchone()["count"]

            cur.execute("SELECT count(*) as count FROM mp_votes")
            mp_vote_count = cur.fetchone()["count"]

            return {
                "total_mps": mp_count,
                "historical_votes": f"{vote_count:,}",
                "individual_votes": f"{mp_vote_count:,}",
                "accuracy": "99.9%",
            }


@app.get("/api/activity")
def get_activity():
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.display_name, v.title, mv.vote_choice, v.sitting_date
                FROM mp_votes mv
                JOIN politicians p ON mv.politician_id = p.id
                JOIN votes v ON mv.vote_id = v.seimas_vote_id
                WHERE mv.vote_choice IN ('Prieš', 'Susilaikė')
                ORDER BY v.sitting_date DESC, v.created_at DESC
                LIMIT 5
            """)
            rows = cur.fetchall()
            return [
                {
                    "name": row["display_name"],
                    "action": f"Voted {row['vote_choice']}",
                    "context": (row["title"][:50] + "...") if len(row["title"]) > 50 else row["title"],
                    "time": str(row["sitting_date"]),
                }
                for row in rows
            ]


@app.get("/api/mps")
def get_mps():
    """List all active MPs."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            has_stats = _table_exists(cur, "mp_stats_summary")

            # Check if social_links column exists
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'politicians' AND column_name = 'social_links'
            """)
            has_social = cur.fetchone() is not None

            social_col = "p.social_links," if has_social else ""
            stats_join = "LEFT JOIN mp_stats_summary s ON p.id = s.mp_id" if has_stats else ""
            stats_cols = """
                    COALESCE(s.total_votes_cast, 0) AS vote_count,
                    COALESCE(s.attendance_percentage, 0) AS attendance,
                    s.most_frequent_vote
            """ if has_stats else """
                    0 AS vote_count,
                    0 AS attendance,
                    NULL AS most_frequent_vote
            """

            cur.execute(f"""
                SELECT
                    p.id,
                    p.display_name,
                    p.full_name_normalized,
                    p.current_party,
                    p.is_active,
                    p.photo_url,
                    {social_col}
                    {stats_cols}
                FROM politicians p
                {stats_join}
                ORDER BY p.full_name_normalized;
            """)
            rows = cur.fetchall()
            return [
                {
                    "id": str(row["id"]),
                    "name": row["display_name"],
                    "normalized_name": row["full_name_normalized"],
                    "party": row["current_party"],
                    "is_active": row["is_active"],
                    "photo_url": row["photo_url"],
                    "social_links": row.get("social_links") or {},
                    "vote_count": row["vote_count"],
                    "attendance": float(row["attendance"]),
                    "vote_mode": row["most_frequent_vote"]
                }
                for row in rows
            ]


@app.get("/api/mps/compare")
def compare_mps(ids: str):
    """Compare voting records between 2-4 MPs."""
    mp_ids = [i.strip() for i in ids.split(",") if i.strip()]

    if len(mp_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 MP IDs required")
    if len(mp_ids) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 MPs can be compared")

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name, current_party, photo_url
                FROM politicians
                WHERE id = ANY(%s::uuid[])
            """, (mp_ids,))
            mp_rows = cur.fetchall()

            if len(mp_rows) != len(mp_ids):
                raise HTTPException(status_code=404, detail="One or more MPs not found")

            mps = [
                {
                    "id": str(row["id"]),
                    "name": row["display_name"],
                    "party": row["current_party"],
                    "photo": row["photo_url"],
                }
                for row in mp_rows
            ]

            # Pairwise alignment
            alignment_matrix = []
            for i, mp1_id in enumerate(mp_ids):
                row = []
                for j, mp2_id in enumerate(mp_ids):
                    if i == j:
                        row.append(1.0)
                    else:
                        cur.execute("""
                            SELECT
                                COUNT(*) as total,
                                SUM(CASE WHEN mv1.vote_choice = mv2.vote_choice THEN 1 ELSE 0 END) as agreed
                            FROM mp_votes mv1
                            JOIN mp_votes mv2 ON mv1.vote_id = mv2.vote_id
                            WHERE mv1.politician_id = %s::uuid
                              AND mv2.politician_id = %s::uuid
                              AND mv1.vote_choice IS NOT NULL
                              AND mv2.vote_choice IS NOT NULL
                        """, (mp1_id, mp2_id))
                        result = cur.fetchone()
                        total = result["total"] or 0
                        agreed = result["agreed"] or 0
                        alignment = round(agreed / total, 3) if total > 0 else 0
                        row.append(alignment)
                alignment_matrix.append(row)

            # Recent divergent votes
            cur.execute("""
                SELECT DISTINCT v.seimas_vote_id, v.title, v.sitting_date
                FROM votes v
                JOIN mp_votes mv1 ON v.seimas_vote_id = mv1.vote_id
                JOIN mp_votes mv2 ON v.seimas_vote_id = mv2.vote_id
                WHERE mv1.politician_id = ANY(%s::uuid[])
                  AND mv2.politician_id = ANY(%s::uuid[])
                  AND mv1.politician_id != mv2.politician_id
                  AND mv1.vote_choice != mv2.vote_choice
                  AND mv1.vote_choice IS NOT NULL
                  AND mv2.vote_choice IS NOT NULL
                ORDER BY v.sitting_date DESC
                LIMIT 10
            """, (mp_ids, mp_ids))
            divergent_votes_raw = cur.fetchall()

            divergent_votes = []
            for vote_row in divergent_votes_raw:
                vote_id = vote_row["seimas_vote_id"]
                cur.execute("""
                    SELECT politician_id, vote_choice
                    FROM mp_votes
                    WHERE vote_id = %s AND politician_id = ANY(%s::uuid[])
                """, (vote_id, mp_ids))
                mp_votes_map = {str(r["politician_id"]): r["vote_choice"] for r in cur.fetchall()}

                divergent_votes.append({
                    "vote_id": vote_id,
                    "title": (vote_row["title"][:80] + "...") if len(vote_row["title"]) > 80 else vote_row["title"],
                    "date": str(vote_row["sitting_date"]),
                    "votes": mp_votes_map,
                })

            return {
                "mps": mps,
                "alignment_matrix": alignment_matrix,
                "divergent_votes": divergent_votes,
            }


@app.get("/api/mps/{mp_id}")
def get_mp(mp_id: str):
    """Get details for a single MP."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.id, p.display_name, p.current_party, p.photo_url, p.social_links,
                       p.is_active, p.seimas_mp_id,
                       COUNT(DISTINCT mv.vote_id) as vote_count
                FROM politicians p
                LEFT JOIN mp_votes mv ON p.id = mv.politician_id
                WHERE p.id = %s::uuid
                GROUP BY p.id
            """, (mp_id,))
            row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="MP not found")

            return {
                "id": str(row["id"]),
                "name": row["display_name"],
                "party": row["current_party"],
                "photo": row["photo_url"],
                "social_links": row["social_links"] or {},
                "active": row["is_active"],
                "seimas_id": row["seimas_mp_id"],
                "vote_count": row["vote_count"],
            }


@app.get("/api/mps/{mp_id}/votes")
def get_mp_votes(mp_id: str, limit: int = 20):
    """Get recent votes for an MP."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            cur.execute("""
                SELECT v.title, v.sitting_date, mv.vote_choice
                FROM mp_votes mv
                JOIN votes v ON mv.vote_id = v.seimas_vote_id
                WHERE mv.politician_id = %s::uuid
                ORDER BY v.sitting_date DESC
                LIMIT %s
            """, (mp_id, limit))
            rows = cur.fetchall()

            return [
                {
                    "title": (row["title"][:80] + "...") if len(row["title"]) > 80 else row["title"],
                    "date": str(row["sitting_date"]),
                    "choice": row["vote_choice"],
                }
                for row in rows
            ]


@app.get("/api/v2/heroes/leaderboard", response_model=List[HeroProfileResponse])
def get_hero_leaderboard(limit: int = 20):
    """Get all active MP hero profiles sorted by level/xp."""
    safe_limit = max(1, min(limit, 200))
    now = time.time()

    with _leaderboard_cache_lock:
        cached_entry = _leaderboard_cache["entries"].get(safe_limit)
        if cached_entry and (now - float(cached_entry["timestamp"])) < CACHE_DURATION_SEC:
            print("Leaderboard: returning cached version.")
            return cached_entry["data"]

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            try:
                print("Leaderboard: re-calculating and caching.")
                all_profiles = calculate_all_hero_profiles(
                    db_cursor=cur, active_only=True, limit=safe_limit
                )
                with _leaderboard_cache_lock:
                    _leaderboard_cache["entries"][safe_limit] = {
                        "data": all_profiles,
                        "timestamp": now,
                    }
                return all_profiles
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to build leaderboard: {exc}")


@app.get("/api/v2/heroes/search", response_model=HeroSearchResponse)
def search_heroes(
    request: Request,
    q: str = Query(..., min_length=1, max_length=120),
    limit: int = Query(20, ge=1),
):
    """Search active MPs by name/party and return hero profiles."""
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    normalized_q = q.strip()
    if len(normalized_q) < 2:
        raise HTTPException(status_code=422, detail="Query must be at least 2 non-space characters")

    safe_limit = max(1, min(limit, 50))
    like_q = f"%{normalized_q}%"

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    SELECT id::text AS id
                    FROM politicians
                    WHERE is_active = TRUE
                      AND (
                        display_name ILIKE %s
                        OR COALESCE(current_party, '') ILIKE %s
                      )
                    ORDER BY display_name ASC
                    LIMIT %s
                    """,
                    (like_q, like_q, safe_limit),
                )
                rows = cur.fetchall()
                results: List[Dict[str, Any]] = []
                for row in rows:
                    mp_id = str(row["id"])
                    try:
                        results.append(calculate_hero_profile(mp_id=mp_id, db_cursor=cur))
                    except ValueError:
                        continue
                return {
                    "query": normalized_q,
                    "total": len(results),
                    "results": results,
                }
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to search heroes: {exc}")


@app.get("/api/v2/heroes/{mp_id}", response_model=HeroProfileResponse)
def get_hero_profile(mp_id: str):
    """Get the gamified hero profile for a single MP."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            try:
                return calculate_hero_profile(mp_id=mp_id, db_cursor=cur)
            except ValueError:
                raise HTTPException(status_code=404, detail="MP not found")
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to build hero profile: {exc}")


def _build_openplanter_graph_payload(cur) -> Dict:
    """Build Cytoscape-style nodes/edges: MPs, phantom links, parties, committees, wealth, interests, votes."""
    all_profiles = calculate_all_hero_profiles(
        db_cursor=cur, active_only=True, limit=500
    )

    nodes: List[Dict] = []
    mp_ids: set = set()
    for prof in all_profiles:
        mp = prof.get("mp") or {}
        mp_id = str(mp.get("id") or "")
        if not mp_id:
            continue
        mp_ids.add(mp_id)
        int_score = prof.get("attributes", {}).get("INT")
        try:
            integrity_score = int(round(float(int_score))) if int_score is not None else 0
        except (TypeError, ValueError):
            integrity_score = 0
        nodes.append(
            {
                "data": {
                    "id": mp_id,
                    "label": mp.get("name") or "Unknown",
                    "category": "politician",
                    "party": mp.get("party") or "Unknown",
                    "alignment": prof.get("alignment") or "Unknown",
                    "integrity_score": integrity_score,
                    "xp": int(prof.get("xp") or 0),
                    "level": int(prof.get("level") or 0),
                }
            }
        )

    edges: List[Dict] = []
    known_node_ids: set = set(mp_ids)

    if _table_exists(cur, "indirect_links"):
        # indirect_links.mp_id is typically Seimas numeric id → politicians.seimas_mp_id
        cur.execute(
            """
            SELECT il.id, il.mp_id, il.target_entity_code, il.target_entity_name,
                   il.hop_count, il.has_procurement_hit, p.id AS politician_uuid
            FROM indirect_links il
            LEFT JOIN politicians p
              ON p.seimas_mp_id IS NOT NULL AND p.seimas_mp_id = il.mp_id
            """
        )
        seen_entity_nodes: set = set()
        for row in cur.fetchall():
            puuid = row.get("politician_uuid")
            if puuid is None:
                continue
            src = str(puuid)
            if src not in mp_ids:
                continue
            code = row.get("target_entity_code") or ""
            if not code:
                continue
            ent_id = f"entity:{code}"
            if ent_id not in seen_entity_nodes:
                seen_entity_nodes.add(ent_id)
                label = row.get("target_entity_name") or code
                nodes.append(
                    {
                        "data": {
                            "id": ent_id,
                            "label": str(label)[:120],
                            "category": "phantom_entity",
                            "party": "",
                            "alignment": "",
                            "integrity_score": 0,
                            "xp": 0,
                            "level": 0,
                        }
                    }
                )
                known_node_ids.add(ent_id)
            il_id = row.get("id")
            hop = row.get("hop_count")
            proc = bool(row.get("has_procurement_hit"))
            edges.append(
                {
                    "data": {
                        "id": f"phantom_{il_id}",
                        "source": src,
                        "target": ent_id,
                        "label": "phantom_network",
                        "hop_count": int(hop) if hop is not None else 0,
                        "has_procurement_hit": proc,
                    }
                }
            )

    uuid_list: List[str] = list(mp_ids)
    if uuid_list and _table_exists(cur, "politicians"):
        # --- Political parties (distinct among active MPs in this graph) ---
        cur.execute(
            """
            SELECT DISTINCT TRIM(current_party) AS party
            FROM politicians
            WHERE is_active = TRUE
              AND id = ANY(%s::uuid[])
              AND current_party IS NOT NULL
              AND TRIM(current_party) <> ''
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            pname = (row.get("party") or "").strip()
            if not pname:
                continue
            pid = _openplanter_graph_slug("party", pname)
            if pid not in known_node_ids:
                known_node_ids.add(pid)
                nodes.append(_openplanter_graph_node_element(pid, pname, "party"))

        cur.execute(
            """
            SELECT id::text AS mp_id, TRIM(current_party) AS party
            FROM politicians
            WHERE is_active = TRUE
              AND id = ANY(%s::uuid[])
              AND current_party IS NOT NULL
              AND TRIM(current_party) <> ''
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            mp = row["mp_id"]
            pname = (row.get("party") or "").strip()
            if not pname:
                continue
            pid = _openplanter_graph_slug("party", pname)
            edges.append(
                {
                    "data": {
                        "id": f"belongs_{mp}_{pid}",
                        "source": mp,
                        "target": pid,
                        "label": "belongs_to",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "committee_memberships"):
        cur.execute(
            """
            SELECT DISTINCT TRIM(cm.committee_name) AS committee_name
            FROM committee_memberships cm
            INNER JOIN politicians p ON p.id = cm.mp_id AND p.is_active = TRUE
            WHERE cm.mp_id = ANY(%s::uuid[])
              AND cm.committee_name IS NOT NULL
              AND TRIM(cm.committee_name) <> ''
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            cname = (row.get("committee_name") or "").strip()
            if not cname:
                continue
            cid = _openplanter_graph_slug("committee", cname)
            if cid not in known_node_ids:
                known_node_ids.add(cid)
                nodes.append(_openplanter_graph_node_element(cid, cname, "committee"))

        cur.execute(
            """
            SELECT cm.id::text AS cm_id, cm.mp_id::text AS mp_id,
                   TRIM(cm.committee_name) AS committee_name, cm.role
            FROM committee_memberships cm
            INNER JOIN politicians p ON p.id = cm.mp_id AND p.is_active = TRUE
            WHERE cm.mp_id = ANY(%s::uuid[])
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            cname = (row.get("committee_name") or "").strip()
            if not cname:
                continue
            cid = _openplanter_graph_slug("committee", cname)
            role = (row.get("role") or "").strip()
            edges.append(
                {
                    "data": {
                        "id": f"serves_{row['cm_id']}",
                        "source": row["mp_id"],
                        "target": cid,
                        "label": "serves_on",
                        "role": role[:120] if role else "",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "mp_assets"):
        cur.execute(
            """
            SELECT id::text AS wid, politician_id::text AS mp_id, year,
                   COALESCE(total_income_eur, 0) AS income_eur
            FROM mp_assets
            WHERE politician_id = ANY(%s::uuid[])
            ORDER BY year DESC
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_WEALTH_ROWS),
        )
        for row in cur.fetchall():
            wid = f"wealth:{row['wid']}"
            if wid not in known_node_ids:
                known_node_ids.add(wid)
                yr = row.get("year")
                income = row.get("income_eur")
                label = f"Wealth declaration {yr}" if yr is not None else "Wealth declaration"
                sub = f"Income declared: {income} EUR" if income is not None else ""
                nodes.append(
                    _openplanter_graph_node_element(
                        wid,
                        label,
                        "wealth_declaration",
                        detail=sub[:160],
                    )
                )
            edges.append(
                {
                    "data": {
                        "id": f"has_wealth_{row['wid']}",
                        "source": row["mp_id"],
                        "target": wid,
                        "label": "filed_wealth_declaration",
                    }
                }
            )
    elif uuid_list and _table_exists(cur, "assets"):
        cur.execute(
            """
            SELECT id::text AS wid, politician_id::text AS mp_id, year,
                   COALESCE(total_value, 0) AS total_value
            FROM assets
            WHERE politician_id = ANY(%s::uuid[])
            ORDER BY year DESC
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_WEALTH_ROWS),
        )
        for row in cur.fetchall():
            wid = f"wealth:{row['wid']}"
            if wid not in known_node_ids:
                known_node_ids.add(wid)
                yr = row.get("year")
                val = row.get("total_value")
                label = f"Asset declaration {yr}" if yr is not None else "Asset declaration"
                sub = f"Total value: {val} EUR" if val is not None else ""
                nodes.append(
                    _openplanter_graph_node_element(
                        wid,
                        label,
                        "wealth_declaration",
                        detail=sub[:160],
                    )
                )
            edges.append(
                {
                    "data": {
                        "id": f"has_wealth_{row['wid']}",
                        "source": row["mp_id"],
                        "target": wid,
                        "label": "filed_wealth_declaration",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "interests"):
        cur.execute(
            """
            SELECT id::text AS iid, politician_id::text AS mp_id,
                   COALESCE(interest_type, 'Interest') AS interest_type,
                   COALESCE(NULLIF(TRIM(organization_name), ''), '') AS org,
                   LEFT(COALESCE(description, ''), 100) AS descr
            FROM interests
            WHERE politician_id = ANY(%s::uuid[])
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_INTEREST_ROWS),
        )
        for row in cur.fetchall():
            iid = f"interest:{row['iid']}"
            if iid not in known_node_ids:
                known_node_ids.add(iid)
                itype = (row.get("interest_type") or "Interest").strip()
                org = (row.get("org") or "").strip()
                label = f"{itype}: {org}" if org else itype
                label = label[:200]
                descr = (row.get("descr") or "").strip()
                nodes.append(
                    _openplanter_graph_node_element(
                        iid,
                        label,
                        "interest",
                        detail=descr[:200] if descr else "",
                    )
                )
            edges.append(
                {
                    "data": {
                        "id": f"interest_link_{row['iid']}",
                        "source": row["mp_id"],
                        "target": iid,
                        "label": "declared_interest",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "votes") and _table_exists(cur, "mp_votes"):
        cur.execute(
            """
            SELECT v.id, v.seimas_vote_id, v.sitting_date, v.title, v.project_id
            FROM votes v
            WHERE EXISTS (
                SELECT 1
                FROM mp_votes mv
                INNER JOIN politicians p ON p.id = mv.politician_id AND p.is_active = TRUE
                WHERE mv.vote_id = v.seimas_vote_id
                  AND mv.politician_id = ANY(%s::uuid[])
            )
            ORDER BY v.sitting_date DESC NULLS LAST, v.id DESC
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_VOTE_NODES),
        )
        vote_rows = cur.fetchall()
        vote_pks = [int(r["id"]) for r in vote_rows if r.get("id") is not None]
        for vr in vote_rows:
            pk = vr.get("id")
            if pk is None:
                continue
            vid = f"vote:{int(pk)}"
            if vid not in known_node_ids:
                known_node_ids.add(vid)
                title = (vr.get("title") or "Vote")[:90]
                ds = vr.get("sitting_date")
                date_s = str(ds)[:10] if ds is not None else ""
                proj = (vr.get("project_id") or "").strip()
                label = f"{date_s} · {title}" if date_s else title
                label = label[:200]
                detail = f"Project {proj}"[:120] if proj else ""
                nodes.append(
                    _openplanter_graph_node_element(
                        vid,
                        label,
                        "legislation",
                        detail=detail,
                    )
                )
        if vote_pks:
            cur.execute(
                """
                SELECT mv.id::text AS mvid, mv.politician_id::text AS mp_id,
                       mv.vote_choice, v.id AS vote_pk
                FROM mp_votes mv
                INNER JOIN votes v ON v.seimas_vote_id = mv.vote_id
                WHERE v.id = ANY(%s)
                  AND mv.politician_id = ANY(%s::uuid[])
                """,
                (vote_pks, uuid_list),
            )
            for row in cur.fetchall():
                vpk = row.get("vote_pk")
                if vpk is None:
                    continue
                vid = f"vote:{int(vpk)}"
                choice = (row.get("vote_choice") or "").strip()
                edges.append(
                    {
                        "data": {
                            "id": f"voted_{row['mvid']}",
                            "source": row["mp_id"],
                            "target": vid,
                            "label": "voted_on",
                            "vote_choice": choice[:40],
                        }
                    }
                )

    generated = (
        datetime.datetime.now(datetime.timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    return {"nodes": nodes, "edges": edges, "generated_at": generated}


@app.get("/api/v2/openplanter/graph")
def get_openplanter_graph(request: Request):
    """
    Export a Cytoscape.js graph: active MPs, phantom-network links, parties (belongs_to),
    committees (serves_on), wealth/asset declarations, VTEK interests, and recent roll-call votes (voted_on).
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    now = time.time()
    with _leaderboard_cache_lock:
        cached = _leaderboard_cache.get("openplanter_graph")
        if cached and (now - float(cached["timestamp"])) < OPENPLANTER_GRAPH_CACHE_SEC:
            return cached["data"]

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            try:
                payload = _build_openplanter_graph_payload(cur)
                with _leaderboard_cache_lock:
                    _leaderboard_cache["openplanter_graph"] = {
                        "data": payload,
                        "timestamp": now,
                    }
                return payload
            except Exception as exc:
                raise HTTPException(
                    status_code=500, detail=f"Failed to build OpenPlanter graph: {exc}"
                )


@app.get("/api/v2/heroes/{mp_id}/share-card")
def get_hero_share_card(mp_id: str, format: str = "primary"):
    """Generate a deterministic, social-ready hero card PNG."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            try:
                hero_profile = calculate_hero_profile(mp_id=mp_id, db_cursor=cur)
                png_bytes = render_share_card(hero_profile=hero_profile, card_format=format)
            except ValueError:
                raise HTTPException(status_code=404, detail="MP not found")
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to render share card: {exc}")

    safe_name = str(hero_profile.get("mp", {}).get("name", "hero")).strip().replace(" ", "-").lower()
    safe_name = "".join(ch for ch in safe_name if ch.isalnum() or ch in ("-", "_"))
    safe_name = safe_name.encode("ascii", "ignore").decode("ascii") or "hero"
    headers = {
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": f'inline; filename="hero-{safe_name}-{format}.png"',
    }
    return Response(content=png_bytes, media_type="image/png", headers=headers)


@app.get("/api/votes")
def get_votes(limit: int = 50, offset: int = 0):
    """List recent votes."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, sitting_date, title, result_type
                FROM votes
                ORDER BY sitting_date DESC, created_at DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
            rows = cur.fetchall()

            return [
                {
                    "id": str(row["id"]),
                    "date": str(row["sitting_date"]),
                    "title": row["title"],
                    "result": row["result_type"],
                }
                for row in rows
            ]


@app.get("/api/votes/{vote_id}")
def get_vote(vote_id: str):
    """Get details for a single vote."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, seimas_vote_id, sitting_date, title, description, url, result_type
                FROM votes
                WHERE id = %s::integer
            """, (vote_id,))
            vote = cur.fetchone()

            if not vote:
                raise HTTPException(status_code=404, detail="Vote not found")

            # mp_votes.vote_id references votes.seimas_vote_id, not votes.id
            cur.execute("""
                SELECT p.display_name, p.current_party, mv.vote_choice
                FROM mp_votes mv
                JOIN politicians p ON mv.politician_id = p.id
                WHERE mv.vote_id = %s
                ORDER BY p.current_party, p.display_name
            """, (vote["seimas_vote_id"],))
            votes_rows = cur.fetchall()

            stats = defaultdict(int)
            party_stats = defaultdict(lambda: defaultdict(int))
            mp_votes = []

            for row in votes_rows:
                choice = row["vote_choice"]
                party = row["current_party"]
                stats[choice] += 1
                party_stats[party][choice] += 1
                mp_votes.append({
                    "name": row["display_name"],
                    "party": party,
                    "choice": choice,
                })

            return {
                "id": str(vote["id"]),
                "date": str(vote["sitting_date"]),
                "title": vote["title"],
                "description": vote["description"],
                "url": vote["url"],
                "result_type": vote["result_type"],
                "stats": stats,
                "party_stats": party_stats,
                "votes": mp_votes,
            }


@app.get("/api/accountability/heroes-villains")
def get_heroes_villains(limit: int = 10):
    """
    Weekly accountability ranking.

    Returns two lists:
      - heroes: best integrity score
      - watchlist: highest risk score
    """
    limit = max(1, min(limit, 25))

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            has_stats = _table_exists(cur, "mp_stats_summary")
            has_alerts = _table_exists(cur, "conflict_alerts")

            if has_stats:
                cur.execute(
                    """
                    SELECT
                        p.id::text AS id,
                        p.display_name AS name,
                        p.current_party AS party,
                        p.photo_url,
                        COALESCE(s.attendance_percentage, 0)::float AS attendance,
                        COALESCE(s.total_votes_cast, 0)::int AS vote_count
                    FROM politicians p
                    LEFT JOIN mp_stats_summary s ON s.mp_id = p.id
                    WHERE p.is_active = TRUE
                    ORDER BY p.display_name
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT
                        p.id::text AS id,
                        p.display_name AS name,
                        p.current_party AS party,
                        p.photo_url,
                        0::float AS attendance,
                        COALESCE(COUNT(DISTINCT mv.vote_id), 0)::int AS vote_count
                    FROM politicians p
                    LEFT JOIN mp_votes mv ON mv.politician_id = p.id
                    WHERE p.is_active = TRUE
                    GROUP BY p.id
                    ORDER BY p.display_name
                    """
                )

            rows = cur.fetchall()
            if not rows:
                return {"generated_at": datetime.datetime.utcnow().isoformat() + "Z", "window_days": 7, "heroes": [], "watchlist": []}

            risk_map = defaultdict(lambda: {"high": 0, "medium": 0, "low": 0})
            reasons_map = defaultdict(list)

            if has_alerts:
                cur.execute(
                    """
                    SELECT
                        ca.mp_id::text AS mp_id,
                        ca.severity,
                        ca.alert_type,
                        ca.description
                    FROM conflict_alerts ca
                    WHERE ca.detected_at >= (NOW() - INTERVAL '7 days')
                      AND ca.mp_id IS NOT NULL
                    ORDER BY ca.detected_at DESC
                    """
                )
                alert_rows = cur.fetchall()
                for a in alert_rows:
                    mp_id = a["mp_id"]
                    sev = (a["severity"] or "low").lower()
                    if sev not in ("high", "medium", "low"):
                        sev = "low"
                    risk_map[mp_id][sev] += 1
                    if len(reasons_map[mp_id]) < 5:
                        label = (a["alert_type"] or "signal").replace("_", " ")
                        reasons_map[mp_id].append(f"{sev.title()} risk: {label}")

            scored = []
            for r in rows:
                mp_id = r["id"]
                attendance = float(r.get("attendance") or 0.0)
                vote_count = int(r.get("vote_count") or 0)

                high = risk_map[mp_id]["high"]
                medium = risk_map[mp_id]["medium"]
                low = risk_map[mp_id]["low"]
                risk_score = (high * 20) + (medium * 8) + (low * 3) + max(0, 70 - attendance) * 0.6
                integrity_score = max(0, min(100, round(100 - risk_score + (attendance * 0.15), 1)))

                hero_evidence = [
                    f"Lankomumas: {attendance:.1f}%",
                    f"Aktyvumas: {vote_count} balsavimų",
                    f"7 d. signalai: H{high}/M{medium}/L{low}",
                ]
                watch_evidence = reasons_map[mp_id][:3]
                if not watch_evidence:
                    watch_evidence = [
                        f"Lankomumas: {attendance:.1f}%",
                        f"7 d. signalai: H{high}/M{medium}/L{low}",
                        "Stebėsena pagal rizikos modelį",
                    ]

                scored.append(
                    {
                        "id": mp_id,
                        "name": r["name"],
                        "party": r.get("party"),
                        "photo_url": r.get("photo_url"),
                        "attendance": round(attendance, 1),
                        "vote_count": vote_count,
                        "risk_score": round(risk_score, 1),
                        "integrity_score": integrity_score,
                        "risk_signals_7d": {"high": high, "medium": medium, "low": low},
                        "hero_evidence": hero_evidence,
                        "watch_evidence": watch_evidence,
                    }
                )

            heroes = sorted(scored, key=lambda x: (-x["integrity_score"], -x["attendance"], -x["vote_count"]))[:limit]
            watchlist = sorted(scored, key=lambda x: (-x["risk_score"], x["attendance"], x["integrity_score"]))[:limit]

            for idx, item in enumerate(heroes, start=1):
                item["rank"] = idx
            for idx, item in enumerate(watchlist, start=1):
                item["rank"] = idx

            return {
                "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
                "window_days": 7,
                "heroes": heroes,
                "watchlist": watchlist,
            }


# ─── Forensic Engine Endpoints ────────────────────────────────────────────────


@app.get("/api/forensics/chrono")
def get_chrono_forensics(limit: int = 50):
    """Engine 01: Amendment temporal fingerprinting — flagged fast+complex amendments."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if not _table_exists(cur, "amendment_profiles"):
                return {"items": [], "clusters": []}

            cur.execute("""
                SELECT ap.amendment_id, ap.word_count, ap.legal_citation_count,
                       ap.complexity_score, ap.drafting_window_minutes,
                       ap.speed_anomaly_zscore, ap.cluster_id
                FROM amendment_profiles ap
                WHERE ap.speed_anomaly_zscore IS NOT NULL
                ORDER BY ap.speed_anomaly_zscore ASC
                LIMIT %s
            """, (limit,))
            items = cur.fetchall()

            clusters = []
            cur.execute("""
                SELECT cluster_id, COUNT(*) AS size,
                       MIN(ap.speed_anomaly_zscore) AS min_zscore
                FROM amendment_profiles ap
                WHERE ap.cluster_id IS NOT NULL
                GROUP BY cluster_id
                HAVING COUNT(*) > 1
                ORDER BY MIN(ap.speed_anomaly_zscore) ASC
            """)
            clusters = cur.fetchall()

            return {
                "items": [
                    {
                        "amendment_id": r["amendment_id"],
                        "word_count": r["word_count"],
                        "citation_count": r["legal_citation_count"],
                        "complexity": r["complexity_score"],
                        "drafting_window_min": r["drafting_window_minutes"],
                        "zscore": round(float(r["speed_anomaly_zscore"]), 2) if r["speed_anomaly_zscore"] else None,
                        "cluster_id": r["cluster_id"],
                    }
                    for r in items
                ],
                "clusters": [
                    {
                        "cluster_id": c["cluster_id"],
                        "size": c["size"],
                        "min_zscore": round(float(c["min_zscore"]), 2) if c["min_zscore"] else None,
                    }
                    for c in clusters
                ],
            }


@app.get("/api/forensics/benford")
def get_benford_results(limit: int = 50):
    """Engine 02: Benford's Law conformity test results per MP."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if not _table_exists(cur, "benford_analyses"):
                return {"items": []}

            cur.execute("""
                SELECT ba.mp_id, ba.sample_size, ba.chi_squared, ba.p_value,
                       ba.mad, ba.digit_distribution, ba.conformity_label,
                       ba.flagged_fields
                FROM benford_analyses ba
                ORDER BY ba.p_value ASC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()

            return {
                "items": [
                    {
                        "mp_id": str(r["mp_id"]),
                        "sample_size": r["sample_size"],
                        "chi_squared": r["chi_squared"],
                        "p_value": r["p_value"],
                        "mad": r["mad"],
                        "digit_distribution": r["digit_distribution"],
                        "conformity": r["conformity_label"],
                        "flagged_fields": r["flagged_fields"],
                    }
                    for r in rows
                ],
            }


@app.get("/api/forensics/loyalty")
def get_loyalty_graph():
    """Engine 03: Faction alignment and community detection results."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            has_matview = _table_exists(cur, "faction_alignment")

            if has_matview:
                cur.execute("""
                    SELECT mp_id::text, display_name, current_party, sitting_date,
                           alignment_pct
                    FROM faction_alignment
                    ORDER BY sitting_date DESC
                    LIMIT 5000
                """)
                rows = cur.fetchall()
            else:
                rows = []

            # Group by MP for rolling alignment
            mp_data: dict = defaultdict(lambda: {"name": "", "party": "", "daily": []})
            for r in rows:
                mp_id = r["mp_id"]
                mp_data[mp_id]["name"] = r["display_name"]
                mp_data[mp_id]["party"] = r["current_party"]
                mp_data[mp_id]["daily"].append({
                    "date": str(r["sitting_date"]),
                    "alignment": float(r["alignment_pct"]) if r["alignment_pct"] else 100,
                })

            alignment_summary = []
            for mp_id, data in mp_data.items():
                daily = sorted(data["daily"], key=lambda x: x["date"])
                recent = daily[-30:] if len(daily) > 30 else daily
                avg = sum(d["alignment"] for d in recent) / len(recent) if recent else 100
                alignment_summary.append({
                    "mp_id": mp_id,
                    "name": data["name"],
                    "party": data["party"],
                    "avg_alignment_30d": round(avg, 1),
                    "trend": daily[-10:],
                })

            alignment_summary.sort(key=lambda x: x["avg_alignment_30d"])

            return {
                "alignment": alignment_summary[:50],
                "total_mps": len(mp_data),
            }


@app.get("/api/forensics/phantom")
def get_phantom_network(limit: int = 50):
    """Engine 04: Indirect corporate links (multi-hop shell detection)."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if not _table_exists(cur, "indirect_links"):
                return {"items": []}

            cur.execute("""
                SELECT il.mp_id, il.target_entity_code, il.target_entity_name,
                       il.hop_count, il.path, il.has_procurement_hit,
                       il.has_debtor_hit, il.detected_at
                FROM indirect_links il
                ORDER BY il.hop_count ASC, il.has_procurement_hit DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()

            return {
                "items": [
                    {
                        "mp_id": str(r["mp_id"]),
                        "target_code": r["target_entity_code"],
                        "target_name": r["target_entity_name"],
                        "hops": r["hop_count"],
                        "path": r["path"],
                        "procurement_hit": r["has_procurement_hit"],
                        "debtor_hit": r["has_debtor_hit"],
                        "detected_at": r["detected_at"].isoformat() if r["detected_at"] else None,
                    }
                    for r in rows
                ],
            }


@app.get("/api/forensics/vote-geometry")
def get_vote_geometry(limit: int = 30):
    """Engine 05: Statistically anomalous vote outcomes."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if not _table_exists(cur, "vote_geometry"):
                return {"items": [], "total_analyzed": 0}

            cur.execute("""
                SELECT vg.vote_id, vg.expected_for, vg.expected_against,
                       vg.expected_abstain, vg.actual_for, vg.actual_against,
                       vg.actual_abstain, vg.deviation_sigma, vg.anomaly_type,
                       vg.faction_deviations,
                       v.title, v.sitting_date
                FROM vote_geometry vg
                LEFT JOIN votes v ON v.seimas_vote_id = vg.vote_id
                WHERE vg.deviation_sigma > 3.0
                ORDER BY vg.deviation_sigma DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()

            cur.execute("SELECT COUNT(*) AS cnt FROM vote_geometry")
            total = cur.fetchone()["cnt"]

            return {
                "items": [
                    {
                        "vote_id": r["vote_id"],
                        "title": r["title"],
                        "date": str(r["sitting_date"]) if r["sitting_date"] else None,
                        "expected": {
                            "for": r["expected_for"],
                            "against": r["expected_against"],
                            "abstain": r["expected_abstain"],
                        },
                        "actual": {
                            "for": r["actual_for"],
                            "against": r["actual_against"],
                            "abstain": r["actual_abstain"],
                        },
                        "sigma": r["deviation_sigma"],
                        "anomaly_type": r["anomaly_type"],
                        "faction_deviations": r["faction_deviations"],
                    }
                    for r in rows
                ],
                "total_analyzed": total,
            }


# ─── Health & Admin ──────────────────────────────────────────────────────────


@app.get("/health")
def health():
    """Health check with DB connectivity verification."""
    db_status = "disconnected"
    try:
        with get_db_conn() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    db_status = "connected"
    except Exception:
        db_status = "error"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
    }


@app.get("/api/admin/refresh-status")
def refresh_status():
    """Check the status of the background materialized view refresh."""
    return {
        "interval_seconds": REFRESH_INTERVAL_SEC,
        **_refresh_state,
    }


@app.post("/api/admin/refresh")
def trigger_refresh(background_tasks: BackgroundTasks, authorization: Optional[str] = Header(default=None)):
    """Manually trigger a materialized view refresh."""
    _require_admin_auth(authorization)
    background_tasks.add_task(_refresh_materialized_view)
    return {"status": "Refresh triggered"}


@app.post("/api/admin/sync/mps")
def trigger_sync_mps(background_tasks: BackgroundTasks, authorization: Optional[str] = Header(default=None)):
    """Trigger MP data sync from LRS."""
    _require_admin_auth(authorization)

    if not sync_mps:
        raise HTTPException(status_code=500, detail="Ingestion script not loaded")

    background_tasks.add_task(sync_mps)
    return {"status": "MP sync started in background"}


@app.post("/api/admin/sync/votes")
def trigger_sync_votes(background_tasks: BackgroundTasks, authorization: Optional[str] = Header(default=None)):
    """Trigger Vote data sync (recent votes)."""
    _require_admin_auth(authorization)

    if not sync_votes:
        raise HTTPException(status_code=500, detail="Ingestion script not loaded")

    background_tasks.add_task(sync_votes)
    return {"status": "Vote sync started in background"}


@app.get("/")
def root():
    return {"name": "Skaidrus Seimas API", "version": "2.0", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
