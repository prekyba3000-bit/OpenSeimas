import math
from datetime import date
from typing import Any, Dict, Iterable, List, Tuple


def _coerce_to_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    # Handle common formats from inconsistent legacy schemas.
    if raw.isdigit() and len(raw) == 8:
        try:
            year = int(raw[0:4])
            month = int(raw[4:6])
            day = int(raw[6:8])
            return date(year, month, day)
        except ValueError:
            return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _normalize(value: float, max_value: float) -> float:
    if max_value <= 0:
        return 0.0
    return _clamp((value / max_value) * 100.0)


def _pick_existing_column(columns: Iterable[str], candidates: Iterable[str]) -> str | None:
    column_set = {c.lower() for c in columns}
    for candidate in candidates:
        if candidate.lower() in column_set:
            return candidate
    return None


def _years_since(first_vote_date: date | None) -> float:
    normalized_date = _coerce_to_date(first_vote_date)
    if not normalized_date:
        return 0.0
    days = (date.today() - normalized_date).days
    return max(0.0, days / 365.25)


def _award_artifacts(metrics: Dict[str, float], integrity_score: float, level: int) -> List[Dict[str, str]]:
    artifacts: List[Dict[str, str]] = []

    if metrics["bills_passed"] > 10:
        artifacts.append({"name": "Gavel of Command", "rarity": "Epic"})
    if integrity_score < 30:
        artifacts.append({"name": "Chains of Scandal", "rarity": "Cursed"})
    if metrics["attendance_percentage"] >= 95:
        artifacts.append({"name": "Sentinel Sigil", "rarity": "Rare"})
    if metrics["party_loyalty"] < 70 and level >= 2:
        artifacts.append({"name": "Cloak of Dissent", "rarity": "Rare"})

    return artifacts


def _derive_alignment(party_loyalty: float, attendance_percentage: float) -> str:
    if party_loyalty > 60:
        method_axis = "Lawful"
    elif party_loyalty < 30:
        method_axis = "Chaotic"
    else:
        method_axis = "Neutral"

    if attendance_percentage > 90:
        motive_axis = "Good"
    elif attendance_percentage < 70:
        motive_axis = "Evil"
    else:
        motive_axis = "Neutral"

    if method_axis == "Neutral" and motive_axis == "Neutral":
        return "True Neutral"
    return f"{method_axis} {motive_axis}"


def _xp_progress(xp: int, level: int) -> Tuple[int, int]:
    if xp < 100:
        return (0, 100)

    current_level_xp = int(math.floor(100 * math.exp(level)))
    next_level_xp = int(math.ceil(100 * math.exp(level + 1)))
    return (current_level_xp, next_level_xp)


def _fetch_table_columns(db_cursor, table_name: str) -> List[str]:
    db_cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table_name,),
    )
    return [row["column_name"] for row in db_cursor.fetchall()]


def _table_exists(db_cursor, table_name: str) -> bool:
    db_cursor.execute("SELECT to_regclass(%s) AS table_name", (f"public.{table_name}",))
    row = db_cursor.fetchone()
    return bool(row and row["table_name"])


def _fetch_conflict_metrics(mp_id: str, db_cursor) -> Tuple[float, int]:
    if not _table_exists(db_cursor, "conflict_alerts"):
        return (0.0, 0)

    columns = _fetch_table_columns(db_cursor, "conflict_alerts")
    id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
    if not id_column:
        return (0.0, 0)

    risk_column = _pick_existing_column(columns, ["risk_score", "risk", "score", "alert_score"])
    severity_column = _pick_existing_column(columns, ["severity", "risk_level", "level"])

    risk_expr = f"COALESCE(AVG({risk_column}), 0)" if risk_column else "0"
    if severity_column:
        high_expr = (
            f"COUNT(*) FILTER (WHERE LOWER(COALESCE({severity_column}::text, '')) "
            "IN ('high', 'critical', 'severe'))"
        )
    elif risk_column:
        high_expr = f"COUNT(*) FILTER (WHERE COALESCE({risk_column}, 0) >= 70)"
    else:
        high_expr = "0"

    db_cursor.execute(
        f"""
        SELECT
            {risk_expr} AS risk_score,
            {high_expr} AS high_risk_alerts
        FROM conflict_alerts
        WHERE {id_column} = %s::uuid
        """,
        (mp_id,),
    )
    row = db_cursor.fetchone()
    return (float(row["risk_score"] or 0), int(row["high_risk_alerts"] or 0))


