"""Tests for the ingest paths that have actually broken.

The existing pipeline tests cover pure helpers (normalize_name, parse_date).
Every real data incident in this project came from somewhere else: a fetch that
failed and was skipped in silence, a column mapped to the wrong table, a metric
computed twice in two code paths that drifted. These pin that behaviour.
"""
from unittest.mock import MagicMock, patch

import pytest


# ─── fetch: retries, and gaps that get recorded rather than swallowed ────────


def test_fetch_xml_uses_retries_not_a_single_attempt():
    """A single timeout silently dropped two votes from production on 2026-08-10."""
    from pipeline import ingest_votes_v2

    response = MagicMock(status_code=200, content=b"<root/>")
    with patch.object(ingest_votes_v2, "fetch_with_retry", return_value=response) as fetch:
        result = ingest_votes_v2.fetch_xml("https://example.invalid/x")

    assert result is not None
    assert fetch.call_count == 1  # the helper itself owns the retry loop
    assert fetch.call_args.kwargs.get("timeout") == 30


def test_fetch_xml_returns_none_when_retries_are_exhausted():
    from pipeline import ingest_votes_v2

    with patch.object(ingest_votes_v2, "fetch_with_retry", side_effect=Exception("timed out")):
        assert ingest_votes_v2.fetch_xml("https://example.invalid/x") is None


def test_failed_vote_results_are_recorded_by_id():
    """A missing vote must be nameable afterwards, not merely absent."""
    from pipeline import ingest_votes_v2

    ingest_votes_v2._FAILED_VOTE_IDS.clear()
    ingest_votes_v2._FAILED_VOTE_IDS.append("-54709")
    assert "-54709" in ingest_votes_v2._FAILED_VOTE_IDS
    ingest_votes_v2._FAILED_VOTE_IDS.clear()


# ─── provenance: every run leaves a record, success or failure ───────────────


def _conn_with_table(exists=True):
    cur = MagicMock()
    cur.fetchone.side_effect = [("public.source_fetches",) if exists else (None,), (42,)]
    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


def test_record_fetch_writes_ok_row_with_row_count():
    from pipeline.common import record_fetch

    conn, cur = _conn_with_table()
    with record_fetch(conn, "seimas_registrations", "https://example.invalid") as fetch:
        fetch["rows"] = 40419

    statements = " ".join(str(c[0][0]) for c in cur.execute.call_args_list)
    assert "INSERT INTO source_fetches" in statements
    assert "status='ok'" in statements
    assert any(40419 in tuple(c[0][1]) for c in cur.execute.call_args_list if len(c[0]) > 1)


def test_record_fetch_records_failure_and_reraises():
    """A half-failed run must not be indistinguishable from a clean one."""
    from pipeline.common import record_fetch

    conn, cur = _conn_with_table()
    with pytest.raises(RuntimeError):
        with record_fetch(conn, "seimas_votes"):
            raise RuntimeError("source unreachable")

    statements = " ".join(str(c[0][0]) for c in cur.execute.call_args_list)
    assert "status='error'" in statements


def test_record_fetch_is_a_noop_without_the_table():
    """Provenance must never be the reason an ingest cannot run."""
    from pipeline.common import record_fetch

    conn, _ = _conn_with_table(exists=False)
    with record_fetch(conn, "seimas_votes") as fetch:
        fetch["rows"] = 1  # no exception


# ─── topic tagging: entity key vs junction key ──────────────────────────────


def test_vote_topics_uses_the_key_its_foreign_key_points_at():
    """votes.id vs votes.seimas_vote_id crashed the first production run twice."""
    from pipeline.tag_topics import tag_table

    cur = MagicMock()
    cur.fetchall.return_value = []
    tag_table(cur, "votes", "vote_topics", "seimas_vote_id", "vote_id")

    executed = [c[0][0] for c in cur.execute.call_args_list]
    assert executed[0] == "SELECT seimas_vote_id, title FROM votes WHERE title IS NOT NULL"
    assert executed[1] == "SELECT vote_id, title_hash FROM vote_topics"


# ─── hero_engine: the two scoring paths must not drift ──────────────────────


