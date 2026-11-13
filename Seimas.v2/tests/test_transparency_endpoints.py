"""Charter §1.2: a source we never ingested is not a source that recorded nothing.

Seven public routes answered for data nobody had loaded. Five read the
migration-048 tables, whose ingesters parse nothing, and returned
`{"count": 0, ...}` for any integer, including ids that are not members.
One returned 500 for every member, one served an empty z-score list. No
client called any of them. They come back with a real ingester, or not at all.
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)
UUID = "00000000-0000-0000-0000-000000000000"

REMOVED = [
    "/api/mp/4821/declarations",
    "/api/mp/4821/procurement",
    "/api/mp/4821/lobbyist-meetings",
    "/api/mp/4821/committee-speeches",
    "/api/mp/4821/campaign-donors",
    f"/api/mps/{UUID}/procurement",
    f"/api/mps/{UUID}/amendment-speed",
]


@pytest.mark.parametrize("path", REMOVED)
def test_route_over_a_never_ingested_source_is_gone(path):
    assert client.get(path).status_code == 404


def test_no_public_route_lives_under_the_integer_id_prefix():
    assert [r.path for r in app.routes if r.path.startswith("/api/mp/")] == []
