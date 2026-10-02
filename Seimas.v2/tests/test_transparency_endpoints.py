"""Unit tests for expanded transparency REST endpoints (migration 048)."""
import os
import pytest
from httpx import ASGITransport, AsyncClient
from backend.main import app

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")

TEST_MP_ID = 4821


@pytest.mark.asyncio
async def test_get_mp_declarations():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get(f"/api/mp/{TEST_MP_ID}/declarations")
        assert res.status_code == 200
        data = res.json()
        assert "seimas_mp_id" in data
        assert "declarations" in data


@pytest.mark.asyncio
async def test_get_mp_procurement():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get(f"/api/mp/{TEST_MP_ID}/procurement")
        assert res.status_code == 200
        data = res.json()
        assert "tenders" in data


@pytest.mark.asyncio
async def test_get_mp_lobbyist_meetings():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get(f"/api/mp/{TEST_MP_ID}/lobbyist-meetings")
        assert res.status_code == 200
        data = res.json()
        assert "meetings" in data


@pytest.mark.asyncio
async def test_get_mp_committee_speeches():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get(f"/api/mp/{TEST_MP_ID}/committee-speeches")
        assert res.status_code == 200
        data = res.json()
        assert "speeches" in data


@pytest.mark.asyncio
async def test_get_mp_campaign_donors():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        res = await client.get(f"/api/mp/{TEST_MP_ID}/campaign-donors")
        assert res.status_code == 200
        data = res.json()
        assert "donations" in data
