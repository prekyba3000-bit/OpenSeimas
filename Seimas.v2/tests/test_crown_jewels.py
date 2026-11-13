import os
from unittest.mock import patch
from fastapi.testclient import TestClient

from tests.degraded import empty_db

os.environ["DB_DSN"] = os.getenv("DB_DSN", "postgresql:///transparency_db")
from backend.main import app

client = TestClient(app)
DUMMY_MP_ID = "00000000-0000-0000-0000-000000000000"


def test_get_mp_supplier_links():
    with patch("backend.routes_public.get_db_conn", empty_db(tables_present=True)):
        response = client.get(f"/api/mps/{DUMMY_MP_ID}/supplier-links")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)


def test_faction_agreement_has_one_definition():
    """Charter §1.4. /faction-friction recomputed agreement with the faction
    from today's faction, with no ten-voter floor and an arbitrary tie-break,
    and published a figure that contradicted /faction-alignment on the same
    profile (6.4% of 3,358 beside the view's figure over its own denominator).
    The faction_alignment view is the one definition."""
    response = client.get(f"/api/mps/{DUMMY_MP_ID}/faction-friction")
    assert response.status_code == 404
    paths = [r.path for r in app.routes]
    assert [p for p in paths if "faction-" in p] == ["/api/mps/{mp_id}/faction-alignment"]
