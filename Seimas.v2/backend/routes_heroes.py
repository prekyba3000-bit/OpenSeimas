"""v2 heroes endpoints: leaderboard, search, profile, share card, OpenPlanter graph."""
from fastapi import APIRouter, HTTPException, Request, Query
import time
import datetime
from typing import List, Dict, Optional, Any

from backend.models import (
    HeroMpResponse,
    HeroDimensionsResponse,
    HeroProfileResponse,
    HeroSearchResponse,
)
from backend.graph import _build_openplanter_graph_payload

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


def calculate_hero_profile(*args, **kwargs):
    return core.calculate_hero_profile(*args, **kwargs)


def calculate_all_hero_profiles(*args, **kwargs):
    return core.calculate_all_hero_profiles(*args, **kwargs)


def calculate_all_hero_profiles_fast(*args, **kwargs):
    return core.calculate_all_hero_profiles_fast(*args, **kwargs)


@router.get("/api/v2/heroes/leaderboard", response_model=List[HeroProfileResponse])
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
                all_profiles = calculate_all_hero_profiles_fast(
                    db_cursor=cur, active_only=True, limit=safe_limit
                )
                with _leaderboard_cache_lock:
                    _leaderboard_cache["entries"][safe_limit] = {
                        "data": all_profiles,
                        "timestamp": now,
                    }
                return all_profiles
            except Exception:
                logger.exception("Failed to build leaderboard")
                raise HTTPException(status_code=500, detail="Failed to build leaderboard")


@router.get("/api/v2/heroes/search", response_model=HeroSearchResponse)
def search_heroes(
    request: Request,
    q: str = Query(..., min_length=1, max_length=120),
    limit: int = Query(20, ge=1),
):
    """Search active MPs by name/party and return hero profiles."""
    # core.client_ip reads X-Forwarded-For. request.client.host is Render's
    # proxy for every visitor, which puts the whole site in one 60/min
    # bucket — throttling everyone at once and an abuser not at all.
    client_ip = core.client_ip(request)
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
            except Exception:
                logger.exception("Failed to search heroes")
                raise HTTPException(status_code=500, detail="Failed to search heroes")


@router.get("/api/v2/heroes/{mp_id}", response_model=HeroProfileResponse)
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
            except Exception:
                logger.exception("Failed to build hero profile")
                raise HTTPException(status_code=500, detail="Failed to build hero profile")


@router.get("/api/v2/openplanter/graph")
def get_openplanter_graph(request: Request):
    """
    Export a Cytoscape.js graph: active MPs, phantom-network links, parties (belongs_to),
    committees (serves_on), wealth/asset declarations, VTEK interests, and recent roll-call votes (voted_on).
    """
    # core.client_ip reads X-Forwarded-For. request.client.host is Render's
    # proxy for every visitor, which puts the whole site in one 60/min
    # bucket — throttling everyone at once and an abuser not at all.
    client_ip = core.client_ip(request)
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
            except Exception:
                logger.exception("Failed to build OpenPlanter graph")
                raise HTTPException(
                    status_code=500, detail="Failed to build OpenPlanter graph"
                )


# Retired 2026-09-07: /api/v2/heroes/{mp_id}/share-card.
#
# It rendered a PNG of a named member of parliament carrying a level number, a
# D&D alignment badge, STR/WIS/CHA/INT/STA axes, an XP bar and „artifacts" —
# a verdict about a person, in the plainest sense §1.3 forbids. Worse after
# those fields were removed from the profile payload: the renderer read them
# from a dict that no longer had them and fell back to its defaults, so every
# card published Level 0 and "True Neutral" as facts about someone. Live,
# unauthenticated, cached an hour, and reachable from a „Dalintis kortele"
# button on every profile.
#
# The JSON guard in tests/test_no_verdicts_on_the_wire.py said "nothing
# rendered them". It read the payload. A PNG is a public surface too.

