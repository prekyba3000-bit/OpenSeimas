"""Internal data-health endpoint.

Internal for now: the public /data-health page is Wave 4. This serves the
evidence that page will eventually render, so the numbers can be checked
before anybody designs a surface on top of them.

Every block reports `unknown` when its table is absent rather than an empty
result. The tables arrive with migration 027/028, and until they do, "we have
no check results" must not read as "no checks failed" — that is the same
failure the runner's own `unknown` status exists to prevent.
"""
from fastapi import APIRouter
from psycopg2.extras import RealDictCursor

from backend import core


def get_db_conn():
    return core.get_db_conn()


router = APIRouter()

FRESH_WINDOW_HOURS = 26
STALE_LIMIT_HOURS = 50


def _iso(value):
    return value.isoformat() if value is not None else None


def _exists(cur, name: str) -> bool:
    cur.execute("SELECT to_regclass(%s) AS t", (f"public.{name}",))
    return cur.fetchone()["t"] is not None


def _checks(cur):
    if not _exists(cur, "dq_checks") or not _exists(cur, "dq_check_runs"):
        return {"state": "unknown",
                "reason": "dq_checks/dq_check_runs not present in this database",
                "checks": []}
    cur.execute(
        """
        SELECT c.check_key, c.description_lt, c.severity, c.action,
               r.status, r.failing_row_count, r.run_at, r.error
        FROM dq_checks c
        LEFT JOIN LATERAL (
            SELECT status, failing_row_count, run_at, error
            FROM dq_check_runs WHERE check_key = c.check_key
            ORDER BY run_at DESC LIMIT 1
        ) r ON TRUE
        WHERE c.enabled
        ORDER BY c.check_key
        """
    )
    rows = cur.fetchall()
    checks = [{
        "check_key": r["check_key"],
        "description_lt": r["description_lt"],
        "severity": r["severity"],
        "action": r["action"],
        # A check that has never run is `unknown`, not `pass`.
        "status": r["status"] or "unknown",
        "failing_row_count": r["failing_row_count"],
        "last_run": _iso(r["run_at"]),
        "error": r["error"],
    } for r in rows]
    blocking = [c["check_key"] for c in checks
                if c["status"] in ("error", "unknown") and c["action"] == "block_publish"]
    return {"state": "ok", "checks": checks, "blocking": blocking,
            "publish_held": bool(blocking)}


def _sources(cur):
    if not _exists(cur, "source_fetches"):
        return {"state": "unknown", "sources": {}}
    cur.execute(
        """
        SELECT DISTINCT ON (source_name)
               source_name, status, finished_at, error,
               EXTRACT(EPOCH FROM (now() - finished_at)) / 3600.0 AS age_hours
        FROM source_fetches
        WHERE source_name NOT LIKE 'matview:%'
        ORDER BY source_name, finished_at DESC NULLS LAST
        """
    )
    out = {}
    for r in cur.fetchall():
        age = r["age_hours"]
        if r["status"] == "error":
            state = "broken"
        elif age is None:
            state = "unknown"
        elif age <= FRESH_WINDOW_HOURS:
            state = "fresh"
        else:
            state = "stale"
        out[r["source_name"]] = {
            "state": state, "last_success": _iso(r["finished_at"]),
            "age_hours": round(age, 1) if age is not None else None,
            "beyond_stale_limit": bool(age is not None and age > STALE_LIMIT_HOURS),
            "error": r["error"],
        }
    return {"state": "ok", "sources": out}


def _snapshots(cur):
    if not _exists(cur, "snapshot_manifest"):
        return {"state": "unknown", "sources": {}}
    cur.execute(
        """
        SELECT source, count(*) AS fetches, max(fetched_at) AS latest,
               count(*) FILTER (WHERE fetch_status = 'unchanged') AS unchanged,
               count(DISTINCT content_sha256) AS distinct_payloads
        FROM snapshot_manifest GROUP BY source ORDER BY source
        """
    )
    return {"state": "ok", "sources": {
        r["source"]: {
            "fetches": r["fetches"], "latest": _iso(r["latest"]),
            "unchanged_fetches": r["unchanged"],
            "distinct_payloads": r["distinct_payloads"],
        } for r in cur.fetchall()
    }}


def _quarantine(cur):
    if not _exists(cur, "quarantine_rows"):
        return {"state": "unknown", "by_source": {}}
    cur.execute(
        """SELECT source, count(*) AS rows, max(quarantined_at) AS latest
           FROM quarantine_rows GROUP BY source ORDER BY source"""
    )
    return {"state": "ok", "by_source": {
        r["source"]: {"rows": r["rows"], "latest": _iso(r["latest"])}
        for r in cur.fetchall()
    }}


def _cz3(cur):
    """CZ-3 liveness, as a dated data point rather than a derived metric.

    No activity metric may be built on these feeds until liveness holds, so
    this reports the observation and nothing computed from it.
    """
    if not _exists(cur, "snapshot_manifest"):
        return {"state": "unknown", "feeds": {}}
    cur.execute(
        """
        SELECT DISTINCT ON (source) source, fetched_at, byte_count, fetch_status, error
        FROM snapshot_manifest WHERE source LIKE 'cz3_probe_%'
        ORDER BY source, fetched_at DESC
        """
    )
    rows = cur.fetchall()
    if not rows:
        return {"state": "unknown", "reason": "never probed", "feeds": {}}
    feeds = {r["source"].replace("cz3_probe_", ""): {
        "liveness": "live" if r["fetch_status"] == "ok" else "not_live",
        "probed_at": _iso(r["fetched_at"]), "byte_count": r["byte_count"],
        "error": r["error"],
    } for r in rows}
    return {"state": "ok", "feeds": feeds,
            "activity_metrics_permitted": all(f["liveness"] == "live" for f in feeds.values())}


@router.get("/api/internal/data-health")
def data_health():
    with get_db_conn() as conn:
        if not conn:
            # Not a 500: "we cannot tell" is a real answer here, and the
            # caller must be able to distinguish it from "everything passes".
            return {"state": "unknown", "reason": "database unavailable"}
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            return {
                "state": "ok",
                "checks": _checks(cur),
                "sources": _sources(cur),
                "snapshots": _snapshots(cur),
                "quarantine": _quarantine(cur),
                "cz3": _cz3(cur),
            }
