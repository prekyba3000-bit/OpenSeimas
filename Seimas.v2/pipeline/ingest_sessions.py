"""Session boundaries from p2b.ad_seimo_sesijos.

The dates existed in a React file as literals. LRS publishes them, two other
pipelines already fetch this exact endpoint for their own purposes, and nothing
stored the result — so the surface that groups votes by session was guessing at
boundaries the platform could simply have known.

An unfinished session has an empty `data_iki` in the feed. That is stored NULL
and stays NULL: "this session has not ended" and "this session ends in 2099"
are different claims, and only one of them is true.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402

from pipeline.common import (  # noqa: E402
    SNAPSHOT_PARSER_VERSION,
    record_fetch,
    record_snapshot,
    setup_logging,
)
from pipeline.ingest_floor_speeches import fetch_with_retry, parse_sessions_xml  # noqa: E402

SOURCE_NAME = "seimas_sessions"
SOURCE_URL = "https://apps.lrs.lt/sip/p2b.ad_seimo_sesijos"
TERM_ID = int(os.getenv("SEIMAS_TERM_ID", "10"))


def _date_or_none(value):
    value = (value or "").strip()
    return value or None


def run():
    setup_logging()
    # DB_DSN, matching the other pipeline entrypoints and the ops scripts.
    # common.get_db_url_from_env() reads SEIMAS_DB_URL, which nothing sets.
    dsn = os.getenv("DB_DSN")
    if not dsn:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 1

    # Raw bytes first, hashed and recorded before anything parses them. A
    # parser change must be re-runnable against exactly what the source sent,
    # and a parse that mangles the feed must not be the only surviving record
    # of it.
    response = fetch_with_retry(SOURCE_URL, timeout=60)
    payload = response.content

    conn = psycopg2.connect(dsn)
    try:
        manifest_id, digest, unchanged = record_snapshot(
            conn, SOURCE_NAME, SOURCE_URL, payload,
            parser_version=SNAPSHOT_PARSER_VERSION,
        )
        print(f"snapshot {digest[:12]}… {len(payload)} bytes"
              f"{' (unchanged since last fetch)' if unchanged else ''}")

        sessions = parse_sessions_xml(payload, TERM_ID)
        if not sessions:
            print(f"No sessions returned for term {TERM_ID} — leaving existing rows alone.")
            return 1

        with conn, conn.cursor() as cur:
            with record_fetch(conn, SOURCE_NAME, SOURCE_URL) as fetch:
                fetch["manifest_id"] = manifest_id
                fetch["parsed"] = len(sessions)
                for s in sessions:
                    cur.execute(
                        """
                        INSERT INTO sessions
                            (seimas_session_id, term_id, number, name, date_from, date_to,
                             last_synced_at)
                        VALUES (%s, %s, %s, %s, %s, %s, now())
                        ON CONFLICT (seimas_session_id) DO UPDATE
                        SET term_id = EXCLUDED.term_id,
                            number = EXCLUDED.number,
                            name = EXCLUDED.name,
                            date_from = EXCLUDED.date_from,
                            date_to = EXCLUDED.date_to,
                            last_synced_at = now()
                        """,
                        (
                            int(s["sesijos_id"]),
                            TERM_ID,
                            int(s["numeris"]) if (s.get("numeris") or "").isdigit() else None,
                            s["pavadinimas"],
                            _date_or_none(s["data_nuo"]),
                            _date_or_none(s["data_iki"]),
                        ),
                    )
                fetch["rows"] = len(sessions)
                fetch["inserted"] = len(sessions)
        print(f"Upserted {len(sessions)} sessions for term {TERM_ID}.")
        return 0
    finally:
        conn.close()


def main(args=None):
    return run()


if __name__ == "__main__":
    sys.exit(run())
