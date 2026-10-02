"""Fortress Stealth Chromium CDP Client Integration for OpenSeimas.

Provides browser-level stealth fallback for JS-rendered government pages,
Cloudflare Turnstile, and anti-bot protected endpoints.
"""

import logging
import os
import urllib.parse
import urllib.request
import json
from typing import Optional, Dict, Any

logger = logging.getLogger("openseimas.fortress")

# Default Fortress / Stealth CDP endpoint URL
DEFAULT_CDP_URL = os.getenv("FORTRESS_CDP_URL", "http://localhost:9222")


def get_cdp_endpoint() -> str:
    """Return configured Fortress CDP endpoint URL."""
    return os.getenv("FORTRESS_CDP_URL", DEFAULT_CDP_URL)


def is_fortress_available(cdp_url: Optional[str] = None) -> bool:
    """Check if the Fortress CDP engine endpoint is reachable."""
    endpoint = cdp_url or get_cdp_endpoint()
    version_url = urllib.parse.urljoin(endpoint, "/json/version")
    try:
        req = urllib.request.Request(version_url, headers={"User-Agent": "OpenSeimas-HealthCheck"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                logger.info("[FORTRESS] Stealth Chromium engine active: %s", data.get("Browser", "Chromium"))
                return True
    except Exception as exc:
        logger.debug("[FORTRESS] CDP endpoint not reachable at %s: %s", endpoint, exc)
    return False


def is_cloudflare_or_js_challenge(content: str, status_code: Optional[int] = None) -> bool:
    """Detect if raw HTTP response body contains a Cloudflare or JS challenge screen."""
    if status_code in (403, 503):
        indicators = [
            "just a moment...",
            "cloudflare",
            "turnstile",
            "cf-browser-verification",
            "enable javascript",
            "checking your browser",
        ]
        content_lower = content.lower()
        return any(ind in content_lower for ind in indicators)
    return False


def fetch_with_fortress(url: str, timeout: int = 30) -> Optional[str]:
    """
    Fetch a page rendered through Fortress stealth Chromium via CDP / Playwright.

    Args:
        url: The target page URL to fetch.
        timeout: Maximum page render timeout in seconds.

    Returns:
        Rendered HTML content as string, or None if Fortress is unavailable.
    """
    cdp_url = get_cdp_endpoint()
    if not is_fortress_available(cdp_url):
        logger.warning("[FORTRESS] Cannot fetch %s: Fortress CDP server not running at %s", url, cdp_url)
        return None

    try:
        from playwright.sync_api import sync_playwright
        logger.info("[FORTRESS] Navigating via Stealth Chromium CDP to %s", url)
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(cdp_url)
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=timeout * 1000)
            content = page.content()
            page.close()
            return content
    except ImportError:
        logger.warning("[FORTRESS] 'playwright' package not installed. Install with: pip install playwright")
    except Exception as exc:
        logger.error("[FORTRESS] Failed to fetch %s via Fortress CDP: %s", url, exc)

    return None
