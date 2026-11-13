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
    assert body == {"available": False, "president": None, "ministries": [], "governments": [],
                    "presidential_acts": None, "cabinet_decrees_after_register": []}


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


class _Cur:
    """Answers _presidential_acts' four queries from canned rows."""

    def __init__(self, decrees, cited):
        self.decrees, self.cited, self._rows = decrees, cited, []

    def execute(self, sql, params=None):
        if "to_regclass" in sql or "information_schema" in sql:
            self._rows = [{"reg": "presidential_decrees", "exists": True, "table_name": "presidential_decrees"}]
        elif "MIN(listed_on)" in sql:
            days = [d["listed_on"] for d in self.decrees]
            self._rows = [{"since": min(days, default=None), "through": max(days, default=None), "n": len(days)}]
        elif "FROM presidential_decrees" in sql:
            self._rows = [d for d in self.decrees if d["kind"] != "other"]
        else:
            self._rows = [{"t": t} for t in self.cited]

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


def _decree(no, day, kind, title="DĖL X"):
    import datetime
    return {"decree_no": no, "listed_on": datetime.date.fromisoformat(day), "title_lt": title,
            "url": f"https://www.lrp.lt/{no}.pdf", "kind": kind}


def test_an_unread_register_is_not_an_empty_list_of_vetoes(monkeypatch):
    """§1.1/§1.2. "We have not read the register" must not render as "no vetoes"."""
    from backend import routes_public
    monkeypatch.setattr(routes_public, "_table_exists", lambda cur, t: True)
    assert routes_public._presidential_acts(_Cur([], ["Dekretas Nr. 1K-737"])) == (None, [])
    monkeypatch.setattr(routes_public, "_table_exists", lambda cur, t: False)
    assert routes_public._presidential_acts(_Cur([_decree("1K-1", "2026-01-01", "veto")], [])) == (None, [])


def test_acts_are_grouped_by_kind_and_other_kinds_stay_out(monkeypatch):
    from backend import routes_public
    monkeypatch.setattr(routes_public, "_table_exists", lambda cur, t: True)
    cur = _Cur([
        _decree("1K-455", "2025-10-03", "veto"),
        _decree("1K-460", "2025-10-17", "bill"),
        _decree("1K-470", "2025-10-19", "treaty"),
        _decree("1K-471", "2025-10-20", "nomination"),
        _decree("1K-472", "2025-10-21", "other"),
    ], ["Dekretas Nr. 1K-737"])
    acts, newer = routes_public._presidential_acts(cur)
    assert [len(acts[k]) for k in ("veto", "bill", "treaty", "nomination")] == [1, 1, 1, 1]
    assert acts["since"] == "2025-10-03" and acts["through"] == "2025-10-21"
    assert acts["veto"][0] == {"decree_no": "1K-455", "listed_on": "2025-10-03", "title": "DĖL X",
                               "url": "https://www.lrp.lt/1K-455.pdf"}
    assert newer == []


def test_a_cabinet_decree_newer_than_the_register_is_reported(monkeypatch):
    """The ministers are seeded by hand. When the President signs a cabinet
    decree the register does not cite, the page must be able to say it may be
    out of date, instead of showing yesterday's cabinet as today's."""
    from backend import routes_public
    monkeypatch.setattr(routes_public, "_table_exists", lambda cur, t: True)
    cur = _Cur([
        _decree("1K-737", "2026-07-07", "cabinet"),
        _decree("1K-900", "2026-12-01", "cabinet", "DĖL LIETUVOS RESPUBLIKOS FINANSŲ MINISTRO ATLEIDIMO"),
    ], ["Dekretas Nr. 1K-737", "Respublikos Prezidento dekretas Nr. 1K-728"])
    _, newer = routes_public._presidential_acts(cur)
    assert [d["decree_no"] for d in newer] == ["1K-900"]
