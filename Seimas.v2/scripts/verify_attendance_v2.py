#!/usr/bin/env python3
"""Verify the attendance v1 → v2 methodology switch. Read-only.

The switch is automatic: `effective_attendance_version()` reads
`methodology_versions` and v2 starts applying the moment its announced
`effective_from` passes (2026-08-26 09:00 UTC). Nothing is deployed on the
day, which is the good design and also the reason it needs checking — a
silent switch that goes wrong goes wrong silently.

    cd Seimas.v2
    set -a; . ~/.config/openseimas/prod.env; set +a
    .venv/bin/python scripts/verify_attendance_v2.py

Exits non-zero if any check fails. Every database statement runs inside a
`READ ONLY` transaction, so the script cannot modify production even if
someone edits a query into it later.

DO NOT RUN BEFORE 2026-08-26 — checks 1 and 3 are expected to fail while the
old methodology is still in force, and a red run before the switch teaches
people to ignore it.
"""
from __future__ import annotations

import datetime
import json
import os
import random
import sys
import urllib.request
from decimal import Decimal

import psycopg2
import psycopg2.extras

API = os.environ.get("OPENSEIMAS_API", "https://seimas-api.onrender.com")

# The advance-notice promise (V4 plan §7): a methodology change is announced at
# least this long before it takes effect.
REQUIRED_NOTICE_DAYS = 14

# Fewer eligible sitting days than this and no percentage is publishable —
# a member who took a seat and gave it up the same day would read as 0%,
# which states something false rather than merely computing it differently.
MIN_ELIGIBLE_SITTING_DAYS = 3

# Hand-computed before the switch, from 67 present days out of 93 eligible.
# Supplied as the expected value; the point of the check is that the machine
# agrees with an arithmetic nobody had to trust it for.
EXPECTED = {"name": "Agnė Bilotaitė", "attendance": 72.04, "tolerance": 0.01}

RANDOM_SAMPLE = 10

_results: list[tuple[bool, str]] = []


def check(ok: bool, line: str) -> bool:
    _results.append((ok, line))
    print(f"{'PASS' if ok else 'FAIL'}  {line}")
    return ok


def fetch(path: str):
    with urllib.request.urlopen(f"{API}{path}", timeout=60) as r:
        return json.loads(r.read())


def as_float(v):
    return float(v) if isinstance(v, (int, float, Decimal)) else None


# ── 1. The published methodology is in force, and was announced in time ──────
def check_methodology(cur) -> None:
    cur.execute(
        """
        SELECT version, announced_at, effective_from
        FROM methodology_versions
        WHERE metric_key = 'attendance'
        ORDER BY version DESC
        """
    )
    rows = cur.fetchall()
    v2 = next((r for r in rows if r["version"] == 2), None)
    if not check(v2 is not None, "methodology_versions has an attendance v2 row"):
        return

    now = datetime.datetime.now(datetime.timezone.utc)
    check(
        v2["effective_from"] <= now,
        f"attendance v2 is in force (effective_from {v2['effective_from']:%Y-%m-%d %H:%M} UTC)",
    )

    announced, effective = v2["announced_at"], v2["effective_from"]
    if announced is None:
        check(False, "attendance v2 carries an announced_at (advance notice is unrecorded)")
        return
    notice = (effective - announced).days
    check(
        notice >= REQUIRED_NOTICE_DAYS,
        f"advance notice honoured: announced {notice} days before effect "
        f"(promise is {REQUIRED_NOTICE_DAYS})",
    )

    # The version actually applied by the API, not merely the row that exists.
    cur.execute(
        """
        SELECT COALESCE(MAX(version), 1) AS v FROM methodology_versions
        WHERE metric_key = 'attendance' AND effective_from <= NOW()
        """
    )
    check(cur.fetchone()["v"] >= 2, "effective_attendance_version() resolves to v2")


