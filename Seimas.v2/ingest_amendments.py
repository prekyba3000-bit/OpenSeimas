import os
import defusedxml.ElementTree as ET
import psycopg2
from psycopg2.extras import execute_values
from utils import fetch_with_retry

DB_DSN = os.getenv("DB_DSN")
BASE_URL = "https://apps.lrs.lt/sip/p2b.ad_sn_pasiulymai_ta_projektams"


def count_amendments_for_seimas_id(seimas_id: int) -> int:
    url = f"{BASE_URL}?asmens_id={seimas_id}"
    response = fetch_with_retry(url, timeout=30)
    root = ET.fromstring(response.content)

    direct_nodes = root.findall(".//Pasiulymas")
    if direct_nodes:
        return len(direct_nodes)

    # Fallback: count any element with tag name containing "pasiulym".
    fallback_count = 0
    for node in root.iter():
        if "pasiulym" in node.tag.lower():
            fallback_count += 1
    return fallback_count


def sync_amendments() -> None:
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
        ORDER BY display_name
        """
    )
    rows = cur.fetchall()
    if not rows:
        print("No MPs with seimas_mp_id found.")
        cur.close()
        conn.close()
        return

    payload = []
    failures = 0
    for mp_id, seimas_mp_id in rows:
        try:
            amendment_count = count_amendments_for_seimas_id(int(seimas_mp_id))
            payload.append((mp_id, amendment_count))
            print(f"[OK] seimas_id={seimas_mp_id}: {amendment_count}")
        except Exception as exc:
            failures += 1
            payload.append((mp_id, 0))
            print(f"[WARN] seimas_id={seimas_mp_id}: {exc}")

    execute_values(
        cur,
        """
        INSERT INTO mp_amendment_counts (mp_id, amendments_proposed_count)
        VALUES %s
        ON CONFLICT (mp_id) DO UPDATE SET
            amendments_proposed_count = EXCLUDED.amendments_proposed_count,
            updated_at = NOW()
        """,
        payload,
    )

    print("Refreshing mp_stats_summary after amendment count updates...")
    cur.execute("REFRESH MATERIALIZED VIEW mp_stats_summary")

    conn.commit()
    cur.close()
    conn.close()
    print(f"Updated amendments for {len(payload)} MPs. Failures: {failures}")


if __name__ == "__main__":
    sync_amendments()