def _fetch_social_bonus(mp_id: str, db_cursor) -> float:
    columns = _fetch_table_columns(db_cursor, "politicians")
    social_columns = [
        c
        for c in [
            "social_links",
            "social_media",
            "social_url",
            "facebook_url",
            "twitter_url",
            "instagram_url",
            "linkedin_url",
        ]
        if c in columns
    ]

    if not social_columns:
        return 0.0

    checks = " OR ".join(
        [f"NULLIF(TRIM(COALESCE({col}::text, '')), '') IS NOT NULL" for col in social_columns]
    )
    db_cursor.execute(
        f"""
        SELECT CASE WHEN ({checks}) THEN 25 ELSE 0 END AS social_bonus
        FROM politicians
        WHERE id = %s::uuid
        """,
        (mp_id,),
    )
    row = db_cursor.fetchone()
    return float(row["social_bonus"] or 0)


def _fetch_amendments_direct(mp_id: str, db_cursor) -> Tuple[float, bool]:
    if not _table_exists(db_cursor, "amendment_profiles"):
        return (0.0, False)

    columns = _fetch_table_columns(db_cursor, "amendment_profiles")
    id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
    if not id_column:
        return (0.0, False)

    db_cursor.execute(
        f"""
        SELECT COUNT(*)::float AS amendments_proposed
        FROM amendment_profiles
        WHERE {id_column}::text = %s
        """,
        (mp_id,),
    )
    row = db_cursor.fetchone()
    if not row:
        return (0.0, False)
    amendments_count = float(row["amendments_proposed"] or 0)
    return (amendments_count, amendments_count > 0)


