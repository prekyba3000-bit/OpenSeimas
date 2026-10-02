"""Ingestion module for CVP IS / VPT State Procurement Tenders and Contracts."""

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

logger = logging.getLogger("openseimas.pipeline.procurement")

CVP_BASE_URL = "https://cvpis.eviesiejipirkimai.lt"


def fetch_procurement_tender(tender_id: str) -> Optional[Dict[str, Any]]:
    """Fetch procurement contract details from CVP IS using 3-Tier Hybrid fetcher."""
    url = f"{CVP_BASE_URL}/Notice/Details/{tender_id}"
    try:
        res = fetch_with_retry(url, timeout=30, allow_fortress_fallback=True)
        if is_cloudflare_or_js_challenge(res.text, res.status_code):
            logger.info("[PROCUREMENT] JS challenge detected for tender %s; invoking Fortress", tender_id)
            html = fetch_with_fortress(url)
            if not html:
                return None
            return {"tender_id": tender_id, "html": html}
        return {"tender_id": tender_id, "html": res.text}
    except Exception as exc:
        logger.error("[PROCUREMENT] Failed to fetch tender %s: %s", tender_id, exc)
        return None


def run_procurement_ingest(conn, tenders: List[Dict[str, Any]]) -> int:
    """Ingest CVP IS procurement contracts into database."""
    inserted = 0
    with record_fetch(conn, "procurement_tenders", CVP_BASE_URL) as fetch:
        with conn.cursor() as cur:
            for item in tenders:
                cur.execute(
                    """
                    INSERT INTO procurement_tenders (
                        tender_id, title, buyer_name, supplier_name,
                        supplier_code, contract_value_eur, contract_date,
                        mp_relation_note, linked_mp_id, source_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (tender_id) DO UPDATE SET
                        contract_value_eur = EXCLUDED.contract_value_eur,
                        supplier_name = EXCLUDED.supplier_name
                    """,
                    (
                        item["tender_id"],
                        item.get("title", ""),
                        item.get("buyer_name", ""),
                        item.get("supplier_name", ""),
                        item.get("supplier_code"),
                        item.get("contract_value_eur"),
                        item.get("contract_date"),
                        item.get("mp_relation_note"),
                        item.get("linked_mp_id"),
                        item.get("source_url", f"{CVP_BASE_URL}/Notice/Details/{item['tender_id']}")
                    )
                )
                inserted += 1
        conn.commit()
        fetch["rows"] = inserted
    return inserted
