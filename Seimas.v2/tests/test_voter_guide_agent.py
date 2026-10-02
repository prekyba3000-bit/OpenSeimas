"""Unit & contract tests for VoterGuideAgent & POST /api/voter-guide/evaluate endpoint."""
import os
import json
import pytest
from httpx import ASGITransport, AsyncClient
from backend.main import app
from pipeline.voter_guide_agent import VoterGuideAgent

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")

TEST_MP_ID = 79145  # Saulius Skvernelis

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "voter_guide_cases.json")


def test_voter_guide_agent_unit_evaluation():
    agent = VoterGuideAgent()
    res = agent.evaluate_mp_alignment(
        mp_id=TEST_MP_ID,
        priority_topics=["pajamos", "valdymas", "saugumas"],
        preferred_stances={"pajamos": "for", "valdymas": "for"},
    )
    assert res["mp_id"] == TEST_MP_ID
    assert res["category"] in ("more_aligned", "mixed_record", "insufficient_data")
    assert "headline_lt" in res
    assert "explanation_lt" in res
    assert "vote_breakdown" in res
    assert "evidence_coverage" in res
    assert "disclaimer_lt" in res
    assert "methodology_note_lt" in res
    assert isinstance(res["bullet_reasons"], list)
    assert "suggested_next_step" in res


def test_voter_guide_agent_missing_mp():
    agent = VoterGuideAgent()
    res = agent.evaluate_mp_alignment(
        mp_id=-99999,
        priority_topics=["pajamos"],
    )
    assert res["category"] == "insufficient_data"
    assert res["evidence_coverage"]["eligible_votes"] == 0
    assert "Duomenų nerasta" in res["headline_lt"]


def test_shared_fixture_parity():
    """Validate fixture structural integrity — category values and vote math consistency."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    valid_categories = {"insufficient_data", "more_aligned", "mixed_record"}

    for case in cases:
        case_id = case["id"]
        expected = case["expected"]
        category = expected["category"]
        bd = expected["vote_breakdown"]
        ec = expected["evidence_coverage"]

        # Category membership
        assert category in valid_categories, f"[{case_id}] invalid category: {category}"

        # Vote breakdown arithmetic
        total = bd["aligned"] + bd["opposed"] + bd["abstained"] + bd["absent"] + bd["unverified"]
        assert total == bd["total_eligible"], (
            f"[{case_id}] breakdown sum {total} != total_eligible {bd['total_eligible']}"
        )

        # Directional classifiable = aligned + opposed
        assert ec["directional_classifiable_votes"] == bd["aligned"] + bd["opposed"], (
            f"[{case_id}] directional_classifiable mismatch"
        )

        # Recorded status = aligned + opposed + abstained
        assert ec["recorded_status_votes"] == bd["aligned"] + bd["opposed"] + bd["abstained"], (
            f"[{case_id}] recorded_status mismatch"
        )

        # Eligible votes = total_eligible
        assert ec["eligible_votes"] == bd["total_eligible"], (
            f"[{case_id}] eligible_votes != total_eligible"
        )

        # Coverage percentage sanity
        if bd["total_eligible"] > 0:
            expected_dir_pct = round(ec["directional_classifiable_votes"] / ec["eligible_votes"] * 100.0, 1)
            assert ec["directional_coverage_pct"] == expected_dir_pct, (
                f"[{case_id}] directional_coverage_pct: {ec['directional_coverage_pct']} != {expected_dir_pct}"
            )
            expected_rec_pct = round(ec["recorded_status_votes"] / ec["eligible_votes"] * 100.0, 1)
            assert ec["recorded_status_coverage_pct"] == expected_rec_pct, (
                f"[{case_id}] recorded_status_coverage_pct: {ec['recorded_status_coverage_pct']} != {expected_rec_pct}"
            )

        # Alignment percentage check
        dir_count = ec["directional_classifiable_votes"]
        if dir_count > 0:
            expected_align = round(bd["aligned"] / dir_count * 100.0, 1)
            assert expected["alignment_pct"] == expected_align, (
                f"[{case_id}] alignment_pct: {expected['alignment_pct']} != {expected_align}"
            )

        # Category threshold enforcement
        if dir_count < 3:
            assert category == "insufficient_data", (
                f"[{case_id}] directional < 3 but category = {category}"
            )
        elif bd["aligned"] > bd["opposed"]:
            assert category == "more_aligned", (
                f"[{case_id}] aligned > opposed but category = {category}"
            )
        else:
            assert category == "mixed_record", (
                f"[{case_id}] aligned <= opposed but category = {category}"
            )

        # Unverified must never leak into absent
        if bd["unverified"] > 0:
            # Verify unverified count matches actual UNKNOWN entries in votes
            unknown_votes = [v for v in case["votes"] if v.get("vote_choice") not in ("Už", "Prieš", "Susilaikė", None, "", "Nedalyvavo")]
            # Mandate filtering may reduce the count
            mandate_start = case.get("mandate_start")
            if mandate_start:
                unknown_votes = [v for v in unknown_votes if v.get("sitting_date") and v["sitting_date"] >= mandate_start]
            assert bd["unverified"] == len(unknown_votes), (
                f"[{case_id}] unverified count {bd['unverified']} != actual unknown votes {len(unknown_votes)}"
            )


def test_mandate_start_fixture_vote_filtering():
    """Verify the mandate_transition_boundary fixture correctly excludes pre-mandate votes."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    mandate_case = next(c for c in cases if c["id"] == "mandate_transition_boundary")
    mandate_start = mandate_case["mandate_start"]
    all_votes = mandate_case["votes"]
    expected_bd = mandate_case["expected"]["vote_breakdown"]

    # Count votes on or after mandate_start
    eligible_votes = [v for v in all_votes if v["sitting_date"] >= mandate_start]
    pre_mandate_votes = [v for v in all_votes if v["sitting_date"] < mandate_start]

    assert len(eligible_votes) == expected_bd["total_eligible"], (
        f"Expected {expected_bd['total_eligible']} eligible, got {len(eligible_votes)}"
    )
    assert len(pre_mandate_votes) == 2, "Expected 2 pre-mandate votes to be excluded"
    assert expected_bd["absent"] == 0, "Pre-mandate votes must not be classified as absent"


