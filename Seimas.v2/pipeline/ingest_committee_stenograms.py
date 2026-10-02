"""Ingestion module for Seimas Committee Stenograms and Minutes."""

import logging
import os
import sys
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry
from pipeline.common import record_fetch
from pipeline.fortress_client import is_cloudflare_or_js_challenge, fetch_with_fortress

logger = logging.getLogger("openseimas.pipeline.committee")

COMMITTEE_BASE_URL = "https://www.lrs.lt/sip/portal.show?p_r=35391"


def fetch_committee_minutes(committee_id: str, sitting_date: str) -> Optional[Dict[str, Any]]:
    """Fetch committee meeting stenogram/minutes using 3-Tier Hybrid fetcher."""
    url = f"{COMMITTEE_BASE_URL}&k_id={committee_id}&date={sitting_date}"
    try:
        res = fetch_with_retry(url, timeout=30, allow_fortress_fallback=True)
        if is_cloudflare_or_js_challenge(res.text, res.status_code):
            logger.info("[COMMITTEE] JS challenge detected for committee %s; rendering with Fortress", committee_id)
            html = fetch_with_fortress(url)
            if not html:
                return None
            return {"committee_id": committee_id, "sitting_date": sitting_date, "html": html}
        return {"committee_id": committee_id, "sitting_date": sitting_date, "html": res.text}
    except Exception as exc:
        logger.error("[COMMITTEE] Failed to fetch committee %s minutes: %s", committee_id, exc)
        return None


def run_committee_ingest(conn, stenograms: List[Dict[str, Any]]) -> int:
    """Ingest committee stenograms into database."""
    inserted = 0
    with record_fetch(conn, "committee_stenograms", COMMITTEE_BASE_URL) as fetch:
        with conn.cursor() as cur:
            for item in stenograms:
                cur.execute(
                    """
                    INSERT INTO committee_stenograms (
                        committee_name, sitting_date, sitting_number,
                        bill_registration_number, agenda_topics,
                        attendees_mp_ids, transcript_text, source_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        item["committee_name"],
                        item["sitting_date"],
                        item.get("sitting_number"),
                        item.get("bill_registration_number"),
                        psycopg2.extras.Json(item.get("agenda_topics", [])),
                        item.get("attendees_mp_ids", []),
                        item.get("transcript_text", ""),
                        item.get("source_url", COMMITTEE_BASE_URL)
                    )
                )
                inserted += 1
        conn.commit()
        fetch["rows"] = inserted
    return inserted
