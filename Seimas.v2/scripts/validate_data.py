"""Data validation script for verifying OpenSeimas database integrity."""

import logging
import os
import sys
from typing import NoReturn, Optional

import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def validate_data() -> None:
    """Connect to the PostgreSQL database and check table counts and foreign key integrity."""
    db_dsn: Optional[str] = os.getenv("DB_DSN")
    if not db_dsn:
        logger.error("DB_DSN environment variable is not set.")
        sys.exit(1)

    try:
        with psycopg2.connect(db_dsn) as conn:
            with conn.cursor() as cur:
                logger.info("=== DATA VALIDATION REPORT ===")

                # Check Politicians
                cur.execute("SELECT count(*) FROM politicians")
                row = cur.fetchone()
                mp_count: int = row[0] if row else 0
                logger.info("[DATA] Total MPs: %d", mp_count)

                # Check Votes
                cur.execute("SELECT count(*) FROM votes")
                row = cur.fetchone()
                vote_count: int = row[0] if row else 0
                logger.info("[DATA] Total Votes: %d", vote_count)

                # Check Relationships
                cur.execute(
                    "SELECT count(*) FROM mp_votes WHERE politician_id NOT IN (SELECT id FROM politicians)"
                )
                row = cur.fetchone()
                orphaned_votes: int = row[0] if row else 0
                if orphaned_votes > 0:
                    logger.warning("Found %d orphaned votes (no matching politician).", orphaned_votes)
                else:
                    logger.info("[OK] All votes linked to known politicians.")

                logger.info("=== VALIDATION COMPLETE ===")

    except psycopg2.Error as err:
        logger.error("Database validation failed: %s", err)
        sys.exit(1)


if __name__ == "__main__":
    validate_data()
