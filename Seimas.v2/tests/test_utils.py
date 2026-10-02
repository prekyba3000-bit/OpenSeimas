"""Tests for utils.py anti-blocking proxy and fetch helpers."""

import unittest
from unittest.mock import MagicMock, patch
import requests

from utils import fetch_with_retry, format_scraper_api_url, get_scraper_proxies, retry_request


class TestUtils(unittest.TestCase):
    """Test fetch_with_retry and anti-blocking proxy integration."""

    @patch.dict("os.environ", {"SCRAPING_PROXY_URL": "http://proxy.example.com:8080"})
    def test_get_scraper_proxies(self):
        proxies = get_scraper_proxies()
        self.assertIsNotNone(proxies)
        self.assertEqual(proxies["http"], "http://proxy.example.com:8080")
        self.assertEqual(proxies["https"], "http://proxy.example.com:8080")

    @patch.dict("os.environ", {"SCRAPER_API_KEY": "test-key-123"})
    def test_format_scraper_api_url(self):
        target = "https://apps.lrs.lt/sip/p2b.ad_seimo_sesijos"
        url = format_scraper_api_url(target)
        self.assertIsNotNone(url)
        self.assertIn("api_key=test-key-123", url)
        self.assertIn("http://api.scraperapi.com", url)

    @patch("utils.requests.get")
    def test_fetch_with_retry_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.status_code = 200
        mock_get.return_value = mock_resp

        res = fetch_with_retry("https://apps.lrs.lt/sip/p2b.ad_seimo_sesijos")
        self.assertEqual(res, mock_resp)
        mock_get.assert_called_once()
        # Verify default anti-blocking User-Agent header is set
        _, kwargs = mock_get.call_args
        self.assertIn("User-Agent", kwargs["headers"])
        self.assertIn("OpenSeimas", kwargs["headers"]["User-Agent"])

    @patch("utils.requests.get")
    def test_fetch_with_retry_failover(self, mock_get):
        mock_resp_fail = MagicMock()
        mock_resp_fail.raise_for_status.side_effect = requests.exceptions.HTTPError("429 Too Many Requests")
        mock_resp_fail.status_code = 429

        mock_resp_ok = MagicMock()
        mock_resp_ok.raise_for_status.return_value = None
        mock_resp_ok.status_code = 200

        mock_get.side_effect = [requests.exceptions.RequestException("Rate limited"), mock_resp_ok]

        res = fetch_with_retry("https://apps.lrs.lt/sip/p2b.ad_seimo_sesijos", max_retries=2)
        self.assertEqual(res, mock_resp_ok)
        self.assertEqual(mock_get.call_count, 2)


if __name__ == "__main__":
    unittest.main()
