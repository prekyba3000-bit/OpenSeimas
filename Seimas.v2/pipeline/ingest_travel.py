"""Official foreign travel per MP, from p2b.ad_sn_komandiruotes.

Evidence only. Nothing here feeds a dial: trip frequency reflects committee
role and delegation membership, and a count of it beside a name would be read
as diligence.

Do NOT append kadencijos_id to this endpoint. It answers an unsupported
parameter with a path-level 404, which reads exactly like a removed feed.
"""
import os
import sys

import defusedxml.ElementTree as ET
import psycopg2
from psycopg2.extras import execute_values

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.common import record_fetch, setup_logging  # noqa: E402
from utils import fetch_with_retry  # noqa: E402

BASE_URL = "https://apps.lrs.lt/sip/p2b.ad_sn_komandiruotes"
SOURCE_NAME = "seimas_travel"
# LRS clips these at exactly 200 characters, mid-word.
TRUNCATION_LENGTH = 200


def parse_date(value):
    from datetime import datetime
    if not value:
        return None
    try:
        return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def fetch_trips(seimas_mp_id: int):
    response = fetch_with_retry(f"{BASE_URL}?asmens_id={seimas_mp_id}", timeout=30)
    root = ET.fromstring(response.content)
    rows = []
    for node in root.iter():
        if "komandiruot" not in node.tag.lower() or not node.attrib:
            continue
        attrs = node.attrib
        title = (attrs.get("pavadinimas") or "").strip()
        start = parse_date(attrs.get("pradžia") or attrs.get("pradzia"))
        if not title or start is None:
            continue
        rows.append((
            start,
            parse_date(attrs.get("pabaiga")),
            (attrs.get("tipas") or "").strip() or None,
            title,
            len(title) >= TRUNCATION_LENGTH,
        ))
    return rows


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
        print(f"{len(mps)} active members" + (" (dry run — nothing is written)" if dry else ""))

        total = truncated = failures = inserted = feed_dupes = 0
        with record_fetch(conn, SOURCE_NAME, BASE_URL) as fetch:
            for mp_uuid, seimas_mp_id in mps:
                try:
                    trips = fetch_trips(int(seimas_mp_id))
                except Exception as exc:  # noqa: BLE001 — recorded, then reported
                    failures += 1
                    print(f"  ! member {seimas_mp_id}: {type(exc).__name__}")
                    continue
                total += len(trips)
                truncated += sum(1 for t in trips if t[4])
                # The feed repeats some trips verbatim. Dedupe here rather than
                # letting ON CONFLICT absorb them, so that "the feed contained
                # duplicates" and "we already had this row" stay separate
                # numbers instead of one ambiguous gap.
                seen, unique = set(), []
                for t in trips:
                    key = (t[0], t[3])
                    if key in seen:
                        feed_dupes += 1
                        continue
                    seen.add(key)
                    unique.append(t)
                trips = unique
                if dry or not trips:
                    continue
                with conn.cursor() as cur:
                    execute_values(
                        cur,
                        """
                        INSERT INTO mp_travel
                            (mp_id, date_from, date_to, trip_type, title, title_truncated)
                        VALUES %s
                        ON CONFLICT (mp_id, date_from, md5(title)) DO NOTHING
                        """,
                        [(str(mp_uuid), *t) for t in trips],
                    )
                    # What the feed offered and what the table accepted are two
                    # numbers. Reporting the first as both is the exact lie the
                    # three-way reconciliation check exists to catch, and it
                    # would pass, because both sides would carry it.
                    inserted += cur.rowcount
                conn.commit()
            fetch["rows"] = inserted
            fetch["parsed"] = total
            fetch["inserted"] = inserted
            offered = total - feed_dupes
            already = offered - inserted
            notes = []
            if dry:
                notes.append("dry run: fetched but wrote nothing by design")
            if feed_dupes:
                notes.append(f"{feed_dupes} verbatim duplicates within the feed")
            if already:
                # Expected on every run after the first: this ingest is
                # idempotent, so most of what the feed offers is already stored.
                notes.append(f"{already} rows already stored (idempotent re-run)")
            if failures:
                notes.append(f"{failures} members unreadable; their rows unchanged")
            if notes:
                fetch["note"] = "; ".join(notes)

        print(f"Trips parsed: {total} · feed duplicates: {feed_dupes} · "
              f"new rows inserted: {inserted} · already stored: {total - feed_dupes - inserted} · "
              f"titles truncated: {truncated}")
        if failures:
            print(f"WARNING: {failures} member(s) could not be read; existing rows kept.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
