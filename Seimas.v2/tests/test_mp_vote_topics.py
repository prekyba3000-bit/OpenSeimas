"""Filtering a member's votes by subject, and the two numbers behind it.

The counts exist in a shape that is easy to get wrong. `mp_votes` carries a
row per member per vote whether or not the member took part — 408,827 of
744,495 rows have no recorded choice — so "votes on housing" is very nearly
the same number for every member and is not a fact about any of them. Only
the recorded-choice count is. Both travel together for that reason.
"""
from __future__ import annotations

from contextlib import contextmanager
from unittest import mock

import pytest
from fastapi import HTTPException

import backend.routes_public as rp
from tests.degraded import empty_cursor


@contextmanager
def _db(cur):
    conn = mock.MagicMock()
    conn.cursor.return_value = cur
    yield conn


def test_an_unknown_topic_is_rejected_rather_than_returning_nothing():
    """An empty list would read as "your member never voted on this" instead
    of "that is not one of the subjects"."""
    with mock.patch.object(rp, "get_db_conn", lambda: _db(empty_cursor())):
        with pytest.raises(HTTPException) as exc:
            rp.get_mp_votes("00000000-0000-0000-0000-000000000000", topic="nonsense")
    assert exc.value.status_code == 422
    assert "topic must be one of" in str(exc.value.detail)


@pytest.mark.parametrize("topic", rp.VOTE_TOPICS)
def test_every_declared_topic_is_accepted(topic):
    """The route's list and the tagger's dictionary must not drift apart."""
    with mock.patch.object(rp, "get_db_conn", lambda: _db(empty_cursor())):
        assert rp.get_mp_votes("00000000-0000-0000-0000-000000000000", topic=topic) == []


def test_the_route_topics_match_the_tagger_exactly():
    """If the tagger gains a subject and the route does not, that subject is
    silently unfilterable; if the route gains one the tagger never emits, it
    is offered and always empty."""
    from pipeline.tag_topics import TOPICS

    assert set(rp.VOTE_TOPICS) == set(TOPICS)


def test_no_topic_filter_is_the_default():
    with mock.patch.object(rp, "get_db_conn", lambda: _db(empty_cursor())):
        assert rp.get_mp_votes("00000000-0000-0000-0000-000000000000") == []


def test_an_absent_tag_table_says_we_cannot_tell():
    """`topics: null` is not the same as a member having no tagged votes, and
    the surface renders the two differently."""
    with mock.patch.object(rp, "get_db_conn", lambda: _db(empty_cursor(tables_present=False))):
        out = rp.get_mp_vote_topics("00000000-0000-0000-0000-000000000000")
    assert out == {"topics": None, "tagged": None, "total": None}


def test_a_member_with_no_votes_reports_zero_rather_than_nothing():
    """The table exists and the member simply has no rows — a different fact
    from the table being absent, and the payload must keep them apart."""
    with mock.patch.object(rp, "get_db_conn", lambda: _db(empty_cursor(tables_present=True))):
        out = rp.get_mp_vote_topics("00000000-0000-0000-0000-000000000000")
    assert out["topics"] == {}
    assert out["tagged"] == 0
    assert out["total"] == 0
