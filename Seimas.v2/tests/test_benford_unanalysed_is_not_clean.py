"""Charter §1.1/§1.2: a check that never ran has not cleared anyone."""
from backend import hero_engine


class _Cursor:
    def execute(self, *a, **k):
        pass

    def fetchone(self):
        return None

    def fetchall(self):
        return []


def test_member_without_a_benford_row_is_unavailable_not_clean(monkeypatch):
    monkeypatch.setattr(hero_engine, "_table_exists", lambda cur, t: t == "benford_analyses")
    monkeypatch.setattr(
        hero_engine, "_fetch_table_columns", lambda cur, t: {"politician_id", "p_value", "created_at"}
    )
    out = hero_engine._build_forensic_breakdown(
        "00000000-0000-0000-0000-000000000000", _Cursor(), 0.0, None
    )
    assert out["benford"]["status"] == "unavailable"
    assert out["benford"]["p_value"] is None
