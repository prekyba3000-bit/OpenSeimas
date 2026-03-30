"""
analysis/loyalty_graph.py

Engine 03: Factional Betrayal Detection

Computes per-MP faction alignment scores on a rolling 30-day window,
detects defection velocity (first derivative of alignment over time),
and uses Louvain community detection on a voting-similarity graph
to surface emerging cross-party shadow coalitions.
"""

from datetime import datetime, date, timedelta
from collections import defaultdict

import numpy as np
import networkx as nx
from loguru import logger

from storage.db import get_session, MP, ConflictAlert


def _rolling_alignment(daily_data: list[dict], window: int = 30) -> list[dict]:
    """
    Compute rolling average alignment over a window of days.
    daily_data: sorted list of {"date": date, "total": int, "aligned": int}
    Returns list of {"date": date, "alignment_pct": float}.
    """
    if not daily_data:
        return []

    result = []
    for i, day in enumerate(daily_data):
        start_idx = max(0, i - window + 1)
        window_slice = daily_data[start_idx:i + 1]
        total = sum(d["total"] for d in window_slice)
        aligned = sum(d["aligned"] for d in window_slice)
        pct = (aligned / total * 100) if total > 0 else 100.0
        result.append({
            "date": day["date"],
            "alignment_pct": round(pct, 2),
        })
    return result


def _compute_velocity(alignment_series: list[dict], span_weeks: int = 1) -> list[dict]:
    """
    First derivative of alignment: change per week.
    Returns list of {"date": date, "velocity": float} (negative = defecting).
    """
    if len(alignment_series) < 2:
        return []

    result = []
    step = span_weeks * 7
    for i in range(step, len(alignment_series)):
        current = alignment_series[i]["alignment_pct"]
        previous = alignment_series[i - step]["alignment_pct"]
        velocity = current - previous
        result.append({
            "date": alignment_series[i]["date"],
            "velocity": round(velocity, 2),
        })
    return result


