#!/usr/bin/env python3
"""Run the dq_checks suite. A check is SQL that returns violating rows.

Zero rows is a pass. There is no expected-value constant to drift out of date,
which is the whole point of the dbt-test shape.

Four outcomes, not three. `unknown` means the check could not execute — bad SQL,
a missing table, a timeout. A check that did not run did not pass, and
collapsing those is how a broken monitor reads as health.

Exit codes:
    0  no blocking failure — publish may proceed
    1  at least one block_publish check failed — hold the publish
    2  the runner itself could not run (no DSN, no dq_checks table)

Read-only against the data it inspects: the session is read-only for the check
SQL, and the only writes are the append-only dq_check_runs rows.
"""
import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List

import psycopg2
import psycopg2.extras

SAMPLE_CAP = 5
STATEMENT_TIMEOUT_MS = 30_000
SEVERITY_RANK = {"pass": 0, "warn": 1, "error": 2, "unknown": 3}


def _worst(a: str, b: str) -> str:
    return a if SEVERITY_RANK[a] >= SEVERITY_RANK[b] else b


def _jsonable(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def run_check(conn, check: Dict[str, Any]) -> Dict[str, Any]:
    """Execute one check. Never raises: a failure to run is an outcome."""
    started = time.monotonic()
    result = {
        "check_key": check["check_key"],
        "status": "unknown",
        "failing_row_count": None,
        "sample_rows": None,
        "error": None,
    }
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(f"SET LOCAL statement_timeout = {STATEMENT_TIMEOUT_MS}")
            cur.execute(check["sql"])
            rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001 — recorded as unknown, then reported
        conn.rollback()
        result["error"] = f"{type(exc).__name__}: {exc}"[:2000]
        result["duration_ms"] = int((time.monotonic() - started) * 1000)
        return result

    result["failing_row_count"] = len(rows)
    if not rows:
        result["status"] = "pass"
    else:
        # A per-row `severity` column wins, so one stale source can be a warn
        # while another is an error inside the same check.
        status = check["severity"]
        if "severity" in rows[0]:
            status = "pass"
            for row in rows:
                status = _worst(status, str(row["severity"]))
        result["status"] = status
        result["sample_rows"] = [
            {k: _jsonable(v) for k, v in row.items()} for row in rows[:SAMPLE_CAP]
        ]
    result["duration_ms"] = int((time.monotonic() - started) * 1000)
    return result


def record(conn, result: Dict[str, Any]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO dq_check_runs
                (check_key, status, failing_row_count, sample_rows, duration_ms, error)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                result["check_key"], result["status"], result["failing_row_count"],
                json.dumps(result["sample_rows"], ensure_ascii=False)
                if result["sample_rows"] else None,
                result.get("duration_ms"), result["error"],
            ),
        )
    conn.commit()


def ping_healthcheck(ok: bool) -> str:
    """Dead-man's switch. No account is created here: the URL comes from the
    environment and the ping is skipped when it is absent, so the pipeline
    never depends on a hosted service being configured."""
    url = os.environ.get("HEALTHCHECK_DQ_URL")
    if not url:
        return "skipped (HEALTHCHECK_DQ_URL not set)"
    try:
        import urllib.request
        # A failing run pings /fail, so a red suite is distinguishable from a
        # runner that never started. Both must be distinguishable from green.
        target = url if ok else url.rstrip("/") + "/fail"
        urllib.request.urlopen(target, timeout=10).read()
        return f"pinged {'ok' if ok else 'fail'}"
    except Exception as exc:  # noqa: BLE001
        return f"ping failed: {type(exc).__name__}"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="run the checks, print results, record nothing")
    parser.add_argument("--gate", action="store_true",
                        help="exit 1 if any block_publish check failed; print nothing else")
    args = parser.parse_args(argv)

    dsn = os.environ.get("DB_DSN")
    if not dsn:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT to_regclass('public.dq_checks') AS t")
            if cur.fetchone()["t"] is None:
                print("ERROR: dq_checks table missing — run migrations first", file=sys.stderr)
                return 2
            cur.execute(
                "SELECT check_key, description_lt, sql, severity, action "
                "FROM dq_checks WHERE enabled ORDER BY check_key"
            )
            checks: List[Dict[str, Any]] = cur.fetchall()

        blocking: List[str] = []
        unknown: List[str] = []
        for check in checks:
            result = run_check(conn, check)
            if not args.dry_run:
                record(conn, result)
            if result["status"] in ("error", "unknown") and check["action"] == "block_publish":
                blocking.append(check["check_key"])
            if result["status"] == "unknown":
                unknown.append(check["check_key"])
            if not args.gate:
                count = result["failing_row_count"]
                shown = "unknown" if count is None else count
                print(f"  [{result['status']:7}] {check['check_key']:42} "
                      f"rows={shown} {result['error'] or ''}".rstrip())

        ok = not blocking
        if not args.gate:
            print(f"\n{len(checks)} checks · {len(blocking)} blocking · {len(unknown)} unknown")
            print(f"healthcheck: {ping_healthcheck(ok)}")
            if blocking:
                print("PUBLISH HELD — last-good data stays served:", ", ".join(blocking))
        return 0 if ok else 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
