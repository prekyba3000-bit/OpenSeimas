"""MP diary events, from p2b.ad_sn_darbotvarkes.

Evidence only. Nothing here feeds a dial and no surface shows a total: diary
length tracks office and committee load, not diligence.

Reconciles rather than inserting once. The feed adds past-dated entries late —
3 of 140 members over four days — so every run re-reads every diary and upserts
on a content hash. Cheap because the write work is skipped when a member's
fingerprint is unchanged, which is the common case.

Do NOT append kadencijos_id: this endpoint answers an unsupported parameter
with a path-level 404 that reads exactly like a removed feed.
"""
import hashlib
import os
import re
import sys

import psycopg2
from psycopg2.extras import execute_values

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.common import record_fetch, setup_logging  # noqa: E402
from utils import fetch_with_retry  # noqa: E402

BASE_URL = "https://apps.lrs.lt/sip/p2b.ad_sn_darbotvarkes"
SOURCE_NAME = "seimas_diary"
EVENT_RE = re.compile(r"<SeimoNarioDarbotvarkėsĮvykis\s([^>]*?)/?>")
ATTR_RE = re.compile(r'([\wĀ-ſ_]+)="([^"]*)"')


def _clean(value):
    value = (value or "").strip()
    return value or None


def parse_events(payload: bytes):
    text = payload.decode("utf-8", "replace")
    out = []
    for raw in EVENT_RE.findall(text):
        a = dict(ATTR_RE.findall(raw))
        starts = _clean(a.get("pradžia"))
        title = _clean(a.get("pavadinimas"))
        if not starts or not title:
            continue
        ends = _clean(a.get("pabaiga"))
        location = _clean(a.get("vieta"))
        digest = hashlib.sha256(
            "|".join([starts, ends or "", location or "", title]).encode("utf-8")
        ).hexdigest()
        out.append((starts, ends, location, title, digest))
    return out


def fingerprint(events):
    """Order-independent: the feed's row order is not a promise."""
    return hashlib.sha256(
        "\n".join(sorted(e[4] for e in events)).encode("utf-8")
    ).hexdigest()


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
                "SELECT p.id, p.seimas_mp_id, s.full_sha256 "
                "FROM politicians p LEFT JOIN mp_diary_state s ON s.mp_id = p.id "
                "WHERE p.is_active AND p.seimas_mp_id IS NOT NULL "
                "ORDER BY p.seimas_mp_id"
            )
            members = cur.fetchall()
        print(f"{len(members)} active members" + (" (dry run)" if dry else ""))

        parsed = inserted = unchanged = failures = 0
        with record_fetch(conn, SOURCE_NAME, BASE_URL) as fetch:
            for mp_uuid, seimas_mp_id, known_hash in members:
                try:
                    payload = fetch_with_retry(
                        f"{BASE_URL}?asmens_id={seimas_mp_id}", timeout=30
                    ).content
                except Exception as exc:  # noqa: BLE001
                    failures += 1
                    print(f"  ! member {seimas_mp_id}: {type(exc).__name__}")
                    continue

                events = parse_events(payload)
                parsed += len(events)
                digest = fingerprint(events)
                if digest == known_hash:
                    unchanged += 1
                    continue
                if dry or not events:
                    continue

                with conn.cursor() as cur:
                    # RETURNING + fetch, not cur.rowcount. execute_values batches
                    # by page_size (100 by default) and rowcount reflects only
                    # the final batch, so a 1,073-event diary reported ~73
                    # inserts. That number then went into source_fetches as
                    # truth, which is worse than not recording it at all.
                    written = execute_values(
                        cur,
                        """
                        INSERT INTO mp_diary_events
                            (mp_id, starts_at, ends_at, location, title, content_hash)
                        VALUES %s
                        ON CONFLICT (mp_id, content_hash) DO NOTHING
                        RETURNING 1
                        """,
                        [(str(mp_uuid), *e) for e in events],
                        fetch=True,
                    )
                    inserted += len(written)
                    cur.execute(
                        """
                        INSERT INTO mp_diary_state (mp_id, full_sha256, event_count, last_read_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (mp_id) DO UPDATE SET
                            full_sha256 = EXCLUDED.full_sha256,
                            event_count = EXCLUDED.event_count,
                            last_read_at = NOW()
                        """,
                        (str(mp_uuid), digest, len(events)),
                    )
                conn.commit()

            fetch["rows"] = inserted
            fetch["parsed"] = parsed
            fetch["inserted"] = inserted
            notes = []
            if dry:
                notes.append("dry run: fetched but wrote nothing by design")
            if unchanged:
                notes.append(f"{unchanged} diaries unchanged since last read")
            if parsed != inserted and not dry:
                notes.append(f"{parsed - inserted} events already stored")
            if failures:
                notes.append(f"{failures} members unreadable; their rows unchanged")
            if notes:
                fetch["note"] = "; ".join(notes)

        print(f"Events parsed: {parsed} · new rows: {inserted} · "
              f"diaries unchanged: {unchanged} · unreadable: {failures}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
