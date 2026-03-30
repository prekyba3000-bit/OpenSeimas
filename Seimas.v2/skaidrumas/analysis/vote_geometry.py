"""
analysis/vote_geometry.py

Engine 05: Statistical Impossibility Detection

For each vote, computes expected outcome using faction sizes and
historical discipline rates, then flags votes where the actual result
deviates by more than 3 standard deviations from expectation.
"""

import math
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np
from loguru import logger

import psycopg2
from psycopg2.extras import RealDictCursor
import os


def run_vote_geometry(conn=None) -> dict:
    """
    For each vote:
    1. Compute faction sizes and per-faction discipline rate (30-day rolling)
    2. Predict expected For/Against/Abstain counts
    3. Compute deviation in sigma units using binomial model
    4. Flag votes where deviation_sigma > 3.0

    Returns summary with flagged votes and faction deviation details.
    """
    dsn = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")
    if not dsn:
        logger.warning("Vote geometry: no database connection")
        return {"flagged": [], "total_analyzed": 0}

    own_conn = conn is None
    if own_conn:
        conn = psycopg2.connect(dsn)

    flagged_votes = []
    total_analyzed = 0

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get all votes with at least 20 individual votes
            cur.execute("""
                SELECT v.seimas_vote_id AS vote_id, v.title, v.sitting_date,
                       v.result_type
                FROM votes v
                JOIN mp_votes mv ON mv.vote_id = v.seimas_vote_id
                WHERE mv.vote_choice IS NOT NULL
                GROUP BY v.seimas_vote_id, v.title, v.sitting_date, v.result_type
                HAVING COUNT(*) >= 20
                ORDER BY v.sitting_date DESC
            """)
            all_votes = cur.fetchall()

            if not all_votes:
                return {"flagged": [], "total_analyzed": 0}

            # Pre-fetch faction discipline rates (30-day rolling per faction)
            cur.execute("""
                SELECT p.current_party,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE mv.vote_choice = 'Už') AS for_count,
                       COUNT(*) FILTER (WHERE mv.vote_choice = 'Prieš') AS against_count,
                       COUNT(*) FILTER (WHERE mv.vote_choice IN ('Susilaikė')) AS abstain_count
                FROM mp_votes mv
                JOIN politicians p ON p.id = mv.politician_id
                WHERE p.is_active = TRUE
                  AND mv.vote_choice IS NOT NULL
                  AND mv.vote_choice != 'Nedalyvavo'
                  AND p.current_party IS NOT NULL
                GROUP BY p.current_party
            """)
            faction_rates = {}
            for fr in cur.fetchall():
                party = fr["current_party"]
                total = fr["total"]
                if total > 0:
                    faction_rates[party] = {
                        "for_rate": fr["for_count"] / total,
                        "against_rate": fr["against_count"] / total,
                        "abstain_rate": fr["abstain_count"] / total,
                    }

            # Get faction sizes among active MPs
            cur.execute("""
                SELECT current_party, COUNT(*) AS size
                FROM politicians
                WHERE is_active = TRUE AND current_party IS NOT NULL
                GROUP BY current_party
            """)
            faction_sizes = {r["current_party"]: r["size"] for r in cur.fetchall()}

            # Check if vote_geometry table exists
            cur.execute("SELECT to_regclass('public.vote_geometry') AS reg")
            has_table = cur.fetchone()["reg"] is not None

            for vote in all_votes:
                vote_id = vote["vote_id"]

                cur.execute("""
                    SELECT p.current_party, mv.vote_choice, COUNT(*) AS cnt
                    FROM mp_votes mv
                    JOIN politicians p ON p.id = mv.politician_id
                    WHERE mv.vote_id = %s
                      AND mv.vote_choice IS NOT NULL
                      AND mv.vote_choice != 'Nedalyvavo'
                      AND p.current_party IS NOT NULL
                    GROUP BY p.current_party, mv.vote_choice
                """, (vote_id,))
                actual_rows = cur.fetchall()

                if not actual_rows:
                    continue

                # Actual counts
                actual_by_faction: dict[str, dict[str, int]] = defaultdict(
                    lambda: {"Už": 0, "Prieš": 0, "Susilaikė": 0}
                )
                for ar in actual_rows:
                    actual_by_faction[ar["current_party"]][ar["vote_choice"]] = ar["cnt"]

                total_actual_for = sum(f.get("Už", 0) for f in actual_by_faction.values())
                total_actual_against = sum(f.get("Prieš", 0) for f in actual_by_faction.values())
                total_actual_abstain = sum(f.get("Susilaikė", 0) for f in actual_by_faction.values())

                # Expected counts based on faction sizes and historical discipline
                total_expected_for = 0.0
                total_expected_against = 0.0
                total_expected_abstain = 0.0
                total_sigma_sq = 0.0
                faction_deviations = {}

                for party, size in faction_sizes.items():
                    rates = faction_rates.get(party)
                    if not rates:
                        continue

                    exp_for = size * rates["for_rate"]
                    exp_against = size * rates["against_rate"]
                    exp_abstain = size * rates["abstain_rate"]

                    total_expected_for += exp_for
                    total_expected_against += exp_against
                    total_expected_abstain += exp_abstain

                    # Binomial variance: n * p * (1-p)
                    sigma_sq = size * rates["for_rate"] * (1 - rates["for_rate"])
                    total_sigma_sq += sigma_sq

                    act_for = actual_by_faction.get(party, {}).get("Už", 0)
                    act_against = actual_by_faction.get(party, {}).get("Prieš", 0)

                    faction_deviations[party] = {
                        "expected_for": round(exp_for, 1),
                        "actual_for": act_for,
                        "expected_against": round(exp_against, 1),
                        "actual_against": act_against,
                        "delta_for": act_for - round(exp_for),
                    }

                total_sigma = math.sqrt(total_sigma_sq) if total_sigma_sq > 0 else 1.0
                deviation = abs(total_actual_for - total_expected_for)
                deviation_sigma = deviation / total_sigma if total_sigma > 0 else 0.0

                total_analyzed += 1

                # Determine anomaly type
                anomaly_type = None
                if deviation_sigma > 3.0:
                    if total_actual_for > total_expected_for:
                        anomaly_type = "unexpected_pass"
                    elif total_actual_for < total_expected_for:
                        anomaly_type = "unexpected_fail"

                    total_present = total_actual_for + total_actual_against + total_actual_abstain
                    total_expected_present = sum(faction_sizes.values())
                    if total_present < total_expected_present * 0.7:
                        anomaly_type = "mass_absence"

                    flagged_votes.append({
                        "vote_id": vote_id,
                        "title": vote["title"],
                        "date": str(vote["sitting_date"]),
                        "result_type": vote["result_type"],
                        "expected_for": round(total_expected_for, 1),
                        "expected_against": round(total_expected_against, 1),
                        "expected_abstain": round(total_expected_abstain, 1),
                        "actual_for": total_actual_for,
                        "actual_against": total_actual_against,
                        "actual_abstain": total_actual_abstain,
                        "deviation_sigma": round(deviation_sigma, 2),
                        "anomaly_type": anomaly_type,
                        "faction_deviations": faction_deviations,
                    })

                    # Write to DB if table exists
                    if has_table:
                        cur.execute("""
                            INSERT INTO vote_geometry
                                (vote_id, expected_for, expected_against, expected_abstain,
                                 actual_for, actual_against, actual_abstain,
                                 deviation_sigma, anomaly_type, faction_deviations, computed_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT DO NOTHING
                        """, (
                            vote_id,
                            round(total_expected_for, 1),
                            round(total_expected_against, 1),
                            round(total_expected_abstain, 1),
                            total_actual_for,
                            total_actual_against,
                            total_actual_abstain,
                            round(deviation_sigma, 2),
                            anomaly_type,
                            psycopg2.extras.Json(faction_deviations),
                            datetime.utcnow(),
                        ))

            if has_table:
                conn.commit()

    finally:
        if own_conn:
            conn.close()

    logger.info(
        f"Vote geometry: {total_analyzed} votes analyzed, "
        f"{len(flagged_votes)} anomalies (>3σ)"
    )

    return {
        "flagged": sorted(flagged_votes, key=lambda x: -x["deviation_sigma"]),
        "total_analyzed": total_analyzed,
    }
