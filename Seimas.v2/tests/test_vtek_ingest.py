"""Unit tests for VTEK Private Interests Declarations ingestion."""

import unittest
from unittest.mock import MagicMock, patch
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.ingest_vtek_declarations import fetch_vtek_declaration, VTEK_BASE_URL


class TestVtekIngest(unittest.TestCase):
    """Test VTEK fetch and anti-blocking stealth fallback handling."""

    @patch("pipeline.ingest_vtek_declarations.fetch_with_retry")
    def test_fetch_vtek_declaration_success(self, mock_fetch):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "<html><body>VTEK Deklaracija</body></html>"
        mock_fetch.return_value = mock_resp

        result = fetch_vtek_declaration(mp_id=100, declaration_id="DEC-2024-001")
        self.assertIsNotNone(result)
        self.assertEqual(result["declaration_id"], "DEC-2024-001")
        self.assertIn("VTEK Deklaracija", result["html"])

    @patch("pipeline.ingest_vtek_declarations.fetch_with_retry")
    @patch("pipeline.ingest_vtek_declarations.fetch_with_fortress")
    def test_fetch_vtek_declaration_fortress_fallback(self, mock_fortress, mock_fetch):
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.text = "<html><body>Just a moment... cf-browser-verification</body></html>"
        mock_fetch.return_value = mock_resp

        mock_fortress.return_value = "<html><body>Rendered via Fortress Stealth Chromium</body></html>"

        result = fetch_vtek_declaration(mp_id=100, declaration_id="DEC-2024-002")
        self.assertIsNotNone(result)
        self.assertEqual(result["declaration_id"], "DEC-2024-002")
        self.assertIn("Rendered via Fortress", result["html"])


if __name__ == "__main__":
    unittest.main()
