"""/api/government: offices of record, read from migration 050.

The route is a register, not a metric. These tests hold three things: an
absent table says so instead of serving an empty-looking cabinet; the seeded
register is the one the decrees name; and a Seimas-member link exists only
where the migration recorded an official source for it.
"""
import os
import re
from pathlib import Path
from unittest.mock import patch

import psycopg2
import pytest
from fastapi.testclient import TestClient

from tests.degraded import empty_db

os.environ["DB_DSN"] = os.getenv("DB_DSN", "postgresql:///transparency_db")
from backend.main import app

client = TestClient(app)
MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "050_offices_held.sql"


def test_absent_table_is_reported_not_rendered_as_an_empty_cabinet():
    with patch("backend.routes_public.get_db_conn", empty_db(tables_present=False)):
        body = client.get("/api/government").json()
    assert body == {"available": False, "president": None, "ministries": [], "governments": []}


def test_every_seeded_office_names_an_official_source():
    """Charter §1.9. A row without a decree or an official page is a claim."""
    sql = MIGRATION.read_text(encoding="utf-8")
    urls = re.findall(r"'(https?://[^']+)'", sql)
    assert urls
    hosts = {re.match(r"https?://([^/]+)/", u + "/").group(1) for u in urls}
    assert all(h == "kam.lt" or h == "www.urm.lt" or h.endswith("lrv.lt") or h == "www.lrp.lt" for h in hosts), hosts


def test_no_metric_shaped_columns_in_the_register():
    """Charter §1.3. The register holds who and under what decree, nothing countable."""
    sql = MIGRATION.read_text(encoding="utf-8").lower()
    ddl = "\n".join(re.findall(r"create table.*?\);", sql, flags=re.S))
    assert not re.search(r"score|rank|rating|grade|count|percent|index_value", ddl)


@pytest.fixture
def seeded():
    try:
        conn = psycopg2.connect(os.environ["DB_DSN"])
    except psycopg2.OperationalError:
        pytest.skip("no database")
    with conn, conn.cursor() as cur:
        cur.execute("SELECT to_regclass('public.offices_held') IS NOT NULL")
        if not cur.fetchone()[0]:
            pytest.skip("migration 050 not applied")
    conn.close()
    return client.get("/api/government").json()


def test_three_governments_fourteen_ministries_each(seeded):
    assert seeded["available"] is True
    assert seeded["president"]["name"] == "Gitanas Nausėda"
    assert len(seeded["ministries"]) == 14
    assert [g["numeral"] for g in seeded["governments"]] == ["XIX", "XX", "XXI"]
    for gov in seeded["governments"]:
        assert gov["prime_minister"]["name"]
        assert gov["composition_url"].startswith("https://www.lrp.lt/")
        first_holders = [p for p in gov["posts"] if p["seq"] == 1]
        assert {p["ministry_key"] for p in first_holders} == {m["key"] for m in seeded["ministries"]}
        assert len(first_holders) == 14


def test_current_cabinet_is_decree_1k_737(seeded):
    current = seeded["governments"][-1]
    assert current["prime_minister"]["name"] == "Mindaugas Sinkevičius"
    by_ministry = {p["ministry_key"]: p["name"] for p in current["posts"]}
    assert by_ministry["uzsienis"] == "Kęstutis Budrys"
    assert by_ministry["gynyba"] == "Robertas Kaunas"
    assert by_ministry["finansai"] == "Taurimas Valys"
    assert all(p["basis_url"].endswith("1k-737.pdf") for p in current["posts"])


def test_member_link_never_appears_without_its_source(seeded):
    for gov in seeded["governments"]:
        for holder in [gov["prime_minister"], *gov["posts"]]:
            assert (holder["mp_id"] is None) == (holder["mp_link_source_url"] is None)
