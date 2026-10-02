"""Shared utilities for data ingestion scripts with anti-blocking proxy and Fortress stealth browser support."""

import os
import time
import logging
from functools import wraps
from typing import Callable, Optional, Tuple, Any
import requests

logger = logging.getLogger("openseimas.utils")

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36 (OpenSeimas Data Scraper)"
)


def get_scraper_proxies() -> Optional[dict]:
    """Retrieve proxy dictionary from environment variables if set."""
    proxy_url = os.getenv("SCRAPING_PROXY_URL") or os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")
    if proxy_url:
        return {"http": proxy_url, "https": proxy_url}
    return None


def format_scraper_api_url(target_url: str) -> Optional[str]:
    """Format request URL for ScraperAPI or similar proxy service if API key is present."""
    api_key = os.getenv("SCRAPER_API_KEY")
    if api_key:
        import urllib.parse
        encoded_url = urllib.parse.quote(target_url)
        return f"http://api.scraperapi.com?api_key={api_key}&url={encoded_url}"
    return None


def retry_request(
    max_retries: int = 3,
    backoff_factor: float = 1.5,
    retry_on: Tuple[Any, ...] = (requests.exceptions.RequestException,)
) -> Callable:
    """Decorator for retrying HTTP requests with exponential backoff."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except retry_on as e:
                    last_exception = e
                    wait_time = backoff_factor ** attempt
                    logger.warning("[RETRY] Attempt %d/%d failed: %s", attempt + 1, max_retries, e)
                    logger.warning("[RETRY] Waiting %.1fs before next attempt...", wait_time)
                    time.sleep(wait_time)
            if last_exception:
                raise last_exception
        return wrapper
    return decorator


def fetch_with_retry(
    url: str,
    timeout: int = 30,
    max_retries: int = 3,
    use_proxy: bool = False,
    allow_fortress_fallback: bool = True,
    **kwargs: Any
) -> requests.Response:
    """
    Intelligent 3-Tier Fetcher:
      Tier 1: Direct HTTP GET with realistic Chrome headers (fastest, lowest resource usage).
      Tier 2: Anti-blocking proxy / IP rotation failover (on HTTP 429/403/503 or retry).
      Tier 3: Fortress Stealth Chromium browser rendering (on Cloudflare / Turnstile challenges).

    Args:
        url: The URL to fetch.
        timeout: Request timeout in seconds.
        max_retries: Maximum number of retry attempts.
        use_proxy: If True, forces routing via configured anti-blocking proxy.
        allow_fortress_fallback: If True, enables Fortress stealth Chromium fallback on Cloudflare screens.
        **kwargs: Additional arguments passed to requests.get().

    Returns:
        requests.Response object (or synthetic Response object if rendered via Fortress).

    Raises:
        requests.RequestException: If all fetch tiers fail.
    """
    last_exception: Optional[Exception] = None
    backoff = 1.5

    # Set default anti-blocking headers if none provided
    headers = kwargs.pop("headers", {})
    if "User-Agent" not in headers:
        headers["User-Agent"] = os.getenv("SCRAPER_USER_AGENT", DEFAULT_USER_AGENT)
    if "Accept" not in headers:
        headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    if "Accept-Language" not in headers:
        headers["Accept-Language"] = "lt,en-US;q=0.9,en;q=0.8"

    proxies = get_scraper_proxies()
    scraper_api_url = format_scraper_api_url(url)

    for attempt in range(max_retries):
        target_url = url
        req_proxies = proxies
        req_headers = dict(headers)

        # Failover to proxy on later attempts or if explicitly requested
        if (use_proxy or attempt > 0) and scraper_api_url:
            target_url = scraper_api_url
            req_proxies = None
            logger.info("[SCRAPER-PROXY] Routing request for %s via ScraperAPI (attempt %d)", url, attempt + 1)
        elif (use_proxy or attempt > 0) and proxies:
            logger.info("[SCRAPER-PROXY] Routing request for %s via proxy (attempt %d)", url, attempt + 1)

        try:
            response = requests.get(
                target_url,
                timeout=timeout,
                headers=req_headers,
                proxies=req_proxies,
                **kwargs
            )

            # Check if response body is a Cloudflare / JS challenge screen
            if allow_fortress_fallback:
                try:
                    from pipeline.fortress_client import is_cloudflare_or_js_challenge, fetch_with_fortress
                    if is_cloudflare_or_js_challenge(response.text, response.status_code):
                        logger.warning("[FORTRESS-FALLBACK] Cloudflare/JS challenge detected for %s. Attempting Fortress Stealth Chromium rendering...", url)
                        rendered_html = fetch_with_fortress(url, timeout=timeout)
                        if rendered_html:
                            synth_resp = requests.Response()
                            synth_resp.status_code = 200
                            synth_resp._content = rendered_html.encode("utf-8")
                            synth_resp.url = url
                            return synth_resp
                except Exception as cf_exc:
                    logger.debug("Fortress challenge check error: %s", cf_exc)

            response.raise_for_status()
            return response

        except requests.exceptions.RequestException as e:
            last_exception = e
            status_code = getattr(getattr(e, "response", None), "status_code", None)

            if status_code in (403, 429, 503):
                logger.warning(
                    "[ANTI-BLOCKING] Got HTTP %s for %s on attempt %d/%d (scraping block or rate limit)",
                    status_code, url, attempt + 1, max_retries
                )
                # Attempt Fortress fallback on HTTP 403 / 503 blocks if enabled
                if allow_fortress_fallback:
                    try:
                        from pipeline.fortress_client import fetch_with_fortress
                        logger.info("[FORTRESS-FALLBACK] Attempting Fortress Stealth Chromium for blocked URL: %s", url)
                        rendered_html = fetch_with_fortress(url, timeout=timeout)
                        if rendered_html:
                            synth_resp = requests.Response()
                            synth_resp.status_code = 200
                            synth_resp._content = rendered_html.encode("utf-8")
                            synth_resp.url = url
                            return synth_resp
                    except Exception as cf_exc:
                        logger.debug("Fortress fallback error on exception: %s", cf_exc)
            else:
                logger.warning("[RETRY] Request failed (%s) on attempt %d/%d", e, attempt + 1, max_retries)

            if attempt < max_retries - 1:
                wait_time = backoff ** attempt
                time.sleep(wait_time)

    if last_exception:
        raise last_exception
    raise requests.exceptions.RequestException(f"Failed to fetch {url} after {max_retries} attempts")