def test_both_scoring_paths_call_the_same_formula_helpers():
    """The single-profile and bulk paths must not each carry their own copy.

    Before 2026-08-12 the STR/WIS/CHA/STA arithmetic was written out twice with
    nothing pinning the copies equal — the shape that makes a profile and a
    leaderboard disagree about the same member. Each formula now has one
    definition; this fails if a literal reappears at a call site.
    """
    import inspect

    from backend import hero_engine

    source = inspect.getsource(hero_engine)
    for helper in ("score_legislative", "score_experience", "score_visibility", "score_consistency"):
        assert source.count(f"def {helper}(") == 1, f"{helper} defined more than once"
        # one definition + at least the two call sites
        assert source.count(helper) >= 3, f"{helper} is not used by both paths"

    # The raw arithmetic must live only inside those definitions.
    assert source.count("0.6 * _normalize") == 1
    assert source.count("0.8 * _clamp") == 1


def test_score_helpers_are_pure_functions_of_their_inputs():
    from backend import hero_engine

    # _normalize returns a 0-100 scale, so a member at the maximum scores 100.
    assert hero_engine.score_legislative(0, 0, 0, 0) == 0
    assert hero_engine.score_legislative(10, 10, 10, 10) == pytest.approx(100.0)
    # 60/40 split between authored bills and committee leadership
    assert hero_engine.score_legislative(10, 10, 0, 10) == pytest.approx(60.0)
    # attendance dominates consistency; amendments are the minor term
    assert hero_engine.score_consistency(100, 0, 0) == pytest.approx(80.0)
    assert hero_engine.score_consistency(0, 5, 5) == pytest.approx(20.0)


# ─── authored bills: the term parameter, and the feed's self-check ───────────


def _bills_xml(total, individually, rows):
    projects = "".join(
        f'<SeimoNarioPateiktasTeisėsAktoProjektas eil_nr="{i}" požymis="Grupėje"/>'
        for i in range(1, rows + 1)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?><SeimoInformacija>'
        f'<SeimoKadencija kadencijos_id="10">'
        f'<SeimoNarys asmens_id="79162" kiekis_viso="{total}" kiekis_individualiai="{individually}">'
        f"{projects}</SeimoNarys></SeimoKadencija></SeimoInformacija>"
    ).encode()


def test_authored_bills_request_includes_the_term_parameter():
    """Without kadencijos_id the endpoint answers 200 with an empty envelope.

    That is why bills_authored_count was 0 for all 148 members and the
    legislative-activity metric stayed hidden.
    """
    from pipeline import ingest_authored_bills

    response = MagicMock(content=_bills_xml(20, 0, 20))
    with patch.object(ingest_authored_bills, "fetch_with_retry", return_value=response) as fetch:
        ingest_authored_bills.fetch_member_initiatives(79162)

    url = fetch.call_args[0][0]
    assert "kadencijos_id=" in url
    assert "asmens_id=79162" in url


def test_authored_bills_keeps_group_and_individual_counts_apart():
    """"Authored 20 bills" and "co-signed 20 bills" are different claims."""
    from pipeline import ingest_authored_bills

    response = MagicMock(content=_bills_xml(20, 0, 20))
    with patch.object(ingest_authored_bills, "fetch_with_retry", return_value=response):
        total, individually, rows, anomaly = ingest_authored_bills.fetch_member_initiatives(79162)

    assert (total, individually, rows) == (20, 0, 20)
    assert anomaly is None


def test_authored_bills_flags_a_feed_that_disagrees_with_itself():
    """The header total and the returned rows are reconciled, not averaged."""
    from pipeline import ingest_authored_bills

    response = MagicMock(content=_bills_xml(20, 0, 17))
    with patch.object(ingest_authored_bills, "fetch_with_retry", return_value=response):
        total, _individually, rows, anomaly = ingest_authored_bills.fetch_member_initiatives(79162)

    assert (total, rows) == (20, 17)
    assert anomaly and "20" in anomaly and "17" in anomaly


def test_authored_bills_absent_member_is_a_real_zero():
    from pipeline import ingest_authored_bills

    empty = MagicMock(content=b'<?xml version="1.0"?><SeimoInformacija></SeimoInformacija>')
    with patch.object(ingest_authored_bills, "fetch_with_retry", return_value=empty):
        total, individually, rows, anomaly = ingest_authored_bills.fetch_member_initiatives(1)

    assert (total, individually, rows, anomaly) == (0, 0, 0, None)
