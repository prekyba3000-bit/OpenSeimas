"""Unit tests for link_vrk.py's pure functions.

The previous version of this file tested only string-cleaning helpers from a
script that had never been run — none of them touched the actual safety
question. Rewritten 2026-09-06 after running the real script against the live
2024 candidate list found 5 pairs of distinct people sharing a normalized
name (e.g. two different "Rasa Tamošiūnienė" candidates); these tests cover
the name+party matching that exists because of that finding.
"""
import re

from pipeline.link_vrk import build_index, normalize_name, normalize_party


class TestNormalizeName:
    def test_basic(self):
        assert normalize_name("Jonas Jonaitis") == "jonas jonaitis"

    def test_lithuanian_diacritics_are_stripped(self):
        assert normalize_name("Žygimantas Šulčius") == "zygimantas sulcius"

    def test_collapses_whitespace(self):
        assert normalize_name("Jonas    Jonaitis") == "jonas jonaitis"
        assert normalize_name("  Jonas Jonaitis  ") == "jonas jonaitis"
        assert normalize_name("Jonas\tJonaitis\n") == "jonas jonaitis"

    def test_empty_input(self):
        assert normalize_name(None) == ""
        assert normalize_name("") == ""


class TestNormalizeParty:
    def test_basic(self):
        assert normalize_party("Liberalų sąjūdis") == "liberalų sąjūdis"

    def test_keeps_diacritics_unlike_normalize_name(self):
        # Collapsing diacritics here would reintroduce the collision risk
        # this module exists to remove: two differently-spelled parties
        # could compare equal.
        assert "ą" in normalize_party("Liberalų sąjūdis")

    def test_unifies_dash_variants(self):
        # politicians.nominating_party carries both spellings for the same
        # party (migration 039's own data), en-dash-spaced and hyphenated.
        a = normalize_party("Tėvynės sąjunga – Lietuvos krikščionys demokratai")
        b = normalize_party("Tėvynės sąjunga-Lietuvos krikščionys demokratai")
        assert a == b

    def test_self_nominated_maps_to_empty_on_both_sides(self):
        # Our own column says "Išsikėlė pats"; VRK's row says the same phrase
        # verbatim in the district-nomination field. Both must normalize to
        # the same value for an independent candidate to be linkable at all.
        assert normalize_party("Išsikėlė pats") == ""
        assert normalize_party("") == ""

    def test_blank_and_self_nominated_are_indistinguishable_by_design(self):
        # A party field VRK left blank (candidate didn't run in that mode)
        # and an explicit independent declaration compare equal. That is a
        # real loss of information, accepted because our own query side only
        # ever produces "" for the two actually-independent members.
        assert normalize_party(None) == normalize_party("Išsikėlė pats")


class TestBuildIndex:
    def _cand(self, rid, name, list_party="", district_party=""):
        return {
            "rink_kand_id": rid,
            "name": name,
            "list_party": list_party,
            "district_party": district_party,
        }

    def test_indexes_both_party_fields(self):
        by_key, _ = build_index(
            [self._cand("1", "Jonas Jonaitis", list_party="Liberalų sąjūdis")]
        )
        assert by_key[("jonas jonaitis", "liberalų sąjūdis")] == {"1"}

    def test_a_candidate_with_only_a_district_party_is_still_indexed(self):
        # The bug this test pins: an early version only indexed a party_key
        # when truthy, which silently dropped every independent candidate
        # (normalize_party("Išsikėlė pats") == "") from the index entirely.
        by_key, _ = build_index(
            [self._cand("1", "Viktoras Fiodorovas", district_party="Išsikėlė pats")]
        )
        assert by_key[("viktoras fiodorovas", "")] == {"1"}

    def test_name_only_collision_is_reported(self):
        # The real, measured case: two distinct people, same normalized name.
        candidates = [
            self._cand("2436204", "Rasa Tamošiūnienė", list_party="Nacionalinis susivienijimas"),
            self._cand("2436410", "Rasa Tamošiūnienė", list_party="Liberalų sąjūdis"),
        ]
        _, collisions = build_index(candidates)
        assert collisions == {"rasa tamosiuniene": {"2436204", "2436410"}}

    def test_name_plus_party_resolves_the_collision(self):
        candidates = [
            self._cand("2436204", "Rasa Tamošiūnienė", list_party="Nacionalinis susivienijimas"),
            self._cand("2436410", "Rasa Tamošiūnienė", list_party="Liberalų sąjūdis"),
        ]
        by_key, _ = build_index(candidates)
        assert by_key[("rasa tamosiuniene", "liberalų sąjūdis")] == {"2436410"}
        assert by_key[("rasa tamosiuniene", "nacionalinis susivienijimas")] == {"2436204"}

    def test_distinct_people_who_also_share_a_party_remain_ambiguous(self):
        # If two same-named candidates ran for the SAME party, name+party
        # cannot disambiguate them either — the index must say so rather than
        # silently keep only one id, so the caller can refuse instead of
        # guessing.
        candidates = [
            self._cand("1", "Jonas Jonaitis", list_party="Liberalų sąjūdis"),
            self._cand("2", "Jonas Jonaitis", list_party="Liberalų sąjūdis"),
        ]
        by_key, _ = build_index(candidates)
        assert by_key[("jonas jonaitis", "liberalų sąjūdis")] == {"1", "2"}


class TestVrkIdExtraction:
    """The href pattern fetch_vrk_candidates() matches candidate ids with."""

    VRK_ID_PATTERN = re.compile(r"rkndId-(\d+)")

    def test_extract_id_from_href(self):
        match = self.VRK_ID_PATTERN.search("kandidatai/rkndId-2422200")
        assert match and match.group(1) == "2422200"

    def test_no_match_on_invalid_href(self):
        assert self.VRK_ID_PATTERN.search("kandidatai/other-link") is None


class TestNameCleaning:
    """The parenthetical-suffix pattern fetch_vrk_candidates() strips."""

    CLEAN_NAME_PATTERN = re.compile(r"\s*\(.*?\)")

    def test_remove_party_suffix(self):
        assert self.CLEAN_NAME_PATTERN.sub("", "Virgilijus ALEKNA (D)") == "Virgilijus ALEKNA"

    def test_remove_multiple_parentheses(self):
        assert self.CLEAN_NAME_PATTERN.sub("", "Name (A) (B)") == "Name"

    def test_no_parentheses(self):
        assert self.CLEAN_NAME_PATTERN.sub("", "Jonas Jonaitis") == "Jonas Jonaitis"
