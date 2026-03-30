"""Unit tests for link_vrk.py pure functions."""
import pytest
import re

# Import functions to test
import sys
sys.path.insert(0, '.')
from link_vrk import normalize


class TestNormalizeLinkVrk:
    """Tests for the normalize() function in link_vrk.py."""
    
    def test_normalize_basic_name(self):
        assert normalize("Jonas Jonaitis") == "jonas jonaitis"
    
    def test_normalize_lithuanian_chars(self):
        """Handles Lithuanian diacritics properly."""
        assert normalize("Žygimantas Šulčius") == "zygimantas sulcius"
    
    def test_normalize_multiple_spaces(self):
        """Collapses multiple spaces to single space."""
        assert normalize("Jonas    Jonaitis") == "jonas jonaitis"
    
    def test_normalize_leading_trailing_whitespace(self):
        assert normalize("  Jonas Jonaitis  ") == "jonas jonaitis"
    
    def test_normalize_none(self):
        assert normalize(None) == ""
    
    def test_normalize_empty_string(self):
        assert normalize("") == ""
    
    def test_normalize_tabs_newlines(self):
        """Handles tabs and newlines as whitespace."""
        assert normalize("Jonas\tJonaitis\n") == "jonas jonaitis"


class TestVrkIdExtraction:
    """Tests for VRK ID extraction pattern used in fetch_vrk_candidates."""
    
    VRK_ID_PATTERN = re.compile(r'rkndId-(\d+)')
    
    def test_extract_id_from_href(self):
        href = "kandidatai/rkndId-2422200"
        match = self.VRK_ID_PATTERN.search(href)
        assert match is not None
        assert match.group(1) == "2422200"
    
    def test_no_match_on_invalid_href(self):
        href = "kandidatai/other-link"
        match = self.VRK_ID_PATTERN.search(href)
        assert match is None


class TestNameCleaning:
    """Tests for name cleaning pattern used in fetch_vrk_candidates."""
    
    CLEAN_NAME_PATTERN = re.compile(r'\s*\(.*?\)')
    
    def test_remove_party_suffix(self):
        """Removes (D) or (S) party indicators."""
        raw = "Virgilijus ALEKNA (D)"
        clean = self.CLEAN_NAME_PATTERN.sub('', raw)
        assert clean == "Virgilijus ALEKNA"
    
    def test_remove_multiple_parentheses(self):
        raw = "Name (A) (B)"
        clean = self.CLEAN_NAME_PATTERN.sub('', raw)
        assert clean == "Name"
    
    def test_no_parentheses(self):
        raw = "Jonas Jonaitis"
        clean = self.CLEAN_NAME_PATTERN.sub('', raw)
        assert clean == "Jonas Jonaitis"