def _build_forensic_breakdown(
    mp_id: str, db_cursor, base_risk_score: float, party_loyalty_pct: float
) -> Dict[str, Any]:
    base_risk_penalty = -float(base_risk_score)

    benford = {
        "status": "unavailable",
        "p_value": None,
        "penalty": 0,
        "explanation": "Benford analysis table is unavailable.",
    }
    chrono = {
        "status": "unavailable",
        "worst_zscore": None,
        "penalty": 0,
        "explanation": "Chrono-forensics table is unavailable.",
    }
    vote_geometry = {
        "status": "unavailable",
        "max_deviation_sigma": None,
        "penalty": 0,
        "explanation": "Vote geometry table is unavailable.",
    }
    phantom_network = {
        "status": "unavailable",
        "procurement_links": 0,
        "closest_hop_count": None,
        "debtor_links": 0,
        "penalty": 0,
        "explanation": "Phantom network table is unavailable.",
    }

    if _table_exists(db_cursor, "benford_analyses"):
        columns = _fetch_table_columns(db_cursor, "benford_analyses")
        id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
        p_value_column = _pick_existing_column(columns, ["p_value", "benford_p_value"])
        ts_column = _pick_existing_column(columns, ["updated_at", "created_at", "analyzed_at"])
        if id_column and p_value_column:
            order_sql = f"ORDER BY {ts_column} DESC" if ts_column else ""
            db_cursor.execute(
                f"""
                SELECT {p_value_column} AS p_value
                FROM benford_analyses
                WHERE {id_column} = %s::uuid
                {order_sql}
                LIMIT 1
                """,
                (mp_id,),
            )
            row = db_cursor.fetchone()
            p_value = float(row["p_value"]) if row and row["p_value"] is not None else None
            if p_value is None:
                benford = {
                    "status": "clean",
                    "p_value": None,
                    "penalty": 0,
                    "explanation": "No Benford anomaly detected in available analysis records.",
                }
            elif p_value < 0.01:
                benford = {
                    "status": "critical",
                    "p_value": p_value,
                    "penalty": -25,
                    "explanation": (
                        f"Financial declarations show highly significant Benford deviation (p={p_value:.3f})."
                    ),
                }
            elif p_value < 0.05:
                benford = {
                    "status": "flagged",
                    "p_value": p_value,
                    "penalty": -10,
                    "explanation": (
                        f"Financial declarations show moderate Benford deviation (p={p_value:.3f})."
                    ),
                }
            else:
                benford = {
                    "status": "clean",
                    "p_value": p_value,
                    "penalty": 0,
                    "explanation": (
                        f"Benford analysis is within expected range (p={p_value:.3f})."
                    ),
                }

    if _table_exists(db_cursor, "amendment_profiles"):
        columns = _fetch_table_columns(db_cursor, "amendment_profiles")
        id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
        zscore_column = _pick_existing_column(
            columns, ["speed_anomaly_zscore", "chrono_zscore", "zscore", "temporal_zscore"]
        )
        ts_column = _pick_existing_column(columns, ["updated_at", "created_at", "analyzed_at"])
        if id_column and zscore_column:
            order_sql = f"ORDER BY {ts_column} DESC" if ts_column else ""
            db_cursor.execute(
                f"""
                SELECT COALESCE({zscore_column}, 0) AS worst_zscore
                FROM amendment_profiles
                WHERE {id_column} = %s::uuid
                {order_sql}
                LIMIT 1
                """,
                (mp_id,),
            )
            row = db_cursor.fetchone()
            zscore = float(row["worst_zscore"] or 0) if row else 0.0
            if zscore < -3.0:
                chrono = {
                    "status": "critical",
                    "worst_zscore": zscore,
                    "penalty": -20,
                    "explanation": (
                        f"Amendment drafting speed is extremely anomalous (z={zscore:.2f}, below -3.0)."
                    ),
                }
            elif zscore < -2.0:
                chrono = {
                    "status": "warning",
                    "worst_zscore": zscore,
                    "penalty": -8,
                    "explanation": (
                        f"Amendment drafting speed is suspiciously fast (z={zscore:.2f}, below -2.0)."
                    ),
                }
            else:
                chrono = {
                    "status": "clean",
                    "worst_zscore": zscore,
                    "penalty": 0,
                    "explanation": "No suspiciously fast amendments detected.",
                }

    if _table_exists(db_cursor, "vote_geometry"):
        columns = _fetch_table_columns(db_cursor, "vote_geometry")
        id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
        sigma_column = _pick_existing_column(
            columns, ["deviation_sigma", "max_deviation_sigma", "sigma", "deviation_zscore"]
        )
        ts_column = _pick_existing_column(columns, ["updated_at", "created_at", "analyzed_at"])
        if id_column and sigma_column:
            order_sql = f"ORDER BY {ts_column} DESC" if ts_column else ""
            db_cursor.execute(
                f"""
                SELECT COALESCE({sigma_column}, 0) AS max_deviation_sigma
                FROM vote_geometry
                WHERE {id_column} = %s::uuid
                {order_sql}
                LIMIT 1
                """,
                (mp_id,),
            )
            row = db_cursor.fetchone()
            sigma = float(row["max_deviation_sigma"] or 0) if row else 0.0
            if sigma > 3.0:
                vote_geometry = {
                    "status": "flagged",
                    "max_deviation_sigma": sigma,
                    "penalty": -15,
                    "explanation": (
                        f"Participated in vote geometry outlier event (sigma={sigma:.2f}, above 3.0)."
                    ),
                }
            elif sigma > 2.0:
                vote_geometry = {
                    "status": "warning",
                    "max_deviation_sigma": sigma,
                    "penalty": -5,
                    "explanation": (
                        f"Participated in mildly anomalous vote pattern (sigma={sigma:.2f})."
                    ),
                }
            else:
                vote_geometry = {
                    "status": "clean",
                    "max_deviation_sigma": sigma,
                    "penalty": 0,
                    "explanation": "No statistically unusual vote geometry signals.",
                }

    phantom_table = None
    for candidate in ("phantom_network", "phantom_network_hits", "phantom_links"):
        if _table_exists(db_cursor, candidate):
            phantom_table = candidate
            break

    if phantom_table:
        columns = _fetch_table_columns(db_cursor, phantom_table)
        id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
        procurement_flag_column = _pick_existing_column(
            columns, ["has_procurement_hit", "procurement_hit", "has_public_procurement_link"]
        )
        procurement_count_column = _pick_existing_column(
            columns, ["procurement_links", "procurement_hit_count", "public_procurement_links"]
        )
        hop_column = _pick_existing_column(columns, ["hop_count", "closest_hop_count", "min_hop_count"])
        debtor_flag_column = _pick_existing_column(columns, ["has_debtor_hit", "debtor_hit", "tax_debtor_hit"])
        debtor_count_column = _pick_existing_column(columns, ["debtor_links", "debtor_hit_count", "tax_debtor_links"])
        ts_column = _pick_existing_column(columns, ["updated_at", "created_at", "analyzed_at"])
        if id_column:
            procurement_bool_expr = (
                f"COALESCE({procurement_flag_column}, FALSE)" if procurement_flag_column else "FALSE"
            )
            procurement_count_expr = (
                f"COALESCE({procurement_count_column}, 0)"
                if procurement_count_column
                else f"CASE WHEN {procurement_bool_expr} THEN 1 ELSE 0 END"
            )
            debtor_bool_expr = f"COALESCE({debtor_flag_column}, FALSE)" if debtor_flag_column else "FALSE"
            debtor_count_expr = (
                f"COALESCE({debtor_count_column}, 0)"
                if debtor_count_column
                else f"CASE WHEN {debtor_bool_expr} THEN 1 ELSE 0 END"
            )
            hop_expr = f"{hop_column}" if hop_column else "NULL"
            order_sql = f"ORDER BY {ts_column} DESC" if ts_column else ""
            db_cursor.execute(
                f"""
                SELECT
                    {procurement_bool_expr} AS has_procurement_hit,
                    {procurement_count_expr} AS procurement_links,
                    {hop_expr} AS closest_hop_count,
                    {debtor_bool_expr} AS has_debtor_hit,
                    {debtor_count_expr} AS debtor_links
                FROM {phantom_table}
                WHERE {id_column} = %s::uuid
                {order_sql}
                LIMIT 1
                """,
                (mp_id,),
            )
            row = db_cursor.fetchone()
            if row:
                has_procurement = bool(row["has_procurement_hit"])
                procurement_links = int(row["procurement_links"] or 0)
                hop_count = int(row["closest_hop_count"]) if row["closest_hop_count"] is not None else None
                has_debtor = bool(row["has_debtor_hit"])
                debtor_links = int(row["debtor_links"] or 0)

                penalty = 0
                status = "clean"
                explanation_parts = []
                if has_procurement:
                    if hop_count is not None and hop_count <= 2:
                        penalty -= 30
                        status = "critical"
                        explanation_parts.append(
                            "Direct or near-direct corporate procurement link detected."
                        )
                    else:
                        penalty -= 10
                        status = "flagged"
                        explanation_parts.append(
                            "Indirect procurement corporate link detected."
                        )
                if has_debtor:
                    penalty -= 5
                    if status == "clean":
                        status = "warning"
                    explanation_parts.append("Linked company has tax debtor signal.")

                if not explanation_parts:
                    explanation_parts.append("No procurement or debtor network conflicts detected.")

                phantom_network = {
                    "status": status,
                    "procurement_links": procurement_links,
                    "closest_hop_count": hop_count,
                    "debtor_links": debtor_links,
                    "penalty": penalty,
                    "explanation": " ".join(explanation_parts),
                }
            else:
                phantom_network = {
                    "status": "clean",
                    "procurement_links": 0,
                    "closest_hop_count": None,
                    "debtor_links": 0,
                    "penalty": 0,
                    "explanation": "No phantom network hits found for this MP.",
                }

    # Use disloyalty percentage derived from party loyalty; this avoids inversion ambiguity.
    disloyalty_pct = _clamp(100.0 - party_loyalty_pct, 0.0, 100.0)
    loyalty_bonus = 0
    if 10.0 < disloyalty_pct < 40.0:
        loyalty_bonus = 10

    loyalty_bonus_obj = {
        "status": "warning" if loyalty_bonus > 0 else "clean",
        "independent_voting_days_pct": round(disloyalty_pct, 2),
        "bonus": loyalty_bonus,
        "explanation": (
            (
                f"Estimated independent voting rate is {disloyalty_pct:.1f}%; "
                "this is independent but not fully detached, so integrity bonus is applied."
            )
            if loyalty_bonus > 0
            else (
                f"Estimated independent voting rate is {disloyalty_pct:.1f}%; "
                "outside the calibrated 10-40% independent range, so no loyalty bonus is applied."
            )
        ),
    }

    raw_penalty_sum = (
        benford["penalty"]
        + chrono["penalty"]
        + vote_geometry["penalty"]
        + phantom_network["penalty"]
    )
    forensic_penalty = max(-60, raw_penalty_sum)
    total_forensic_adjustment = forensic_penalty + loyalty_bonus
    final_integrity_score = _clamp(100 + base_risk_penalty + total_forensic_adjustment)

    return {
        "base_risk_score": round(base_risk_score, 3),
        "base_risk_penalty": round(base_risk_penalty, 3),
        "benford": benford,
        "chrono": chrono,
        "vote_geometry": vote_geometry,
        "phantom_network": phantom_network,
        "loyalty_bonus": loyalty_bonus_obj,
        "raw_forensic_penalty_sum": raw_penalty_sum,
        "capped_forensic_penalty": forensic_penalty,
        "total_forensic_adjustment": total_forensic_adjustment,
        "final_integrity_score": round(final_integrity_score, 2),
    }


