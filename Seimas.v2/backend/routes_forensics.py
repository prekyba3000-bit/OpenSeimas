"""Accountability and forensic-engine endpoints."""
from fastapi import APIRouter, HTTPException
import datetime
from typing import List, Dict, Optional, Any

import psycopg2
from psycopg2.extras import RealDictCursor
from collections import defaultdict

from backend import core
from backend.hero_engine import attendance_overrides
from backend.core import (
    _leaderboard_cache,
    _leaderboard_cache_lock,
    CACHE_DURATION_SEC,
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


# ── /api/accountability/heroes-villains — RETIRED 2026-08-21 ────────────────
#
# This endpoint sorted named members of parliament into „heroes" and a
# „watchlist" using
#
#     integrity_score = 100 - risk_score + attendance * 0.15
#
# — a composite verdict, ranked, on real people, in an endpoint whose name
# said so out loud. It contradicted the platform's founding constraint (ADR
# 0007: OpenSeimas never tells anyone whom to vote for) more directly than
# anything else that shipped: a podium and a wooden spoon are a political
# claim however carefully the arithmetic is documented.
#
# It is removed rather than demoted. The composite on the MP profile is
# demoted — the formula survives on the methodology page — because a number a
# reader can inspect is different from a league table of people. This was the
# league table.
#
# The two panels it fed on the transparency hub are replaced by „Naujausi
# patikrinti balsavimai" and „Pataisymai ir atsakymai", both built from data
# that already exists. See docs/reviews/evidence-first-profiles.md and the
# corrections-log entry filed the same day.

@router.get("/api/forensics/loyalty")
def get_loyalty_graph():
    """Per-sitting-day alignment between a member's votes and their party's position.

    This endpoint used to do three things it should not have.

    It sorted members by alignment ascending and returned the lowest fifty. That
    is a least-loyal league table of named people — the shape retired with
    heroes-villains, published under a different heading.

    It coerced a missing or zero percentage to 100 with
    `float(x) if x else 100`. Zero is falsy in Python, so a member who voted
    against their party on every vote of a sitting day was published as
    perfectly aligned. 28 of 11,809 rows are affected.

    It returned percentages with no counts, so nothing downstream could show a
    reader why a number was what it is.

    Now: every member, ordered by name, each row carrying its own numerator and
    denominator. No ranking, no coercion, no truncation of the window.
    """
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            has_matview = _table_exists(cur, "faction_alignment")

            rows = []
            if has_matview:
                try:
                    cur.execute("""
                        SELECT mp_id::text, display_name, current_party,
                               comparable_votes, aligned_votes, alignment_pct,
                               suppression_reason
                        FROM faction_alignment
                        ORDER BY display_name ASC
                    """)
                    rows = cur.fetchall()
                except psycopg2.errors.ObjectNotInPrerequisiteState:
                    # The view exists but has never been refreshed. Postgres
                    # raises rather than returning nothing, and an unpopulated
                    # view is "we have not computed this yet" — an empty result,
                    # not a failure that should blank the hub.
                    conn.rollback()
                except psycopg2.errors.UndefinedColumn:
                    # Older shape (one row per sitting day) still materialised.
                    conn.rollback()

            # One row per member now. The view sums the counts itself, so
            # nothing here averages percentages: a sitting day carries between
            # 1 and 124 votes, and a mean of daily percentages weighed a
            # one-vote day as heavily as a hundred-vote one — up to 4.1 points
            # apart in this data.
            alignment_summary = [
                {
                    "mp_id": r["mp_id"],
                    "name": r["display_name"],
                    "party": r["current_party"],
                    "aligned_votes": r["aligned_votes"],
                    "comparable_votes": r["comparable_votes"],
                    # None stays None. The previous default of 100 turned the
                    # strongest possible disagreement into perfect agreement.
                    "alignment_pct": (
                        float(r["alignment_pct"])
                        if r["alignment_pct"] is not None
                        else None
                    ),
                    # Why a figure is absent, so the surface can say it rather
                    # than leaving a blank the reader must interpret.
                    "suppression_reason": r["suppression_reason"],
                }
                for r in rows
            ]

            # By name. Ordering by the metric would rank people, and the order
            # of a list is itself a claim.
            alignment_summary.sort(key=lambda x: (x["name"] or "").lower())

            return {
                "alignment": alignment_summary,
                "total_mps": len(alignment_summary),
                "source": "faction_alignment",
            }
