#!/usr/bin/env python3
"""CZ-3 precondition probe: are the two initiative feeds alive?

No activity metric may be built on these until liveness is established, so this
records an observation rather than deriving anything. Probing is read-only and
writes one snapshot_manifest row per feed as a dated data-health data point.

    ad_sn_inicijuoti_ta_projektai     — initiatives per member
    ad_sn_pasiulymai_ta_projektams    — amendments proposed per member

A feed is "live" only if it returns parseable XML with at least one record for a
member known to have activity. HTTP 200 with an empty envelope is not liveness;
the previous version of the authored-bills ingest recorded exactly that as
"0 initiatives" for everybody.
"""
import os
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402

from pipeline.common import record_snapshot, setup_logging  # noqa: E402
from utils import fetch_with_retry  # noqa: E402

BASE = "https://apps.lrs.lt/sip"
TERM_ID = int(os.getenv("SEIMAS_TERM_ID", "10"))
FEEDS = {
    "cz3_probe_inicijuoti": f"{BASE}/p2b.ad_sn_inicijuoti_ta_projektai",
    "cz3_probe_pasiulymai": f"{BASE}/p2b.ad_sn_pasiulymai_ta_projektams",
}


def probe(source: str, base_url: str, mp_id: int):
    url = f"{base_url}?asmens_id={mp_id}&kadencijos_id={TERM_ID}"
    try:
        payload = fetch_with_retry(url, timeout=60).content
    except Exception as exc:  # noqa: BLE001
        return {"source": source, "url": url, "payload": b"", "status": "error",
                "detail": f"{type(exc).__name__}: {exc}", "records": None}
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        return {"source": source, "url": url, "payload": payload, "status": "error",
                "detail": f"unparseable XML: {exc}", "records": None}
    # Count any element below the root that carries attributes — the feeds use
    # different element names, and the question here is only "is there content".
    records = [e for e in root.iter() if e is not root and e.attrib]
    return {"source": source, "url": url, "payload": payload,
            "status": "live" if records else "empty",
            "detail": f"{len(records)} record elements, {len(payload)} bytes",
            "records": len(records)}


def main() -> int:
    setup_logging()
    dsn = os.getenv("DB_DSN")
    if not dsn:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            # A member already known to have initiatives, so an empty response
            # means the feed is empty rather than the member being inactive.
            cur.execute("""SELECT seimas_mp_id, display_name FROM politicians
                           WHERE bills_initiated_total > 0 AND seimas_mp_id IS NOT NULL
                           ORDER BY bills_initiated_total DESC LIMIT 1""")
            row = cur.fetchone()
        if not row:
            print("No member with known initiatives — cannot distinguish empty feed "
                  "from inactive member. Probe inconclusive.")
            return 1
        mp_id, name = row
        print(f"probing with {name} (asmens_id={mp_id}), term {TERM_ID}\n")

        results = []
        for source, base_url in FEEDS.items():
            r = probe(source, base_url, mp_id)
            record_snapshot(conn, source, r["url"], r["payload"],
                            parser_version="probe-1",
                            fetch_status="ok" if r["status"] == "live" else "error",
                            error=None if r["status"] == "live" else r["detail"])
            print(f"  {source:28} {r['status']:6}  {r['detail']}")
            results.append(r)

        live = [r for r in results if r["status"] == "live"]
        print(f"\n{len(live)}/{len(results)} feeds live. "
              f"{'Activity metrics remain blocked.' if len(live) < len(results) else 'Liveness established for both.'}")
        return 0 if len(live) == len(results) else 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