def run_loyalty_analysis(conn=None) -> dict:
    """
    Reads faction_alignment materialized view (or raw mp_votes + politicians)
    and computes:
    1. Per-MP rolling 30-day alignment
    2. Defection velocity (weekly Δ alignment)
    3. Voting-similarity graph with Louvain community detection
    4. Shadow coalition alerts

    Returns summary dict with alignment_data, communities, and alerts.
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import os

    dsn = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")
    if not dsn:
        logger.warning("Loyalty graph: no database connection available")
        return {"alignment_data": {}, "communities": [], "alerts": []}

    own_conn = conn is None
    if own_conn:
        conn = psycopg2.connect(dsn)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if faction_alignment matview exists
            cur.execute("SELECT to_regclass('public.faction_alignment') AS reg")
            has_matview = cur.fetchone()["reg"] is not None

            if has_matview:
                cur.execute("""
                    SELECT mp_id, display_name, current_party, sitting_date,
                           votes_on_day, aligned_votes, alignment_pct
                    FROM faction_alignment
                    ORDER BY mp_id, sitting_date
                """)
            else:
                # Fallback: compute inline from mp_votes + politicians
                cur.execute("""
                    WITH party_majority AS (
                        SELECT mv.vote_id, p.current_party,
                               MODE() WITHIN GROUP (ORDER BY mv.vote_choice) AS party_position
                        FROM mp_votes mv
                        JOIN politicians p ON p.id = mv.politician_id
                        WHERE p.is_active = TRUE
                          AND mv.vote_choice IS NOT NULL
                          AND mv.vote_choice != 'Nedalyvavo'
                        GROUP BY mv.vote_id, p.current_party
                    )
                    SELECT p.id AS mp_id, p.display_name, p.current_party,
                           v.sitting_date,
                           COUNT(*) AS votes_on_day,
                           COUNT(*) FILTER (WHERE mv.vote_choice = pm.party_position) AS aligned_votes,
                           ROUND(COUNT(*) FILTER (WHERE mv.vote_choice = pm.party_position)::numeric
                                 / NULLIF(COUNT(*), 0) * 100, 2) AS alignment_pct
                    FROM mp_votes mv
                    JOIN politicians p ON p.id = mv.politician_id
                    JOIN votes v ON v.seimas_vote_id = mv.vote_id
                    JOIN party_majority pm ON pm.vote_id = mv.vote_id AND pm.current_party = p.current_party
                    WHERE mv.vote_choice IS NOT NULL AND mv.vote_choice != 'Nedalyvavo'
                    GROUP BY p.id, p.display_name, p.current_party, v.sitting_date
                    ORDER BY p.id, v.sitting_date
                """)

            rows = cur.fetchall()

            # Group by MP
            mp_daily: dict[str, list[dict]] = defaultdict(list)
            mp_info: dict[str, dict] = {}

            for row in rows:
                mp_id = str(row["mp_id"])
                mp_daily[mp_id].append({
                    "date": str(row["sitting_date"]),
                    "total": int(row["votes_on_day"]),
                    "aligned": int(row["aligned_votes"]),
                })
                if mp_id not in mp_info:
                    mp_info[mp_id] = {
                        "name": row["display_name"],
                        "party": row["current_party"],
                    }

            # Compute rolling alignment + velocity per MP
            alignment_data = {}
            defectors = []

            for mp_id, daily in mp_daily.items():
                rolling = _rolling_alignment(daily, window=30)
                velocity = _compute_velocity(rolling, span_weeks=1)
                alignment_data[mp_id] = {
                    "info": mp_info[mp_id],
                    "rolling_alignment": rolling[-60:],  # Last 60 data points
                    "velocity": velocity[-30:],
                }

                # Flag sustained negative velocity (< -2% per week for 3+ weeks)
                negative_streak = 0
                for v in velocity[-8:]:
                    if v["velocity"] < -2.0:
                        negative_streak += 1
                    else:
                        negative_streak = 0

                if negative_streak >= 3:
                    defectors.append(mp_id)

            # Build voting-similarity graph for community detection
            cur.execute("""
                SELECT politician_id::text AS mp_id, vote_id, vote_choice
                FROM mp_votes
                WHERE vote_choice IS NOT NULL AND vote_choice != 'Nedalyvavo'
            """)
            vote_rows = cur.fetchall()

            mp_votes_map: dict[str, dict[int, str]] = defaultdict(dict)
            for vr in vote_rows:
                mp_votes_map[vr["mp_id"]][vr["vote_id"]] = vr["vote_choice"]

            G = nx.Graph()
            mp_ids_list = list(mp_votes_map.keys())

            for i in range(len(mp_ids_list)):
                for j in range(i + 1, len(mp_ids_list)):
                    mp_a, mp_b = mp_ids_list[i], mp_ids_list[j]
                    votes_a = mp_votes_map[mp_a]
                    votes_b = mp_votes_map[mp_b]
                    common = set(votes_a.keys()) & set(votes_b.keys())
                    if len(common) < 10:
                        continue
                    agreed = sum(1 for v in common if votes_a[v] == votes_b[v])
                    jaccard = agreed / len(common)
                    if jaccard > 0.6:
                        G.add_edge(mp_a, mp_b, weight=jaccard)

            # Louvain community detection
            communities_list = []
            if len(G.nodes) > 2:
                try:
                    communities = nx.community.louvain_communities(G, weight="weight", seed=42)
                    for idx, community in enumerate(communities):
                        parties_in = set()
                        members = []
                        for mp_id in community:
                            info = mp_info.get(mp_id, {})
                            party = info.get("party", "?")
                            parties_in.add(party)
                            members.append({
                                "mp_id": mp_id,
                                "name": info.get("name", "?"),
                                "party": party,
                            })
                        communities_list.append({
                            "community_id": idx,
                            "size": len(community),
                            "parties": list(parties_in),
                            "cross_party": len(parties_in) > 1,
                            "members": members[:20],
                        })
                except Exception as e:
                    logger.warning(f"Louvain failed: {e}")

            # Generate alerts for cross-party clusters with defectors
            alerts = []
            for comm in communities_list:
                if not comm["cross_party"] or comm["size"] < 5:
                    continue
                defectors_in = [m for m in comm["members"] if m["mp_id"] in defectors]
                if len(defectors_in) < 2:
                    continue
                alerts.append({
                    "alert_type": "shadow_coalition",
                    "severity": "high",
                    "description": (
                        f"Šešėlinė koalicija: {comm['size']} narių, "
                        f"partijos: {', '.join(comm['parties'])}. "
                        f"{len(defectors_in)} narių su neigiamu lojalumo greičiu."
                    ),
                    "evidence": {
                        "community_id": comm["community_id"],
                        "parties": comm["parties"],
                        "defecting_members": [
                            {"mp_id": d["mp_id"], "name": d["name"], "party": d["party"]}
                            for d in defectors_in
                        ],
                    },
                })

    finally:
        if own_conn:
            conn.close()

    logger.info(
        f"Loyalty graph: {len(alignment_data)} MPs analyzed, "
        f"{len(communities_list)} communities, {len(alerts)} alerts"
    )

    return {
        "alignment_data": alignment_data,
        "communities": communities_list,
        "alerts": alerts,
        "defector_count": len(defectors),
    }
