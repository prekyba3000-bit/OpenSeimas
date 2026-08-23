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

from pipeline.common import record_fetch, setup_logging  # noqa: E402
from pipeline.ingest_floor_speeches import fetch_sessions  # noqa: E402

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

    sessions = fetch_sessions(TERM_ID)
    if not sessions:
        print(f"No sessions returned for term {TERM_ID} — leaving existing rows alone.")
        return 1

    conn = psycopg2.connect(dsn)
    try:
        with conn, conn.cursor() as cur:
            with record_fetch(conn, SOURCE_NAME, SOURCE_URL) as fetch:
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
        print(f"Upserted {len(sessions)} sessions for term {TERM_ID}.")
        return 0
    finally:
        conn.close()


def main(args=None):
    return run()


if __name__ == "__main__":
    sys.exit(run())
