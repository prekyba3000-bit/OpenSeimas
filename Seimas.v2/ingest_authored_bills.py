import os

import defusedxml.ElementTree as ET
import psycopg2

from utils import fetch_with_retry


DB_DSN = os.getenv("DB_DSN")
BASE_URL = "https://apps.lrs.lt/sip/p2b.ad_sn_inicijuoti_ta_projektai"


def count_authored_bills(seimas_mp_id: int) -> int:
    url = f"{BASE_URL}?asmens_id={seimas_mp_id}"
    response = fetch_with_retry(url, timeout=30)
    root = ET.fromstring(response.content)

    # We count any node that looks like a legislative project record.
    count = 0
    for node in root.findall(".//*"):
        attrs = node.attrib
        if not attrs:
            continue
        if any(
            key in attrs
            for key in ("projekto_id", "ta_projekto_id", "projekto_nr", "projekto_numeris", "project_id")
        ):
            count += 1
    return count


def run_authored_bills_ingest():
    if not DB_DSN:
        print("ERROR: DB_DSN environment variable not set.")
        return

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, seimas_mp_id
        FROM politicians
        WHERE is_active = TRUE
          AND seimas_mp_id IS NOT NULL
        ORDER BY seimas_mp_id
        """
    )
    mps = cur.fetchall()
    print(f"Found {len(mps)} active MPs for authored bill ingest.")

    updated = 0
    for mp_uuid, seimas_mp_id in mps:
        try:
            authored_count = count_authored_bills(int(seimas_mp_id))
            cur.execute(
                """
                UPDATE politicians
                SET bills_authored_count = %s
                WHERE id = %s::uuid
                """,
                (authored_count, str(mp_uuid)),
            )
            updated += 1
            print(f"Updated MP {seimas_mp_id} authored bills: {authored_count}")
        except Exception as exc:
            print(f"Failed authored-bill ingest for MP {seimas_mp_id}: {exc}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()
    conn.close()
    print(f"Authored-bill ingest complete. Updated {updated} MPs.")


if __name__ == "__main__":
    run_authored_bills_ingest()
