"""Capture real API payloads as test fixtures.

Hand-written fixtures encode the author's assumptions, which is exactly how the
zod-schema bug shipped twice: nobody hand-writes `party: null`, so no test ever
saw it. These fixtures come from the live API instead, for members chosen by
awkward PROPERTY rather than by name — so the set keeps working when the
Speaker changes or a member leaves.

Run against production (read-only):

    DB_DSN=... .venv/bin/python -m scripts.refresh_wire_fixtures

Then run both suites. If a newly-captured payload has a null the contract does
not declare, `tests/test_wire_contract.py` fails and tells you to declare it;
declaring it makes the dashboard test check that the zod schema accepts it.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "contracts" / "fixtures"
API = os.environ.get("API_BASE", "https://seimas-api.onrender.com")

# Chosen by property, never by name. Each is a shape that has broken something.
SELECTORS: tuple[tuple[str, str, str], ...] = (
    (
        "no-faction",
        "Sits in no faction — party, party_loyalty and the loyalty engine all null.",
        "SELECT id FROM politicians WHERE current_party IS NULL AND is_active LIMIT 1",
    ),
    (
        "former-member",
        "Mandate ended: no current faction either, plus a mandate_end_date.",
        "SELECT id FROM politicians WHERE NOT is_active AND current_party IS NULL LIMIT 1",
    ),
    (
        "ordinary",
        "The control. Everything populated; guards against a fixture set that is all edge case.",
        "SELECT id FROM politicians WHERE current_party IS NOT NULL AND is_active"
        " ORDER BY display_name LIMIT 1",
    ),
    (
        "suppressed-attendance",
        "Below the 3 eligible sitting day floor, so attendance is NULL rather than a number.",
        "SELECT p.id FROM politicians p JOIN mp_attendance_v2 a ON a.mp_id = p.id"
        " WHERE a.attendance_percentage IS NULL LIMIT 1",
    ),
)


def fetch(mp_id: str) -> dict:
    with urllib.request.urlopen(f"{API}/api/v2/heroes/{mp_id}", timeout=120) as r:
        return json.loads(r.read())


def main() -> int:
    dsn = os.environ.get("DB_DSN")
    if not dsn:
        print("DB_DSN is not set", file=sys.stderr)
        return 2

    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    written = 0
    for name, why, sql in SELECTORS:
        try:
            cur.execute(sql)
        except psycopg2.Error as exc:
            conn.rollback()
            print(f"  {name}: query failed ({exc.__class__.__name__}), skipped")
            continue
        row = cur.fetchone()
        if not row:
            print(f"  {name}: no member matches this shape today, skipped")
            continue

        payload = fetch(str(row["id"]))
        # The member behind a fixture changes over time; the SHAPE is the point.
        # Recording who it was keeps a failure diagnosable.
        out = {
            "_selector": name,
            "_why": why,
            "_captured_mp": payload.get("mp", {}).get("name"),
            "payload": payload,
        }
        path = FIXTURE_DIR / f"heroes-{name}.json"
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  {name}: {payload.get('mp', {}).get('name')} -> {path.name}")
        written += 1

    print(f"\n{written} fixtures written to {FIXTURE_DIR}")
    return 0 if written else 1


if __name__ == "__main__":
    raise SystemExit(main())
