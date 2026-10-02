"""Ingestion module for VRK Campaign Finance & Donor Records."""

import logging
import os
import sys
from typing import Dict, Any, List, Optional
import psycopg2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry
from pipeline.common import record_fetch
from pipeline.fortress_client import is_cloudflare_or_js_challenge, fetch_with_fortress

logger = logging.getLogger("openseimas.pipeline.donors")

VRK_BASE_URL = "https://www.vrk.lt/politiniu-kampaniju-finansavimas"


def fetch_campaign_donors_page(campaign_id: str, page: int = 1) -> Optional[Dict[str, Any]]:
    """Fetch campaign donor table from VRK using 3-Tier Hybrid fetcher."""
    url = f"{VRK_BASE_URL}?kampanija={campaign_id}&p={page}"
    try:
        res = fetch_with_retry(url, timeout=30, allow_fortress_fallback=True)
        if is_cloudflare_or_js_challenge(res.text, res.status_code):
            logger.info("[VRK-DONORS] JS challenge detected for VRK campaign %s; rendering with Fortress", campaign_id)
            html = fetch_with_fortress(url)
            if not html:
                return None
            return {"campaign_id": campaign_id, "page": page, "html": html}
        return {"campaign_id": campaign_id, "page": page, "html": res.text}
    except Exception as exc:
        logger.error("[VRK-DONORS] Failed to fetch VRK donors page %d for campaign %s: %s", page, campaign_id, exc)
        return None


def run_donors_ingest(conn, donors: List[Dict[str, Any]]) -> int:
    """Ingest campaign donors into database."""
    inserted = 0
    with record_fetch(conn, "campaign_donors", VRK_BASE_URL) as fetch:
        with conn.cursor() as cur:
            for item in donors:
                cur.execute(
                    """
                    INSERT INTO campaign_donors (
                        donation_id, recipient_mp_id, recipient_party_name,
                        donor_name, donor_type, amount_eur, donation_date,
                        campaign_name, source_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (donation_id) DO UPDATE SET
                        amount_eur = EXCLUDED.amount_eur
                    """,
                    (
                        item["donation_id"],
                        item.get("recipient_mp_id"),
                        item.get("recipient_party_name", ""),
                        item["donor_name"],
                        item.get("donor_type", "individual"),
                        item["amount_eur"],
                        item["donation_date"],
                        item.get("campaign_name", ""),
                        item.get("source_url", VRK_BASE_URL)
                    )
                )
                inserted += 1
        conn.commit()
        fetch["rows"] = inserted
    return inserted
