"""Public v1 endpoints: stats, activity, MPs, votes."""
from fastapi import APIRouter, HTTPException, Request
import time
import datetime
from typing import List, Dict, Optional, Any
from collections import defaultdict

from psycopg2.extras import RealDictCursor

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


@router.get("/api/stats")
def get_stats(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            # Active = the mandate covers today. Derived from the mandate dates
            # rather than the is_active flag so the two can never drift apart:
            # a member whose mandate ended yesterday stops counting today
            # without waiting for a sync to flip a boolean.
            cur.execute(
                """
                SELECT count(*) as count FROM politicians
                WHERE mandate_start_date <= CURRENT_DATE
                  AND (mandate_end_date IS NULL OR mandate_end_date >= CURRENT_DATE)
                """
            )
            mps_active = cur.fetchone()["count"]

            cur.execute("SELECT count(*) as count FROM politicians")
            mps_all_time = cur.fetchone()["count"]

            cur.execute("SELECT count(*) as count FROM votes")
            vote_count = cur.fetchone()["count"]

            cur.execute("SELECT count(*) as count FROM mp_votes")
            mp_vote_count = cur.fetchone()["count"]

            cur.execute("SELECT count(DISTINCT sitting_date) as count FROM votes")
            sitting_days = cur.fetchone()["count"]

            return {
                # Three different true numbers that were previously conflated:
                #   seats_total  — the constitutional size of the Seimas (141)
                #   mps_active   — how many hold a mandate today (~140)
                #   mps_all_time — everyone who held one this term (148, incl.
                #                  replaced members and same-day resignations)
                # A surface must show the one its label implies.
                "seats_total": core.SEIMAS_SEATS_TOTAL,
                "mps_active": mps_active,
                "mps_all_time": mps_all_time,
                "seats_vacant": max(core.SEIMAS_SEATS_TOTAL - mps_active, 0),
                # DEPRECATED: the name says total, the value is the active
                # count. Kept so existing consumers keep working; use
                # mps_active. Remove once no client reads it.
                "total_mps": mps_active,
                "historical_votes": f"{vote_count:,}",
                "individual_votes": f"{mp_vote_count:,}",
                # No "accuracy" field: nothing computes one. It was a hard-coded
                # "99.9%" the dashboard presented as a measured figure.
                "sitting_days": sitting_days,
            }


@router.get("/api/activity")
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
                    # `action` was an English sentence composed here
                    # (f"Voted {choice}"), which put untranslatable text from the
                    # server straight onto a Lithuanian page. The choice is now
                    # sent as data and the client does the wording.
                    "vote_choice": row["vote_choice"],
                    # Retained for any client still reading the old field.
                    # DEPRECATED: use vote_choice.
                    "action": f"Voted {row['vote_choice']}",
                    "context": (row["title"][:50] + "...") if len(row["title"]) > 50 else row["title"],
                    "time": str(row["sitting_date"]),
                }
                for row in rows
            ]


@router.get("/api/mps")
def get_mps(status: str = "active"):
    """List MPs.

    status=active (default) — mandate covers today (~140)
    status=former           — mandate has ended (replaced members, and the four
                              who resigned the day they were sworn in)
    status=all              — every mandate-holder this term (148)

    The default is active because that is what "the Seimo nariai" means to a
    reader. Former members are never deleted — votes and attendance
    denominators depend on their records — but they must not be silently mixed
    into a list labelled as the current membership. Ask for them explicitly.
    """
    if status not in ("active", "former", "all"):
        raise HTTPException(
            status_code=422, detail="status must be one of: active, former, all"
        )
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

            # Mandate-date derived, matching /api/stats — never the is_active
            # flag, so the list and the counts cannot disagree.
            mandate_active = """
                p.mandate_start_date <= CURRENT_DATE
                AND (p.mandate_end_date IS NULL OR p.mandate_end_date >= CURRENT_DATE)
            """
            where = {
                "active": f"WHERE {mandate_active}",
                "former": f"WHERE NOT ({mandate_active})",
                "all": "",
            }[status]

            cur.execute(f"""
                SELECT
                    p.id,
                    p.display_name,
                    p.full_name_normalized,
                    p.current_party,
                    p.is_active,
                    p.photo_url,
                    p.mandate_start_date,
                    p.mandate_end_date,
                    {social_col}
                    {stats_cols}
                FROM politicians p
                {stats_join}
                {where}
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
                    "vote_mode": row["most_frequent_vote"],
                    # Let the client say *when* a former member served instead
                    # of only that they are "inactive".
                    "mandate_start_date": row["mandate_start_date"].isoformat()
                    if row["mandate_start_date"] else None,
                    "mandate_end_date": row["mandate_end_date"].isoformat()
                    if row["mandate_end_date"] else None,
                }
                for row in rows
            ]


@router.get("/api/mps/compare")
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


@router.get("/api/mps/{mp_id}")
def get_mp(mp_id: str):
    """Get details for a single MP."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            # social_links is optional in older schemas; build the SELECT
            # defensively to match the pattern in /api/mps. Without this,
            # databases missing the column 500 instead of degrading to {}.
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'politicians' AND column_name = 'social_links'
                ) AS has_social
            """)
            has_social = cur.fetchone()["has_social"]
            social_col = "p.social_links," if has_social else ""

            cur.execute(f"""
                SELECT p.id, p.display_name, p.current_party, p.photo_url, {social_col}
                       p.is_active, p.seimas_mp_id,
                       p.mandate_start_date, p.mandate_end_date,
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
                "social_links": (row.get("social_links") if has_social else {}) or {},
                "active": row["is_active"],
                "seimas_id": row["seimas_mp_id"],
                "vote_count": row["vote_count"],
                "mandate_start_date": row["mandate_start_date"].isoformat()
                if row["mandate_start_date"] else None,
                "mandate_end_date": row["mandate_end_date"].isoformat()
                if row["mandate_end_date"] else None,
            }


@router.get("/api/mps/{mp_id}/votes")
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


@router.get("/api/votes")
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


@router.get("/api/votes/{vote_id}")
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