# ── 2. Nobody is scored on days outside their own mandate ────────────────────
def check_mandate_windows(cur) -> None:
    """The eligible-days denominator must count only sitting days the member
    actually held a seat for. A member sworn in halfway through the term who is
    measured against the whole term reads as chronically absent."""
    cur.execute(
        """
        WITH sitting_days AS (
            SELECT sitting_date FROM sitting_registrations WHERE sitting_date IS NOT NULL
            UNION
            SELECT sitting_date FROM votes WHERE sitting_date IS NOT NULL
        ),
        recomputed AS (
            SELECT p.id AS mp_id,
                   count(*) FILTER (
                       WHERE (p.mandate_start_date IS NULL OR d.sitting_date >= p.mandate_start_date)
                         AND (p.mandate_end_date IS NULL OR d.sitting_date <= p.mandate_end_date)
                   ) AS eligible_in_window
            FROM politicians p CROSS JOIN sitting_days d
            GROUP BY p.id
        )
        SELECT count(*) AS mismatched
        FROM mp_attendance_v2 a
        JOIN recomputed r ON r.mp_id = a.mp_id
        WHERE a.eligible_days <> r.eligible_in_window
        """
    )
    check(
        cur.fetchone()["mismatched"] == 0,
        "every member's eligible_days equals the sitting days inside their mandate window",
    )

    # The other direction: a day counted as present must also be eligible.
    cur.execute(
        """
        SELECT count(*) AS bad FROM (
            SELECT mv.politician_id AS mp_id, v.sitting_date
            FROM mp_votes mv
            JOIN votes v ON v.seimas_vote_id = mv.vote_id
            WHERE mv.vote_choice IS NOT NULL AND v.sitting_date IS NOT NULL
        ) present
        JOIN politicians p ON p.id = present.mp_id
        WHERE (p.mandate_start_date IS NOT NULL AND present.sitting_date < p.mandate_start_date)
           OR (p.mandate_end_date IS NOT NULL AND present.sitting_date > p.mandate_end_date)
        """
    )
    bad = cur.fetchone()["bad"]
    check(bad == 0, f"no member is recorded present on a day outside their mandate ({bad} found)")


# ── 3. The hand-computed value ───────────────────────────────────────────────
def check_expected_value(cur) -> None:
    cur.execute(
        """
        SELECT p.id, a.eligible_days, a.days_present, a.attendance_percentage
        FROM mp_attendance_v2 a JOIN politicians p ON p.id = a.mp_id
        WHERE p.display_name = %s
        """,
        (EXPECTED["name"],),
    )
    row = cur.fetchone()
    if not check(row is not None, f"{EXPECTED['name']} has an attendance row"):
        return

    got = as_float(row["attendance_percentage"])
    ok = got is not None and abs(got - EXPECTED["attendance"]) <= EXPECTED["tolerance"]
    check(
        ok,
        f"{EXPECTED['name']} computes to {got} "
        f"({row['days_present']}/{row['eligible_days']} days); expected {EXPECTED['attendance']}",
    )

    # And as the public actually receives it, on both paths that serve it.
    served = fetch(f"/api/v2/heroes/{row['id']}")
    hero = as_float((served.get("metrics") or {}).get("attendance_percentage")) or as_float(
        served.get("attendance_percentage")
    )
    check(
        hero is not None and abs(hero - EXPECTED["attendance"]) <= EXPECTED["tolerance"],
        f"/api/v2/heroes serves {hero} for {EXPECTED['name']}",
    )

    roster = fetch("/api/mps?status=all")
    listed = next((m for m in roster if m.get("name") == EXPECTED["name"]), None)
    listed_val = as_float(listed.get("attendance")) if listed else None
    check(
        listed_val is not None and abs(listed_val - EXPECTED["attendance"]) <= EXPECTED["tolerance"],
        f"/api/mps serves {listed_val} for {EXPECTED['name']} "
        "(this path reads mp_stats_summary and may still serve v1)",
    )


# ── 4. Too little data is unknown, never zero ────────────────────────────────
def check_suppression(cur) -> None:
    cur.execute(
        """
        SELECT p.id, p.display_name, a.eligible_days, a.attendance_percentage
        FROM mp_attendance_v2 a JOIN politicians p ON p.id = a.mp_id
        WHERE a.eligible_days < %s
        """,
        (MIN_ELIGIBLE_SITTING_DAYS,),
    )
    thin = cur.fetchall()
    check(
        all(r["attendance_percentage"] is None for r in thin),
        f"all {len(thin)} members under {MIN_ELIGIBLE_SITTING_DAYS} eligible days are NULL in the view",
    )

    # The number a citizen sees. 0.0 here is the failure the whole check exists
    # for: it reads as "never showed up" rather than "not enough data".
    roster = {m["name"]: m for m in fetch("/api/mps?status=all")}
    zeros = []
    for r in thin:
        served = roster.get(r["display_name"])
        if served is not None and as_float(served.get("attendance")) == 0.0:
            zeros.append(r["display_name"])
    check(
        not zeros,
        f"no suppressed member is served as 0.0 by /api/mps "
        f"({len(zeros)} would read as never having attended: {', '.join(zeros[:3]) or '—'})",
    )


