"""Ingest per-MP sitting registrations from LRS public XML.

This is the source the V.4 plan (§1) asks attendance to be built on:
registration records say who was *present*, independent of whether they voted.

Discovery chain:
    ad_seimo_sesijos?kadencijos_id=10        → sessions
    ad_seimo_posedziai?sesijos_id=…          → sittings
    ad_seimo_posedzio_eiga_full?posedzio_id= → <registracija reg_id=…> per sitting
    ad_sp_registracijos_rezultatai?registracijos_id=… → one row per MP

Every fetch goes through utils.fetch_with_retry, and every run writes a
source_fetches row (provenance, plan §2.2). Failures are counted and reported
rather than silently skipped: a partial run must not look like a complete one.
"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import defusedxml.ElementTree as ET
import psycopg2
from psycopg2.extras import execute_values

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry  # noqa: E402
from pipeline.common import record_fetch  # noqa: E402

DB_DSN = os.getenv("DB_DSN")
BASE_URL = "https://apps.lrs.lt/sip/p2b"
TERM_ID = "10"  # 2024-2028
SOURCE_NAME = "seimas_registrations"


def fetch_xml(url):
    """Parsed XML, or None if the source could not be read after retries."""
    try:
        resp = fetch_with_retry(url, timeout=30)
        if resp.status_code != 200:
            return None
        return ET.fromstring(resp.content)
    except Exception as exc:  # noqa: BLE001 — caller counts and reports failures
        print(f"  ! fetch failed {url}: {exc}")
        return None


def discover_registrations():
    """Every (reg_id, sitting_id, sitting_date) in the term, plus fetch failures."""
    found, failures = [], 0

    root = fetch_xml(f"{BASE_URL}.ad_seimo_sesijos?kadencijos_id={TERM_ID}")
    if root is None:
        raise RuntimeError("could not list sessions")
    sessions = [s.get("sesijos_id") for s in root.findall(".//SeimoSesija") if s.get("sesijos_id")]

    sittings = []
    for sess_id in sessions:
        s_root = fetch_xml(f"{BASE_URL}.ad_seimo_posedziai?sesijos_id={sess_id}")
        if s_root is None:
            failures += 1
            continue
        sittings += [p.get("posėdžio_id") for p in s_root.findall(".//SeimoPosėdis") if p.get("posėdžio_id")]

    print(f"Sessions: {len(sessions)}, sittings: {len(sittings)}")

    def sitting_registrations(sit_id):
        agenda = fetch_xml(f"{BASE_URL}.ad_seimo_posedzio_eiga_full?posedzio_id={sit_id}")
        if agenda is None:
            return None
        posedis = agenda.find(".//posedis")
        sitting_date = None
        if posedis is not None:
            raw = posedis.findtext("data") or ""
            sitting_date = raw.split(" ")[0] or None
        return [
            (r.get("reg_id"), sit_id, sitting_date)
            for r in agenda.findall(".//registracija")
            if r.get("reg_id")
        ]

    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(sitting_registrations, s): s for s in sittings}
        for fut in as_completed(futures):
            rows = fut.result()
            if rows is None:
                failures += 1
                continue
            found += rows

    return found, failures


def fetch_registration_detail(reg_id, sitting_id, sitting_date):
    """(header, per-MP rows) for one registration event, or None on failure."""
    url = f"{BASE_URL}.ad_sp_registracijos_rezultatai?registracijos_id={reg_id}"
    root = fetch_xml(url)
    if root is None:
        return None

    node = root.find(".//SeimoNariųRegistracija")
    totals = root.find(".//BendriRegistracijosRezultatai")
    reg_time = node.get("registracijos_laikas") if node is not None else None

    header = (
        int(reg_id),
        int(sitting_id) if sitting_id else None,
        sitting_date,
        reg_time,
        int(totals.get("registruota")) if totals is not None and totals.get("registruota") else None,
        int(totals.get("viso")) if totals is not None and totals.get("viso") else None,
        url,
    )
    people = [
        (int(reg_id), int(r.get("asmens_id")), (r.get("ar_registravosi") or "").strip().lower() == "taip")
        for r in root.findall(".//IndividualusRegistracijosRezultatas")
        if r.get("asmens_id")
    ]
    return header, people


def run():
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2

    conn = psycopg2.connect(DB_DSN)
    try:
        with record_fetch(conn, SOURCE_NAME, f"{BASE_URL}.ad_sp_registracijos_rezultatai") as fetch:
            registrations, discovery_failures = discover_registrations()
            print(f"Discovered {len(registrations)} registration events "
                  f"({discovery_failures} sittings unreadable)")

            headers, people, detail_failures = [], [], 0
            with ThreadPoolExecutor(max_workers=5) as pool:
                futures = [pool.submit(fetch_registration_detail, *r) for r in registrations]
                for fut in as_completed(futures):
                    detail = fut.result()
                    if detail is None:
                        detail_failures += 1
                        continue
                    header, rows = detail
                    headers.append(header)
                    people += rows

            cur = conn.cursor()
            execute_values(
                cur,
                """
                INSERT INTO sitting_registrations
                    (reg_id, sitting_id, sitting_date, registration_time,
                     registered_count, total_count, source_url)
                VALUES %s
                ON CONFLICT (reg_id) DO UPDATE SET
                    sitting_date = EXCLUDED.sitting_date,
                    registration_time = EXCLUDED.registration_time,
                    registered_count = EXCLUDED.registered_count,
                    total_count = EXCLUDED.total_count
                """,
                headers,
            )
            execute_values(
                cur,
                """
                INSERT INTO mp_registrations (reg_id, seimas_mp_id, registered)
                VALUES %s
                ON CONFLICT (reg_id, seimas_mp_id) DO UPDATE SET
                    registered = EXCLUDED.registered
                """,
                people,
            )
            conn.commit()
            fetch["rows"] = len(people)

            total_failures = discovery_failures + detail_failures
            print(f"Stored {len(headers)} registration events, {len(people)} MP rows.")
            if total_failures:
                # Recorded, not swallowed: a gap nobody knows about is worse
                # than a gap on the record.
                print(f"WARNING: {total_failures} fetches failed and are missing from this run.")
            return 0
    finally:
        conn.close()


def main(args=None):
    return run()


if __name__ == "__main__":
    sys.exit(run())
