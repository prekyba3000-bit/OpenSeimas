"""Public meta endpoints: data freshness per domain."""
from fastapi import APIRouter, HTTPException
import datetime

from backend import core


# Call-time proxies — keep bare names in route bodies patchable via backend.core.
def get_db_conn():
    return core.get_db_conn()


def check_rate_limit(ip):
    return core.check_rate_limit(ip)


router = APIRouter()

# (table, timestamp column) — columns verified against schema.sql and migrations
# (003 politicians.last_synced_at; 008 speeches.speech_date). mp_votes has no
# timestamp column at all, so only a row count is reported for it.
_FRESHNESS_SOURCES = {
    "politicians": ("politicians", "last_synced_at"),
    "votes": ("votes", "sitting_date"),
    "mp_votes": ("mp_votes", None),
    "assets": ("assets", "created_at"),
    "interests": ("interests", "created_at"),
    "speeches": ("speeches", "created_at"),
}


def _iso(value):
    return value.isoformat() if value is not None else None


@router.get("/api/meta/freshness")
def get_freshness():
    """Per-domain data freshness: row counts and latest available timestamps."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            domains = {}
            for name, (table, ts_col) in _FRESHNESS_SOURCES.items():
                ts_expr = f"MAX({ts_col})" if ts_col else "NULL"
                cur.execute(
                    f"SELECT COUNT(*) AS row_count, {ts_expr} AS latest FROM {table}"
                )
                row = cur.fetchone()
                domains[name] = {
                    "row_count": row["row_count"],
                    "latest": _iso(row["latest"]),
                    "source_field": ts_col,
                }

    return {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        **domains,
        "materialized_views": {
            "last_refresh": core._refresh_state["last_refresh"],
            "last_error": core._refresh_state["last_error"],
            "refresh_count": core._refresh_state["refresh_count"],
        },
    }
