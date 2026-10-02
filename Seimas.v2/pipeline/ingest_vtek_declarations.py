"""Ingestion module for VTEK Private Interests Declarations (assets, corporate ties, gifts)."""

import logging
import os
import sys
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry
from pipeline.common import record_fetch, record_snapshot
from pipeline.fortress_client import is_cloudflare_or_js_challenge, fetch_with_fortress

logger = logging.getLogger("openseimas.pipeline.vtek")

VTEK_BASE_URL = "https://pinreg.vtek.lt/app/viesieji-interesai"


def fetch_vtek_declaration(mp_id: int, declaration_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single VTEK private interests declaration.
    Uses 3-Tier Hybrid fetcher (Direct HTTP -> Scraper Proxy -> Fortress Stealth Chromium).
    """
    url = f"{VTEK_BASE_URL}/deklaracija/{declaration_id}"
    try:
        res = fetch_with_retry(url, timeout=30, allow_fortress_fallback=True)
        if is_cloudflare_or_js_challenge(res.text, res.status_code):
            logger.info("[VTEK] JS challenge detected for declaration %s; invoking Fortress Stealth Chromium", declaration_id)
            html = fetch_with_fortress(url)
            if not html:
                return None
            return {"declaration_id": declaration_id, "html": html}
        return {"declaration_id": declaration_id, "html": res.text}
    except Exception as exc:
        logger.error("[VTEK] Failed to fetch declaration %s: %s", declaration_id, exc)
        return None


def run_vtek_ingest(conn, declarations: List[Dict[str, Any]]) -> int:
    """Ingest VTEK declarations into PostgreSQL database."""
    inserted = 0
    with record_fetch(conn, "vtek_declarations", VTEK_BASE_URL) as fetch:
        with conn.cursor() as cur:
            for item in declarations:
                cur.execute(
                    """
                    INSERT INTO vtek_declarations (
                        seimas_mp_id, declaration_id, declaration_type,
                        declarant_name, position_title, declared_assets_summary,
                        corporate_interests, gifts_declared, declared_date, source_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (declaration_id) DO UPDATE SET
                        declared_assets_summary = EXCLUDED.declared_assets_summary,
                        corporate_interests = EXCLUDED.corporate_interests,
                        updated_at = NOW()
                    """,
                    (
                        item.get("seimas_mp_id"),
                        item["declaration_id"],
                        item.get("declaration_type", "annual"),
                        item.get("declarant_name", ""),
                        item.get("position_title", ""),
                        psycopg2.extras.Json(item.get("declared_assets_summary", {})),
                        psycopg2.extras.Json(item.get("corporate_interests", [])),
                        psycopg2.extras.Json(item.get("gifts_declared", [])),
                        item.get("declared_date"),
                        item.get("source_url", f"{VTEK_BASE_URL}/deklaracija/{item['declaration_id']}")
                    )
                )
                inserted += 1
        conn.commit()
        fetch["rows"] = inserted
    return inserted