def _fetch_party_loyalty(mp_id: str, db_cursor) -> float:
    if _table_exists(db_cursor, "mp_stats_summary"):
        summary_columns = _fetch_table_columns(db_cursor, "mp_stats_summary")
        if "party_loyalty" in {c.lower() for c in summary_columns}:
            db_cursor.execute(
                """
                SELECT COALESCE(party_loyalty, 0) AS party_loyalty
                FROM mp_stats_summary
                WHERE mp_id = %s::uuid
                """,
                (mp_id,),
            )
            row = db_cursor.fetchone()
            if row:
                return float(row["party_loyalty"] or 0)

    db_cursor.execute(
        """
        WITH normalized_votes AS (
            SELECT
                mv.vote_id,
                mv.politician_id,
                p.current_party,
                CASE
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz') THEN 'UZ'
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) IN ('prieš', 'pries') THEN 'PRIES'
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'susilaik%%' THEN 'SUSILAIKE'
                    WHEN LOWER(COALESCE(mv.vote_choice, '')) LIKE 'nedalyv%%' THEN 'NEDALYVAVO'
                    ELSE UPPER(TRIM(COALESCE(mv.vote_choice, '')))
                END AS vote_choice_norm
            FROM mp_votes mv
            JOIN politicians p ON mv.politician_id = p.id
        ),
        party_consensus AS (
            SELECT
                nv.vote_id,
                nv.current_party,
                nv.vote_choice_norm,
                COUNT(*) AS choice_count,
                SUM(COUNT(*)) OVER (
                    PARTITION BY nv.vote_id, nv.current_party
                ) AS party_total_count,
                ROW_NUMBER() OVER (
                    PARTITION BY nv.vote_id, nv.current_party
                    ORDER BY COUNT(*) DESC, nv.vote_choice_norm ASC
                ) AS row_num
            FROM normalized_votes nv
            WHERE nv.vote_choice_norm != 'NEDALYVAVO'
            GROUP BY nv.vote_id, nv.current_party, nv.vote_choice_norm
        ),
        dominant_choice AS (
            SELECT
                vote_id,
                current_party,
                vote_choice_norm AS party_majority_choice,
                choice_count,
                party_total_count
            FROM party_consensus
            WHERE row_num = 1
        ),
        loyalty_base AS (
            SELECT
                nv.politician_id,
                COUNT(*) FILTER (
                    WHERE dc.party_total_count > 0
                      AND (dc.choice_count::numeric / dc.party_total_count) > 0.5
                ) AS total_comparable_votes,
                COUNT(*) FILTER (WHERE nv.vote_choice_norm = dc.party_majority_choice) AS aligned_votes
            FROM normalized_votes nv
            JOIN dominant_choice dc
                ON nv.vote_id = dc.vote_id
               AND nv.current_party = dc.current_party
            WHERE nv.vote_choice_norm != 'NEDALYVAVO'
              AND dc.party_total_count > 0
              AND (dc.choice_count::numeric / dc.party_total_count) > 0.5
            GROUP BY nv.politician_id
        )
        SELECT
            CASE
                WHEN lb.total_comparable_votes > 0 THEN
                    ROUND((lb.aligned_votes::numeric / lb.total_comparable_votes) * 100, 2)
                ELSE 0
            END AS party_loyalty
        FROM loyalty_base lb
        WHERE lb.politician_id = %s::uuid
        """,
        (mp_id,),
    )
    row = db_cursor.fetchone()
    return float(row["party_loyalty"]) if row else 0.0


