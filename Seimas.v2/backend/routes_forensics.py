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


def _resolvable_attendance(mp_id: str, raw, overrides):
    """Attendance under the methodology in force, or None when unpublishable."""
    if mp_id in overrides:
        value = overrides[mp_id]
        return float(value) if value is not None else None
    return float(raw) if raw is not None else None


@router.get("/api/accountability/heroes-villains")
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
                        s.attendance_percentage::float AS attendance,
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
                        NULL::float AS attendance,
                        COALESCE(COUNT(DISTINCT mv.vote_id), 0)::int AS vote_count
                    FROM politicians p
                    LEFT JOIN mp_votes mv ON mv.politician_id = p.id
                    WHERE p.is_active = TRUE
                    GROUP BY p.id
                    ORDER BY p.display_name
                    """
                )

            rows = cur.fetchall()
            # Members whose attendance is unpublishable cannot be scored: the
            # risk and integrity formulas both read it, and treating None as 0
            # would rank someone as the worst attender in parliament on the
            # strength of no data at all. They are left out of both lists
            # rather than given an invented position in them.
            _att = attendance_overrides(cur)
            rows = [
                r for r in rows
                if _resolvable_attendance(str(r["id"]), r.get("attendance"), _att) is not None
            ]
            for r in rows:
                r["attendance"] = _resolvable_attendance(str(r["id"]), r.get("attendance"), _att)
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

