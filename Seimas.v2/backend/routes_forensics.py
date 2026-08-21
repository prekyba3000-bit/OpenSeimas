"""Accountability and forensic-engine endpoints."""
from fastapi import APIRouter, HTTPException
import datetime
from typing import List, Dict, Optional, Any

from psycopg2.extras import RealDictCursor
from collections import defaultdict

from backend import core
from backend.hero_engine import attendance_overrides
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

@router.get("/api/forensics/chrono")
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


@router.get("/api/forensics/benford")
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


@router.get("/api/forensics/loyalty")
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


@router.get("/api/forensics/phantom")
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


@router.get("/api/forensics/vote-geometry")
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

