"""Unit tests for fortress_client.py."""

import unittest
from unittest.mock import MagicMock, patch
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.fortress_client import (
    is_fortress_available,
    is_cloudflare_or_js_challenge,
    get_cdp_endpoint,
    fetch_with_fortress
)


class TestFortressClient(unittest.TestCase):
    """Test Fortress CDP client availability and Cloudflare challenge detection."""

    def test_get_cdp_endpoint_default(self):
        endpoint = get_cdp_endpoint()
        self.assertTrue(endpoint.startswith("http"))

    def test_is_cloudflare_or_js_challenge_detection(self):
        cf_html = "<html><body><h1>Just a moment...</h1><div id='cf-browser-verification'></div></body></html>"
        self.assertTrue(is_cloudflare_or_js_challenge(cf_html, status_code=403))
        self.assertTrue(is_cloudflare_or_js_challenge(cf_html, status_code=503))
        self.assertFalse(is_cloudflare_or_js_challenge(cf_html, status_code=200))
        self.assertFalse(is_cloudflare_or_js_challenge("<html><body>Normal Page</body></html>", status_code=403))

    @patch("urllib.request.urlopen")
    def test_is_fortress_available_true(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = b'{"Browser": "Chrome/124.0.0.0 (Fortress Stealth)"}'
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        self.assertTrue(is_fortress_available("http://localhost:9222"))

    @patch("urllib.request.urlopen")
    def test_is_fortress_available_false(self, mock_urlopen):
        mock_urlopen.side_effect = Exception("Connection refused")
        self.assertFalse(is_fortress_available("http://localhost:9222"))


if __name__ == "__main__":
    unittest.main()