def _fetch_mp_metrics(mp_id: str, db_cursor) -> Dict[str, Any] | None:
    db_cursor.execute(
        """
        WITH vote_rollup AS (
            SELECT
                mv.politician_id AS mp_id,
                COUNT(mv.vote_id) FILTER (
                    WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
                ) AS votes_participated,
                COUNT(mv.vote_id) FILTER (
                    WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz')
                      AND COALESCE(v.result_type, '') = 'Priimta'
                ) AS votes_for_passed,
                COUNT(DISTINCT v.sitting_date) FILTER (
                    WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
                ) AS active_vote_days,
                COUNT(mv.vote_id) FILTER (
                    WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
                      AND COALESCE(v.vote_type, '') ILIKE '%%pateik%%'
                ) AS amendment_votes,
                MIN(v.sitting_date) FILTER (
                    WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
                ) AS first_vote_date
            FROM mp_votes mv
            LEFT JOIN votes v ON mv.vote_id = v.seimas_vote_id
            GROUP BY mv.politician_id
        ),
        speech_rollup AS (
            SELECT mp_id, COUNT(*) AS speeches_given
            FROM speeches
            GROUP BY mp_id
        ),
        committee_rollup AS (
            SELECT
                mp_id,
                COUNT(*) FILTER (
                    WHERE LOWER(COALESCE(role, '')) IN ('chair', 'deputy chair')
                ) AS committee_leadership_roles
            FROM committee_memberships
            GROUP BY mp_id
        )
        SELECT
            p.id,
            p.display_name,
            p.current_party,
            p.photo_url,
            p.is_active,
            p.seimas_mp_id,
            p.last_synced_at,
            COALESCE(p.bills_authored_count, 0) AS bills_authored_count,
            COALESCE(s.total_votes_cast, 0) AS total_votes_cast,
            COALESCE(s.attendance_percentage, 0) AS attendance_percentage,
            COALESCE(s.amendments_proposed_count, 0) AS amendments_proposed_count,
            COALESCE(sr.speeches_given, 0) AS speeches_given,
            COALESCE(cr.committee_leadership_roles, 0) AS committee_leadership_roles,
            COALESCE(vr.votes_participated, 0) AS votes_participated,
            COALESCE(vr.votes_for_passed, 0) AS votes_for_passed,
            COALESCE(vr.active_vote_days, 0) AS active_vote_days,
            vr.first_vote_date
        FROM politicians p
        LEFT JOIN mp_stats_summary s ON p.id = s.mp_id
        LEFT JOIN speech_rollup sr ON p.id = sr.mp_id
        LEFT JOIN committee_rollup cr ON p.id = cr.mp_id
        LEFT JOIN vote_rollup vr ON p.id = vr.mp_id
        WHERE p.id = %s::uuid
        """,
        (mp_id,),
    )
    return db_cursor.fetchone()


