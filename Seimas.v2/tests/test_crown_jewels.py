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


def test_get_mp_faction_friction():
    with patch("backend.routes_public.get_db_conn", empty_db(tables_present=True)):
        response = client.get(f"/api/mps/{DUMMY_MP_ID}/faction-friction")
        assert response.status_code == 200
        data = response.json()
        assert "total_votes" in data
        assert "friction_count" in data
        assert "friction_rate_pct" in data
        assert "notable_dissent_votes" in data
        assert isinstance(data["notable_dissent_votes"], list)
        if data["total_votes"] == 0:
            assert data["friction_rate_pct"] is None


