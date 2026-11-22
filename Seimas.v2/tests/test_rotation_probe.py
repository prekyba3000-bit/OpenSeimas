"""The contract scripts/local-ops/rotate_check.sh relies on.

After a credential rotation the script proves Render holds the new admin token
by POSTing a deliberately invalid status to the correction-status route. That
is only safe while two things stay true: the token is checked before anything
else, and an unknown status is refused before the database is touched. If
either changes, the probe would start writing to production, so both are
pinned here — with exact status codes, not a set (evaluation TST-08).
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend import core
from backend.main import app

client = TestClient(app)
PROBE = "/api/admin/corrections/00000000-0000-0000-0000-000000000000/status"
BODY = {"status": "__rotation_probe__"}


@pytest.fixture
def db(monkeypatch):
    spy = MagicMock(side_effect=AssertionError("the probe must not reach the database"))
    monkeypatch.setattr(core, "get_db_conn", spy)
    monkeypatch.setattr(core, "SYNC_SECRET", "s3cret-for-test")
    return spy


def test_no_token_is_refused_with_401(db):
    assert client.post(PROBE, json=BODY).status_code == 401
    db.assert_not_called()


def test_wrong_token_is_refused_with_401(db):
    r = client.post(PROBE, json=BODY, headers={"Authorization": "Bearer not-it"})
    assert r.status_code == 401
    db.assert_not_called()


def test_right_token_with_unknown_status_is_422_and_writes_nothing(db):
    r = client.post(PROBE, json=BODY, headers={"Authorization": "Bearer s3cret-for-test"})
    assert r.status_code == 422
    db.assert_not_called()


def test_unset_secret_disables_admin_with_503(monkeypatch, db):
    monkeypatch.setattr(core, "SYNC_SECRET", None)
    r = client.post(PROBE, json=BODY, headers={"Authorization": "Bearer anything"})
    assert r.status_code == 503
    db.assert_not_called()