def _fetch_metric_maxima(db_cursor) -> Dict[str, float]:
    db_cursor.execute(
        """
        WITH vote_rollup AS (
            SELECT
                p.id AS mp_id,
                COUNT(mv.vote_id) FILTER (
                    WHERE LOWER(COALESCE(mv.vote_choice, '')) IN ('už', 'uz')
                      AND COALESCE(v.result_type, '') = 'Priimta'
                ) AS votes_for_passed,
                COUNT(mv.vote_id) FILTER (
                    WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
                      AND COALESCE(v.vote_type, '') ILIKE '%%pateik%%'
                ) AS amendment_votes,
                MIN(v.sitting_date) FILTER (
                    WHERE COALESCE(mv.vote_choice, '') !~* '^nedalyvavo$'
                ) AS first_vote_date
            FROM politicians p
            LEFT JOIN mp_votes mv ON p.id = mv.politician_id
            LEFT JOIN votes v ON mv.vote_id = v.seimas_vote_id
            GROUP BY p.id
        ),
        speech_rollup AS (
            SELECT p.id AS mp_id, COALESCE(COUNT(sp.id), 0) AS speeches_given
            FROM politicians p
            LEFT JOIN speeches sp ON p.id = sp.mp_id
            GROUP BY p.id
        ),
        committee_rollup AS (
            SELECT
                p.id AS mp_id,
                COALESCE(
                    COUNT(cm.id) FILTER (
                        WHERE LOWER(COALESCE(cm.role, '')) IN ('chair', 'deputy chair')
                    ),
                    0
                ) AS committee_leadership_roles
            FROM politicians p
            LEFT JOIN committee_memberships cm ON p.id = cm.mp_id
            GROUP BY p.id
        ),
        mp_rollup AS (
            SELECT
                p.id,
                COALESCE(p.bills_authored_count, 0) AS bills_authored_count,
                COALESCE(cr.committee_leadership_roles, 0) AS committee_leadership_roles,
                COALESCE(sr.speeches_given, 0) AS speeches_given,
                COALESCE(vr.votes_for_passed, 0) AS votes_for_passed,
                COALESCE(vr.amendment_votes, 0) AS amendment_votes,
                vr.first_vote_date
            FROM politicians p
            LEFT JOIN committee_rollup cr ON p.id = cr.mp_id
            LEFT JOIN speech_rollup sr ON p.id = sr.mp_id
            LEFT JOIN vote_rollup vr ON p.id = vr.mp_id
        )
        SELECT
            COALESCE(MAX(bills_authored_count), 0) AS max_bills_authored,
            COALESCE(MAX(committee_leadership_roles), 0) AS max_committee_leadership,
            COALESCE(MAX(speeches_given), 0) AS max_speeches_given,
            COALESCE(MAX(amendment_votes), 0) AS max_amendments_proposed_proxy,
            COALESCE((SELECT MAX(amendments_proposed_count) FROM mp_stats_summary), 0) AS max_amendments_proposed_count,
            COALESCE(
                0,
                0
            ) AS max_years_in_parliament,
            COALESCE((SELECT MAX(total_votes_cast) FROM mp_stats_summary), 0) AS max_total_votes_cast
        FROM mp_rollup
        """
    )
    row = db_cursor.fetchone()
    amendments_direct_max = 0.0
    amendments_direct_available = False
    if _table_exists(db_cursor, "amendment_profiles"):
        columns = _fetch_table_columns(db_cursor, "amendment_profiles")
        id_column = _pick_existing_column(columns, ["politician_id", "mp_id"])
        if id_column:
            db_cursor.execute(
                f"""
                SELECT COALESCE(MAX(amendment_count), 0) AS max_amendments
                FROM (
                    SELECT {id_column}, COUNT(*) AS amendment_count
                    FROM amendment_profiles
                    GROUP BY {id_column}
                ) t
                """
            )
            amendments_row = db_cursor.fetchone()
            amendments_direct_max = float(amendments_row["max_amendments"] or 0)
            amendments_direct_available = True

    return {
        "max_bills_authored": float(row["max_bills_authored"] or 0),
        "max_committee_leadership": float(row["max_committee_leadership"] or 0),
        "max_speeches_given": float(row["max_speeches_given"] or 0),
        "max_amendments_proposed_proxy": float(row["max_amendments_proposed_proxy"] or 0),
        "max_amendments_proposed_count": float(row["max_amendments_proposed_count"] or 0),
        "max_amendments_proposed_direct": amendments_direct_max,
        "amendments_direct_available": amendments_direct_available,
        "max_years_in_parliament": float(row["max_years_in_parliament"] or 0),
        "max_total_votes_cast": float(row["max_total_votes_cast"] or 0),
    }


