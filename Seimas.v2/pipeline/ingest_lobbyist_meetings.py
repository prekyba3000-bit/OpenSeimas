"""Ingestion module for VTEK Lobbyist Meeting Registers."""

import logging
import os
import sys
from typing import Dict, Any, List, Optional
import psycopg2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry
from pipeline.common import record_fetch
from pipeline.fortress_client import is_cloudflare_or_js_challenge, fetch_with_fortress

logger = logging.getLogger("openseimas.pipeline.lobbyist")

LOBBYIST_BASE_URL = "https://skaidrumas.vtek.lt/app/lobistine-veikla"


def fetch_lobbyist_meetings(page: int = 1) -> Optional[Dict[str, Any]]:
    """Fetch lobbyist meeting records via 3-Tier Hybrid fetcher."""
    url = f"{LOBBYIST_BASE_URL}?page={page}"
    try:
        res = fetch_with_retry(url, timeout=30, allow_fortress_fallback=True)
        if is_cloudflare_or_js_challenge(res.text, res.status_code):
            logger.info("[LOBBYIST] JS challenge on page %d; rendering with Fortress", page)
            html = fetch_with_fortress(url)
            if not html:
                return None
            return {"page": page, "html": html}
        return {"page": page, "html": res.text}
    except Exception as exc:
        logger.error("[LOBBYIST] Failed to fetch lobbyist page %d: %s", page, exc)
        return None


def run_lobbyist_ingest(conn, meetings: List[Dict[str, Any]]) -> int:
    """Ingest lobbyist meetings into database."""
    inserted = 0
    with record_fetch(conn, "lobbyist_meetings", LOBBYIST_BASE_URL) as fetch:
        with conn.cursor() as cur:
            for item in meetings:
                cur.execute(
                    """
                    INSERT INTO lobbyist_meetings (
                        meeting_id, lobbyist_name, lobbyist_organization,
                        official_mp_id, official_name, meeting_date,
                        topic_summary, bill_registration_number, source_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (meeting_id) DO UPDATE SET
                        topic_summary = EXCLUDED.topic_summary
                    """,
                    (
                        item["meeting_id"],
                        item["lobbyist_name"],
                        item.get("lobbyist_organization"),
                        item.get("official_mp_id"),
                        item.get("official_name", ""),
                        item["meeting_date"],
                        item.get("topic_summary", ""),
                        item.get("bill_registration_number"),
                        item.get("source_url", LOBBYIST_BASE_URL)
                    )
                )
                inserted += 1
        conn.commit()
        fetch["rows"] = inserted
    return inserted
