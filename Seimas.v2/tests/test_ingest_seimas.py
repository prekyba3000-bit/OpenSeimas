"""Unit tests for ingest_seimas.py pure functions."""
import pytest
from datetime import date

# Import functions to test
import sys
sys.path.insert(0, '.')
from ingest_seimas import normalize, parse_date


class TestNormalize:
    """Tests for the normalize() function."""
    
    def test_normalize_basic_name(self):
        assert normalize("Jonas Jonaitis") == "jonas jonaitis"
    
    def test_normalize_lithuanian_chars(self):
        """Handles Lithuanian diacritics (ą, č, ę, ė, į, š, ų, ū, ž)."""
        assert normalize("Česlovas Škėma") == "ceslovas skema"
    
    def test_normalize_with_whitespace(self):
        assert normalize("  Jonas   Jonaitis  ") == "jonas jonaitis"
    
    def test_normalize_none(self):
        assert normalize(None) == ""
    
    def test_normalize_empty_string(self):
        assert normalize("") == ""


class TestParseDate:
    """Tests for the parse_date() function."""
    
    def test_parse_valid_date(self):
        result = parse_date("2024-11-14")
        assert result == date(2024, 11, 14)
    
    def test_parse_none(self):
        assert parse_date(None) is None
    
    def test_parse_empty_string(self):
        assert parse_date("") is None
    
    def test_parse_invalid_format(self):
        """Returns None for non-ISO format."""
        assert parse_date("14/11/2024") is None
        assert parse_date("November 14, 2024") is None
    
    def test_parse_invalid_date(self):
        """Returns None for impossible dates."""
        assert parse_date("2024-02-30") is None