def calculate_hero_profile(mp_id: str, db_cursor) -> Dict[str, Any]:
    metrics_provenance = {
        "STR": "unavailable",
        "WIS": "proxy",
        "CHA": "proxy",
        "INT": "proxy",
        "STA": "proxy",
    }

    mp_row = _fetch_mp_metrics(mp_id, db_cursor)
    if not mp_row:
        raise ValueError("MP not found")

    maxima = _fetch_metric_maxima(db_cursor)
    party_loyalty = _fetch_party_loyalty(mp_id, db_cursor)
    social_bonus = _fetch_social_bonus(mp_id, db_cursor)
    risk_score, high_risk_alerts = _fetch_conflict_metrics(mp_id, db_cursor)
    forensic_breakdown = _build_forensic_breakdown(mp_id, db_cursor, risk_score, party_loyalty)
    amendments_direct, has_direct_amendments = _fetch_amendments_direct(mp_id, db_cursor)

    years_in_parliament = _years_since(mp_row["first_vote_date"])
    bills_authored = float(mp_row["bills_authored_count"] or 0)
    committee_leadership = float(mp_row["committee_leadership_roles"] or 0)
    bills_passed = float(mp_row["votes_for_passed"] or 0)
    total_votes_cast = float(mp_row["total_votes_cast"] or 0)
    # Direct source of CHA: count communication entries in speeches table for this MP.
    db_cursor.execute("SELECT COUNT(*) AS speech_count FROM speeches WHERE mp_id::text = %s", (mp_id,))
    speech_row = db_cursor.fetchone()
    speeches_given = float(speech_row["speech_count"] or 0) if speech_row else 0.0
    attendance_percentage = float(mp_row["attendance_percentage"] or 0)
    amendments_proposed_count = float(mp_row["amendments_proposed_count"] or 0)
    amendments_proposed = amendments_direct if has_direct_amendments else amendments_proposed_count
    bills_proposed = bills_authored

    db_cursor.execute(
        """
        SELECT COALESCE(NULLIF(current_party, ''), 'Unknown') AS party_name
        FROM politicians
        WHERE id = %s::uuid
        """,
        (mp_id,),
    )
    party_row = db_cursor.fetchone()
    party_name = party_row["party_name"] if party_row else (mp_row["current_party"] or "Unknown")

    str_score = (0.6 * _normalize(bills_authored, maxima["max_bills_authored"])) + (
        0.4 * _normalize(committee_leadership, maxima["max_committee_leadership"])
    )
    wis_score = (
        0.5 * _normalize(years_in_parliament, maxima["max_years_in_parliament"])
        + 0.3 * _normalize(total_votes_cast, maxima["max_total_votes_cast"])
        + 0.2 * _normalize(amendments_proposed_count, maxima["max_amendments_proposed_count"])
    )
    cha_score = (0.5 * _normalize(speeches_given, maxima["max_speeches_given"])) + (0.5 * social_bonus)
    # INT remains 100 when forensic source tables are empty; this is expected baseline behavior.
    int_score = float(forensic_breakdown["final_integrity_score"])
    amendments_max = (
        maxima["max_amendments_proposed_direct"]
        if has_direct_amendments and maxima["amendments_direct_available"]
        else maxima["max_amendments_proposed_proxy"]
    )
    sta_score = (0.8 * _clamp(attendance_percentage)) + (
        0.2 * _normalize(amendments_proposed, amendments_max)
    )

    if bills_authored == 0:
        metrics_provenance["STR"] = "unavailable"
    elif maxima["max_bills_authored"] > 0 or maxima["max_committee_leadership"] > 0:
        metrics_provenance["STR"] = "direct"
    metrics_provenance["WIS"] = "direct"
    if maxima["max_speeches_given"] > 0:
        metrics_provenance["CHA"] = "direct"
    if (
        _table_exists(db_cursor, "conflict_alerts")
        or _table_exists(db_cursor, "benford_analyses")
        or _table_exists(db_cursor, "amendment_profiles")
        or _table_exists(db_cursor, "vote_geometry")
        or _table_exists(db_cursor, "phantom_network")
        or _table_exists(db_cursor, "phantom_network_hits")
        or _table_exists(db_cursor, "phantom_links")
    ):
        metrics_provenance["INT"] = "direct"
    if has_direct_amendments:
        metrics_provenance["STA"] = "direct"

    xp = int(
        round(
            (total_votes_cast * 1)
            + (bills_proposed * 10)
            + (bills_passed * 50)
            - (high_risk_alerts * 100)
        )
    )

    if xp < 100:
        level = 0
    else:
        level = max(0, int(math.floor(math.log(xp / 100))))

    alignment = _derive_alignment(
        party_loyalty=party_loyalty, attendance_percentage=attendance_percentage
    )
    current_level_xp, next_level_xp = _xp_progress(xp=xp, level=level)

    metrics = {
        "bills_authored_count": bills_authored,
        "bills_passed": bills_passed,
        "committee_leadership": committee_leadership,
        "years_in_parliament": years_in_parliament,
        "total_votes_cast": total_votes_cast,
        "speeches_given": speeches_given,
        "social_bonus": social_bonus,
        "risk_score": risk_score,
        "forensic_penalties": {
            "benford_penalty": forensic_breakdown["benford"]["penalty"],
            "chrono_penalty": forensic_breakdown["chrono"]["penalty"],
            "geometry_penalty": forensic_breakdown["vote_geometry"]["penalty"],
            "phantom_penalty": forensic_breakdown["phantom_network"]["penalty"],
            "loyalty_bonus": forensic_breakdown["loyalty_bonus"]["bonus"],
            "total_forensic_adjustment": forensic_breakdown["total_forensic_adjustment"],
        },
        "attendance_percentage": attendance_percentage,
        "amendments_proposed": amendments_proposed,
        "amendments_proposed_proxy": amendments_proposed_count,
        "bills_proposed": bills_proposed,
        "party_loyalty": party_loyalty,
        "high_risk_alerts": high_risk_alerts,
    }

    return {
        "mp": {
            "id": str(mp_row["id"]),
            "name": mp_row["display_name"],
            "party": party_name,
            "photo": mp_row["photo_url"],
            "active": mp_row["is_active"],
            "seimas_id": mp_row["seimas_mp_id"],
            "last_synced_at": str(mp_row["last_synced_at"]) if mp_row.get("last_synced_at") else None,
        },
        "level": level,
        "xp": xp,
        "xp_current_level": current_level_xp,
        "xp_next_level": next_level_xp,
        "alignment": alignment,
        "attributes": {
            "STR": round(_clamp(str_score), 2),
            "WIS": round(_clamp(wis_score), 2),
            "CHA": round(_clamp(cha_score), 2),
            "INT": round(_clamp(int_score), 2),
            "STA": round(_clamp(sta_score), 2),
        },
        "artifacts": _award_artifacts(metrics=metrics, integrity_score=int_score, level=level),
        "metrics": metrics,
        "metrics_provenance": metrics_provenance,
        "forensic_breakdown": forensic_breakdown,
    }


def calculate_all_hero_profiles(
    db_cursor, active_only: bool = True, limit: int | None = None
) -> List[Dict[str, Any]]:
    if active_only:
        if limit is not None:
            db_cursor.execute(
                "SELECT id FROM politicians WHERE is_active = TRUE ORDER BY display_name LIMIT %s",
                (limit,),
            )
        else:
            db_cursor.execute("SELECT id FROM politicians WHERE is_active = TRUE ORDER BY display_name")
    else:
        if limit is not None:
            db_cursor.execute("SELECT id FROM politicians ORDER BY display_name LIMIT %s", (limit,))
        else:
            db_cursor.execute("SELECT id FROM politicians ORDER BY display_name")
    rows = db_cursor.fetchall()

    profiles: List[Dict[str, Any]] = []
    for row in rows:
        try:
            profiles.append(calculate_hero_profile(str(row["id"]), db_cursor))
        except ValueError:
            continue

    profiles.sort(key=lambda p: (p["level"], p["xp"]), reverse=True)
    return profiles
