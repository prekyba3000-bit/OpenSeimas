"""Unit tests for pipeline/tag_topics.py (V.4 'Tau' topic tagging)."""
from unittest.mock import MagicMock, patch

import pytest

from pipeline.tag_topics import (
    TOPICS,
    apply_tags,
    match_topics,
    normalize_title,
    plan_tagging,
    title_hash,
)


class TestNormalizeTitle:
    def test_lowercases_and_collapses_whitespace(self):
        assert normalize_title("  Dėl   Mokesčių \n Pakeitimo ") == "dėl mokesčių pakeitimo"

    def test_handles_none_and_empty(self):
        assert normalize_title(None) == ""
        assert normalize_title("") == ""


class TestMatchTopics:
    def test_genitive_and_dative_inflections_match_stems(self):
        # mokesčio (gen.) / mokesčiams (dat.) both contain stem "mokesč"
        hits = match_topics("Gyventojų pajamų mokesčio įstatymo pakeitimas")
        assert "mokesč" in hits["pajamos"]
        hits = match_topics("Dėl naujų mokesčiams taikomų lengvatų")
        assert "pajamos" in hits

    def test_nominative_law_name_matches(self):
        hits = match_topics("Aplinkos apsaugos įstatymo Nr. I-2223 6 straipsnio pakeitimas")
        assert "aplink" in hits["aplinka"]

    def test_non_matching_title_gets_no_tags(self):
        assert match_topics("Posėdžio darbotvarkės tvirtinimas") == {}
        assert match_topics("") == {}
        assert match_topics(None) == {}

    def test_multi_topic_title(self):
        hits = match_topics(
            "Sveikatos draudimo ir valstybinio socialinio draudimo įstatymų pakeitimas"
        )
        assert "sveikata" in hits
        assert "pajamos" in hits

    def test_real_title_samples(self):
        # Titles observed in the production votes table.
        assert "transportas" in match_topics(
            "Saugaus eismo automobilių keliais įstatymo Nr. VIII-2043 11 straipsnio pakeitimas"
        )
        assert "aplinka" in match_topics("Miškų įstatymo Nr. I-671 4 straipsnio pakeitimas")
        assert "saugumas" in match_topics("Žvalgybos įstatymo Nr. VIII-1861 pakeitimas")
        assert "svietimas" in match_topics(
            "Švietimo įstatymo Nr. I-1489 29 straipsnio pakeitimas"
        )
        assert "bustas" in match_topics(
            "Su nekilnojamuoju turtu susijusio kredito įstatymo pakeitimas"
        )
        assert "valdymas" in match_topics(
            "Fiskalinės sutarties įgyvendinimo konstitucinio įstatymo pakeitimas"
        )

    def test_stem_does_not_overmatch(self):
        # "saugumo" must not tag traffic-safety ("saugaus eismo") as defense.
        hits = match_topics("Saugaus eismo automobilių keliais įstatymo pakeitimas")
        assert "saugumas" not in hits

    def test_all_terms_are_lowercase_and_valid_slugs(self):
        assert len(TOPICS) == 8
        for slug, cfg in TOPICS.items():
            assert cfg["label_lt"]
            assert 10 <= len(cfg["terms"]) <= 30
            for term in cfg["terms"]:
                assert term == term.lower()


class TestPlanTagging:
    RECORDS = [
        (1, "Gyventojų pajamų mokesčio įstatymo pakeitimas"),
        (2, "Miškų įstatymo pakeitimas"),
        (3, "Posėdžio darbotvarkės tvirtinimas"),
    ]

    def test_new_votes_get_tagged(self):
        to_delete, to_insert = plan_tagging(self.RECORDS, {})
        assert to_delete == []
        topics_by_vote = {}
        for vote_id, topic, terms, h in to_insert:
            topics_by_vote.setdefault(vote_id, set()).add(topic)
        assert topics_by_vote[1] == {"pajamos"}
        assert topics_by_vote[2] == {"aplinka"}
        assert 3 not in topics_by_vote  # untaggable title inserts nothing

    def test_idempotent_when_hashes_match(self):
        _, to_insert = plan_tagging(self.RECORDS, {})
        existing = {rid: h for rid, _, _, h in to_insert}
        to_delete, to_insert2 = plan_tagging(self.RECORDS, existing)
        assert to_delete == []
        assert to_insert2 == []

    def test_title_change_triggers_delete_and_reinsert(self):
        _, to_insert = plan_tagging(self.RECORDS, {})
        existing = {rid: h for rid, _, _, h in to_insert}
        changed = [(1, "Miškų įstatymo pakeitimas")]  # was pajamos, now aplinka
        to_delete, to_insert2 = plan_tagging(changed, existing)
        assert to_delete == [1]
        assert [(r[0], r[1]) for r in to_insert2] == [(1, "aplinka")]

    def test_title_change_to_untaggable_only_deletes(self):
        _, to_insert = plan_tagging(self.RECORDS, {})
        existing = {rid: h for rid, _, _, h in to_insert}
        to_delete, to_insert2 = plan_tagging(
            [(1, "Posėdžio darbotvarkės tvirtinimas")], existing
        )
        assert to_delete == [1]
        assert to_insert2 == []

    def test_title_hash_is_normalization_insensitive(self):
        assert title_hash("Dėl  Mokesčių") == title_hash("dėl mokesčių")
        assert title_hash("a") != title_hash("b")


class TestApplyTags:
    def test_delete_then_batch_insert(self):
        cur = MagicMock()
        with patch("pipeline.tag_topics.execute_values") as mock_ev:
            apply_tags(
                cur,
                "vote_topics",
                "vote_id",
                [7],
                [(7, "aplinka", ["mišk"], "abc123")],
            )
        delete_sql, delete_params = cur.execute.call_args[0]
        assert "DELETE FROM vote_topics" in delete_sql
        assert delete_params == ([7],)
        insert_sql, rows = mock_ev.call_args[0][1], mock_ev.call_args[0][2]
        assert "INSERT INTO vote_topics" in insert_sql
        assert "ON CONFLICT DO NOTHING" in insert_sql
        assert rows == [(7, "aplinka", ["mišk"], "abc123")]

    def test_no_changes_means_no_queries(self):
        cur = MagicMock()
        with patch("pipeline.tag_topics.execute_values") as mock_ev:
            apply_tags(cur, "vote_topics", "vote_id", [], [])
        cur.execute.assert_not_called()
        mock_ev.assert_not_called()

    def test_second_run_over_same_plan_is_empty(self):
        """Simulates idempotency: plan -> apply -> plan again yields nothing."""
        records = [(1, "Aplinkos apsaugos įstatymo pakeitimas")]
        to_delete, to_insert = plan_tagging(records, {})
        cur = MagicMock()
        with patch("pipeline.tag_topics.execute_values"):
            apply_tags(cur, "vote_topics", "vote_id", to_delete, to_insert)
        existing = {rid: h for rid, _, _, h in to_insert}
        assert plan_tagging(records, existing) == ([], [])
