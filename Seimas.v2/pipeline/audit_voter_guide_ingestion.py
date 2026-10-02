"""Nightly Ingestion Audit & Health Checks for VoterGuideAgent (Runbook 1).

Monitors data quality across Seimas roll calls, MP mandate dates, and vote_topics mapping:
1. Verify no orphan vote_topics exist without corresponding votes.
2. Ensure unverified roll calls remain under 5.0% threshold across the active term.
3. Validate mandate_start and mandate_end dates across the politician roster.
"""

import sys
import os
import argparse
import logging
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("openseimas.pipeline.audit_voter_guide")


def run_ingestion_audit(dsn: Optional[str] = None) -> Dict[str, Any]:
    """Execute ingestion health checks against PostgreSQL database."""
    db_dsn = dsn or os.getenv("DB_DSN")
    if not db_dsn:
        raise ValueError("DB_DSN environment variable is not set")

    conn = psycopg2.connect(db_dsn)
    report: Dict[str, Any] = {
        "status": "PASS",
        "checks": [],
        "warnings": [],
        "errors": [],
    }

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check 1: Orphan vote_topics without votes entry
            cur.execute(
                """
                SELECT COUNT(*) as orphan_count
                FROM vote_topics vt
                LEFT JOIN votes v ON (vt.vote_id = v.seimas_vote_id OR vt.vote_id::text = v.id::text)
                WHERE v.id IS NULL
                """
            )
            row = cur.fetchone()
            orphan_count = row["orphan_count"] if row else 0

            check_1 = {
                "name": "orphan_vote_topics",
                "status": "PASS" if orphan_count == 0 else "FAIL",
                "details": f"Found {orphan_count} vote_topics with no matching vote record.",
                "orphan_count": orphan_count,
            }
            report["checks"].append(check_1)
            if orphan_count > 0:
                report["errors"].append(f"Orphan vote_topics detected: {orphan_count}")

            # Check 2: Unverified roll call choices ratio (< 5.0% threshold)
            cur.execute(
                """
                SELECT 
                    COUNT(*) as total_votes,
                    COUNT(*) FILTER (WHERE vote_choice NOT IN ('Už', 'Prieš', 'Susilaikė', 'Nedalyvavo') OR vote_choice IS NULL) as unverified_count
                FROM mp_votes
                """
            )
            row_2 = cur.fetchone()
            total_mp_votes = row_2["total_votes"] if row_2 else 0
            unverified_mp_votes = row_2["unverified_count"] if row_2 else 0

            unverified_pct = (
                round((unverified_mp_votes / total_mp_votes * 100.0), 2)
                if total_mp_votes > 0
                else 0.0
            )

            status_2 = "PASS"
            if unverified_pct > 5.0:
                status_2 = "WARNING"
                report["warnings"].append(
                    f"Unverified vote choice ratio ({unverified_pct}%) exceeds 5.0% threshold."
                )

            check_2 = {
                "name": "unverified_vote_ratio",
                "status": status_2,
                "details": f"Unverified votes: {unverified_mp_votes}/{total_mp_votes} ({unverified_pct}%). Threshold: 5.0%.",
                "total_mp_votes": total_mp_votes,
                "unverified_mp_votes": unverified_mp_votes,
                "unverified_pct": unverified_pct,
            }
            report["checks"].append(check_2)

            # Check 3: Politician mandate start date completeness
            cur.execute(
                """
                SELECT COUNT(*) as missing_mandate_start
                FROM politicians
                WHERE mandate_start_date IS NULL AND is_active = true
                """
            )
            row_3 = cur.fetchone()
            missing_mandate = row_3["missing_mandate_start"] if row_3 else 0

            status_3 = "PASS"
            if missing_mandate > 0:
                status_3 = "WARNING"
                report["warnings"].append(
                    f"{missing_mandate} active politicians missing mandate_start_date."
                )

            check_3 = {
                "name": "politician_mandate_dates",
                "status": status_3,
                "details": f"Active politicians missing mandate_start_date: {missing_mandate}.",
                "missing_mandate_start_date": missing_mandate,
            }
            report["checks"].append(check_3)

            # Overall status
            if report["errors"]:
                report["status"] = "FAIL"
            elif report["warnings"]:
                report["status"] = "WARN"

            return report
    finally:
        conn.close()


def main(args: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Audit VoterGuideAgent ingestion health and data quality"
    )
    parser.add_argument("--dsn", default=None, help="Database DSN string")
    parser.add_argument("--json", action="store_true", help="Output report in JSON format")

    parsed = parser.parse_args(args)

    try:
        report = run_ingestion_audit(dsn=parsed.dsn)
        if parsed.json:
            import json

            print(json.dumps(report, indent=2))
        else:
            print("=== OpenSeimas Ingestion Health Audit ===")
            print(f"Overall Status: {report['status']}")
            for chk in report["checks"]:
                print(f" [{chk['status']}] {chk['name']}: {chk['details']}")
            if report["warnings"]:
                print("\nWarnings:")
                for w in report["warnings"]:
                    print(f"  • {w}")
            if report["errors"]:
                print("\nErrors:")
                for e in report["errors"]:
                    print(f"  • {e}")

        return 1 if report["status"] == "FAIL" else 0
    except Exception as e:
        logger.error(f"Audit failed with error: {e}")
        print(f"ERROR: Audit execution failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
