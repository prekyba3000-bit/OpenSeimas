"""Unit tests for ingest_seimas.py pure functions."""
import pytest
from datetime import date

# Import functions to test
import sys
sys.path.insert(0, '.')
from pipeline.ingest_seimas import normalize, parse_date


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


# --- faction resolution (migration 039) ---------------------------------
#
# `current_party` used to hold two different facts: the parliamentary faction
# when it could be resolved, and the nominating party when it could not. These
# pin the rule that separates them.

class _Pareigos:
    def __init__(self, pareigos=None, padalinio_pavadinimas=None,
                 padalinio_id=None, data_iki=None):
        self._a = {
            "pareigos": pareigos,
            "padalinio_pavadinimas": padalinio_pavadinimas,
            "padalinio_id": padalinio_id,
            "data_iki": data_iki,
        }

    def get(self, k):
        return self._a.get(k)


class _Narys:
    def __init__(self, *pareigos):
        self._p = list(pareigos)

    def findall(self, tag):
        assert tag == "Pareigos"
        return self._p


def test_faction_leader_is_not_dropped_to_the_nominating_party():
    """The original bug. Matching the role string "frakcijos nar" missed
    „Frakcijos seniūnas" and „Frakcijos seniūno pavaduotojas", so the 10 members
    most clearly identified with a faction were labelled with whoever put them
    on the ballot."""
    from pipeline.ingest_seimas import resolve_faction

    for role in ("Frakcijos seniūnė", "Frakcijos seniūno pavaduotojas", "Frakcijos narys"):
        node = _Narys(_Pareigos(role, "Liberalų sąjūdžio frakcija", "1", ""))
        assert resolve_faction(node, {}) == "Liberalų sąjūdžio frakcija", role


def test_ended_faction_role_is_ignored():
    """The Speaker steps out of their faction; the source dates the end. Without
    the data_iki check Olekas keeps the faction he left on 2025-09-10."""
    from pipeline.ingest_seimas import resolve_faction

    node = _Narys(
        _Pareigos("Seimo Pirmininkas", "Seimo valdyba", "9", ""),
        _Pareigos("Frakcijos narys", "Lietuvos socialdemokratų partijos frakcija", "1", "2025-09-10"),
    )
    assert resolve_faction(node, {}) is None


def test_no_faction_returns_none_rather_than_a_fallback():
    from pipeline.ingest_seimas import resolve_faction

    assert resolve_faction(_Narys(), {}) is None
    assert resolve_faction(_Narys(_Pareigos("Komiteto narys", "Audito komitetas", "5", "")), {}) is None


def test_the_umbrella_node_is_not_a_faction():
    """The factions feed exposes a container named „Seimo frakcijos" beside the
    real factions. Nobody belongs to it."""
    from pipeline.ingest_seimas import resolve_faction

    assert resolve_faction(_Narys(_Pareigos("Narys", "Seimo frakcijos", "0", "")), {}) is None


def test_mixed_group_counts_as_a_group():
    """„Mišri Seimo narių grupė" is a parliamentary group and does not carry the
    word frakcija."""
    from pipeline.ingest_seimas import resolve_faction

    node = _Narys(_Pareigos("Narys", "Mišri Seimo narių grupė", "7", ""))
    assert resolve_faction(node, {}) == "Mišri Seimo narių grupė"


def test_internal_whitespace_is_collapsed():
    """The factions feed spells one name with a double space. Two entries
    differing only by whitespace would render as two separate factions."""
    from pipeline.ingest_seimas import resolve_faction

    node = _Narys(_Pareigos("Frakcijos narys", "Liberalų  sąjūdžio frakcija", "1", ""))
    assert resolve_faction(node, {}) == "Liberalų sąjūdžio frakcija"


def test_canonical_name_from_the_factions_map_wins():
    from pipeline.ingest_seimas import resolve_faction

    node = _Narys(_Pareigos("Frakcijos narys", "kazkoks pavadinimas frakcija", "42", ""))
    assert resolve_faction(node, {"42": "„Nemuno aušros“ frakcija"}) == "„Nemuno aušros“ frakcija"
