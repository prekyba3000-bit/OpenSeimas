"""Unit test for VoterGuideAgent ingestion health audit script."""

import os
import pytest
from pipeline.audit_voter_guide_ingestion import run_ingestion_audit

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")


def test_run_ingestion_audit_structure():
    report = run_ingestion_audit(dsn=DSN)
    assert "status" in report
    assert report["status"] in ("PASS", "WARN", "FAIL")
    assert "checks" in report
    assert isinstance(report["checks"], list)
    assert len(report["checks"]) == 3

    check_names = {chk["name"] for chk in report["checks"]}
    assert "orphan_vote_topics" in check_names
    assert "unverified_vote_ratio" in check_names
    assert "politician_mandate_dates" in check_names
