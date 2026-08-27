"""Parliamentary assistants per MP, from p2b.ad_sn_padejejai_sekretoriai.

The employment relationship only. `kontakto_reikšmė` — a direct phone number or
@lrs.lt address — is discarded here, before anything is written, and
mp_assistants has no column that could hold it. Assistants are staff rather
than elected officials, and bulk-republishing their contact details is not
covered by the argument that justifies publishing a member's voting record.

The feed emits one row per contact method, so every assistant arrives twice.
They collapse to one row per person.

Do NOT append kadencijos_id: this endpoint answers an unsupported parameter
with a path-level 404 that reads exactly like a removed feed.
"""
import os
import sys

import defusedxml.ElementTree as ET
import psycopg2
from psycopg2.extras import execute_values

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.common import record_fetch, setup_logging  # noqa: E402
from utils import fetch_with_retry  # noqa: E402

BASE_URL = "https://apps.lrs.lt/sip/p2b.ad_sn_padejejai_sekretoriai"
SOURCE_NAME = "seimas_assistants"

# Never read into a variable, never passed on. Named here only so the omission
# is deliberate and greppable rather than an oversight someone later "fixes".
DISCARDED_FIELDS = ("kontakto_reikšmė", "kontakto_rūšis")


def fetch_assistants(seimas_mp_id: int):
    """Return distinct (first, last, in_constituency). Contacts never leave here."""
    response = fetch_with_retry(f"{BASE_URL}?asmens_id={seimas_mp_id}", timeout=30)
    root = ET.fromstring(response.content)
    seen = {}
    for node in root.iter():
        if "padėjėj" not in node.tag.lower() and "padejej" not in node.tag.lower():
            continue
        attrs = node.attrib
        first = (attrs.get("vardas") or "").strip()
        last = (attrs.get("pavardė") or attrs.get("pavarde") or "").strip()
        if not first or not last:
            continue
        raw = (attrs.get("ar_apygardoje") or "").strip().lower()
        in_constituency = True if raw == "taip" else (False if raw == "ne" else None)
        # Keyed by person: the phone row and the email row become one.
        seen[(first, last)] = (first, last, in_constituency)
    return list(seen.values())


def main() -> int:
    setup_logging()
    dsn = os.getenv("DB_DSN")
    if not dsn:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2
    dry = "--dry-run" in sys.argv

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, seimas_mp_id FROM politicians "
                "WHERE is_active AND seimas_mp_id IS NOT NULL ORDER BY seimas_mp_id"
            )
            mps = cur.fetchall()
        print(f"{len(mps)} active members" + (" (dry run)" if dry else ""))

        parsed = inserted = failures = 0
        with record_fetch(conn, SOURCE_NAME, BASE_URL) as fetch:
            for mp_uuid, seimas_mp_id in mps:
                try:
                    people = fetch_assistants(int(seimas_mp_id))
                except Exception as exc:  # noqa: BLE001
                    failures += 1
                    print(f"  ! member {seimas_mp_id}: {type(exc).__name__}")
                    continue
                parsed += len(people)
                if dry or not people:
                    continue
                with conn.cursor() as cur:
                    execute_values(
                        cur,
                        """
                        INSERT INTO mp_assistants (mp_id, first_name, last_name, in_constituency)
                        VALUES %s
                        ON CONFLICT (mp_id, first_name, last_name) DO NOTHING
                        """,
                        [(str(mp_uuid), *p) for p in people],
                    )
                    inserted += cur.rowcount
                conn.commit()
            fetch["rows"] = inserted
            fetch["parsed"] = parsed
            fetch["inserted"] = inserted
            notes = []
            if parsed != inserted and not dry:
                notes.append(f"{parsed - inserted} already stored (idempotent re-run)")
            if failures:
                notes.append(f"{failures} members unreadable; their rows unchanged")
            if notes:
                fetch["note"] = "; ".join(notes)

        print(f"Assistants parsed: {parsed} · new rows: {inserted} · "
              f"contact fields discarded at the parser: {', '.join(DISCARDED_FIELDS)}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
