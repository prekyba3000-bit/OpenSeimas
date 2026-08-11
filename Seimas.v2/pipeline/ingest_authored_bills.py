"""Ingest legislative initiative counts per MP from LRS public XML.

Source: p2b.ad_sn_inicijuoti_ta_projektai?asmens_id=<id>&kadencijos_id=<term>

The term parameter matters: without it the endpoint answers 200 with an empty
envelope, which the previous version of this module recorded as "0 initiatives"
for every member — the reason `politicians.bills_authored_count` was 0 across
the board and the "Teisėkūros aktyvumas" metric stayed hidden.

The feed reports its own totals per member (`kiekis_viso`,
`kiekis_individualiai`, `kiekis_grupėje`) alongside the individual project
rows, so each response can be reconciled against itself: a header total that
disagrees with the number of rows returned is recorded as an anomaly rather
than silently averaged away.
"""
import os
import sys

import defusedxml.ElementTree as ET
import psycopg2

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry  # noqa: E402
from pipeline.common import record_fetch  # noqa: E402

DB_DSN = os.getenv("DB_DSN")
BASE_URL = "https://apps.lrs.lt/sip/p2b.ad_sn_inicijuoti_ta_projektai"
TERM_ID = os.getenv("KADENCIJOS_ID", "10")
SOURCE_NAME = "seimas_authored_bills"

PROJECT_TAG = "SeimoNarioPateiktasTeisėsAktoProjektas"


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def fetch_member_initiatives(seimas_mp_id: int):
    """(total, individually, rows_seen, anomaly) for one member.

    `anomaly` is a human-readable note when the feed's own header total does
    not match the rows it returned, or None.
    """
    url = f"{BASE_URL}?asmens_id={seimas_mp_id}&kadencijos_id={TERM_ID}"
    response = fetch_with_retry(url, timeout=30)
    root = ET.fromstring(response.content)

    member = None
    for node in root.iter():
        if node.tag.endswith("SeimoNarys"):
            member = node
            break

    rows_seen = sum(1 for node in root.iter() if node.tag.endswith(PROJECT_TAG))
    if member is None:
        # No record for this member in this term — a real zero, not a failure.
        return 0, 0, rows_seen, None

    total = _int(member.get("kiekis_viso"))
    individually = _int(member.get("kiekis_individualiai"))

    anomaly = None
    if total is not None and total != rows_seen:
        anomaly = (
            f"header kiekis_viso={total} but {rows_seen} project rows returned"
        )
    return (total if total is not None else rows_seen), (individually or 0), rows_seen, anomaly


def run():
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2

    conn = psycopg2.connect(DB_DSN)
    try:
        with record_fetch(conn, SOURCE_NAME, BASE_URL) as fetch:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, seimas_mp_id FROM politicians
                WHERE seimas_mp_id IS NOT NULL ORDER BY seimas_mp_id
                """
            )
            members = cur.fetchall()
            print(f"Fetching initiatives for {len(members)} members (term {TERM_ID})...")

            updated, failures, anomalies = 0, [], []
            for mp_uuid, seimas_mp_id in members:
                try:
                    total, individually, _rows, anomaly = fetch_member_initiatives(int(seimas_mp_id))
                except Exception as exc:  # noqa: BLE001 — recorded, then reported
                    failures.append(str(seimas_mp_id))
                    print(f"  ! member {seimas_mp_id}: {exc}")
                    continue

                if anomaly:
                    anomalies.append(f"{seimas_mp_id}: {anomaly}")

                cur.execute(
                    """
                    UPDATE politicians
                    SET bills_initiated_total = %s,
                        bills_initiated_individually = %s,
                        bills_authored_count = %s
                    WHERE id = %s::uuid
                    """,
                    (total, individually, total, mp_uuid),
                )
                updated += 1

            conn.commit()
            fetch["rows"] = updated
            print(f"Updated {updated} members.")
            if anomalies:
                print(f"WARNING: {len(anomalies)} member(s) where the feed's own total "
                      f"disagrees with its rows: {'; '.join(anomalies[:5])}")
            if failures:
                print(f"WARNING: {len(failures)} member(s) could not be fetched and keep "
                      f"their previous values: {', '.join(failures)}")
            return 0
    finally:
        conn.close()


# Backwards-compatible name used by older callers.
run_authored_bills_ingest = run


def main(args=None):
    return run()


if __name__ == "__main__":
    sys.exit(run())
