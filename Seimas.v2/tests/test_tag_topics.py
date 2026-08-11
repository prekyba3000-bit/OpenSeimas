"""Regression test for pipeline/tag_topics.py column mapping.

votes.id ↔ vote_topics.vote_id differ; a single shared id column crashed the
first production run with UndefinedColumn (SELECT vote_id FROM votes).
"""
from unittest.mock import MagicMock

from pipeline.tag_topics import tag_table


def _cursor_with_empty_results():
    cur = MagicMock()
    cur.fetchall.return_value = []
    return cur


def test_votes_mapping_selects_entity_and_junction_columns_separately():
    # vote_topics.vote_id REFERENCES votes(seimas_vote_id) — migration 016.
    cur = _cursor_with_empty_results()
    tag_table(cur, "votes", "vote_topics", "seimas_vote_id", "vote_id")

    executed = [call.args[0] for call in cur.execute.call_args_list]
    assert executed[0] == "SELECT seimas_vote_id, title FROM votes WHERE title IS NOT NULL"
    assert executed[1] == "SELECT vote_id, title_hash FROM vote_topics"


def test_legislation_mapping_uses_project_id_for_both():
    cur = _cursor_with_empty_results()
    tag_table(cur, "legislation", "legislation_topics", "project_id", "project_id")

    executed = [call.args[0] for call in cur.execute.call_args_list]
    assert executed[0] == "SELECT project_id, title FROM legislation WHERE title IS NOT NULL"
    assert executed[1] == "SELECT project_id, title_hash FROM legislation_topics"