# ── 5. Recompute from raw rows and compare with what is served ───────────────
def check_recomputation(cur) -> None:
    cur.execute(
        """
        SELECT p.id, p.display_name, a.attendance_percentage, a.eligible_days
        FROM mp_attendance_v2 a JOIN politicians p ON p.id = a.mp_id
        WHERE a.eligible_days >= %s
        """,
        (MIN_ELIGIBLE_SITTING_DAYS,),
    )
    pool = cur.fetchall()
    sample = random.sample(pool, min(RANDOM_SAMPLE, len(pool)))

    mismatches = []
    for mp in sample:
        # Recomputed here from registrations and votes directly — deliberately
        # not by re-reading the materialised view the value came from.
        cur.execute(
            """
            WITH sitting_days AS (
                SELECT sitting_date FROM sitting_registrations WHERE sitting_date IS NOT NULL
                UNION
                SELECT sitting_date FROM votes WHERE sitting_date IS NOT NULL
            ),
            eligible AS (
                SELECT d.sitting_date FROM sitting_days d, politicians p
                WHERE p.id = %(mp)s::uuid
                  AND (p.mandate_start_date IS NULL OR d.sitting_date >= p.mandate_start_date)
                  AND (p.mandate_end_date IS NULL OR d.sitting_date <= p.mandate_end_date)
            ),
            present AS (
                SELECT s.sitting_date
                FROM politicians p
                JOIN mp_registrations m ON m.seimas_mp_id = p.seimas_mp_id AND m.registered
                JOIN sitting_registrations s ON s.reg_id = m.reg_id
                WHERE p.id = %(mp)s::uuid AND s.sitting_date IS NOT NULL
                UNION
                SELECT v.sitting_date
                FROM mp_votes mv
                JOIN votes v ON v.seimas_vote_id = mv.vote_id
                WHERE mv.politician_id = %(mp)s::uuid
                  AND v.sitting_date IS NOT NULL
                  AND (lower(mv.vote_choice) IN ('už','uz','prieš','pries')
                       OR lower(mv.vote_choice) LIKE 'susilaik%%')
            )
            SELECT (SELECT count(DISTINCT sitting_date) FROM eligible) AS eligible_days,
                   (SELECT count(DISTINCT sitting_date) FROM present
                    WHERE sitting_date IN (SELECT sitting_date FROM eligible)) AS days_present
            """,
            {"mp": mp["id"]},
        )
        raw = cur.fetchone()
        expected = round(100.0 * raw["days_present"] / raw["eligible_days"], 2)

        served = fetch(f"/api/v2/heroes/{mp['id']}")
        got = as_float((served.get("metrics") or {}).get("attendance_percentage")) or as_float(
            served.get("attendance_percentage")
        )
        if got is None or abs(got - expected) > 0.01:
            mismatches.append(f"{mp['display_name']}: recomputed {expected}, served {got}")

    check(
        not mismatches,
        f"{len(sample)} random members recompute to their served value"
        + (f" — {'; '.join(mismatches[:3])}" if mismatches else ""),
    )


def main() -> int:
    dsn = os.environ.get("DB_DSN") or os.environ.get("DATABASE_URL")
    if not dsn:
        print("DB_DSN not set — source ~/.config/openseimas/prod.env first", file=sys.stderr)
        return 2

    today = datetime.date.today()
    if today < datetime.date(2026, 8, 26):
        print(
            f"Refusing to run: attendance v2 takes effect 2026-08-26 and today is {today}.\n"
            "Checks 1 and 3 would fail simply because the old methodology is still in "
            "force, and a red run before the switch teaches people to ignore it.\n"
            "Override with OPENSEIMAS_FORCE=1 if you know why you want that.",
            file=sys.stderr,
        )
        if os.environ.get("OPENSEIMAS_FORCE") != "1":
            return 2

    conn = psycopg2.connect(dsn)
    conn.set_session(readonly=True, autocommit=False)
    print(f"attendance v2 verification · {datetime.datetime.now():%Y-%m-%d %H:%M} · API {API}\n")
    with conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        check_methodology(cur)
        check_mandate_windows(cur)
        check_expected_value(cur)
        check_suppression(cur)
        check_recomputation(cur)

    failed = [line for ok, line in _results if not ok]
    print(f"\n{len(_results) - len(failed)}/{len(_results)} checks passed")
    if failed:
        print("\nFailures:")
        for line in failed:
            print(f"  - {line}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
