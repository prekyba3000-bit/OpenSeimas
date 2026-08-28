"""
Ingest plenary floor-speech turns from LRS public XML feeds.

Replaces the press-release proxy that previously powered CHA. Each row in
the speeches table now represents one *speaking turn* on the Seimas floor,
attributed to an MP via the asm_id attribute (= politicians.seimas_mp_id).

Pipeline:
  1. p2b.ad_seimo_kadencijos                       — sessions per term
  2. p2b.ad_seimo_posedziai?sesijos_id=N           — sittings per session
                                                     (incl. Stenograma URL)
  3. p2b.ad_seimo_posedzio_eiga_full?posedzio_id=X — per-sitting agenda
                                                     items + speaker turns

Each <kalbetojas asm_id="..."> block is one MP turn. Speakers without
asm_id (e.g., rapporteurs identified only by pran_id, ministers,
externals) are skipped — they don't map to politicians.

Persisted columns:
  speech_type             'floor_speech'
  speech_url              <stenograma_nuoroda>#klb-<klb_id>  (unique per turn)
  source_speech_id        klb_id (the LRS turn identifier)
  speech_date             sitting date
  session_date            sitting date
  speech_title            agenda item pavadinimas
  speech_duration_seconds (iki - nuo).total_seconds() — clamped to >= 0
  words_spoken            NULL — transcript text not available in this feed

Idempotent on re-run via ON CONFLICT (mp_id, speech_url) DO NOTHING.
No DELETE step: a closed sitting is append-only at the source, so
re-running merely re-confirms existing rows.

Usage:
  python ingest_floor_speeches.py                       # current term (10)
  KADENCIJOS_ID=10 python ingest_floor_speeches.py
  SESIJOS_ID=144   python ingest_floor_speeches.py      # one session only
  POSEDZIO_ID=-502114 python ingest_floor_speeches.py   # one sitting only
"""

import os
import sys
from collections import defaultdict
from datetime import datetime

import defusedxml.ElementTree as ET
import psycopg2
from psycopg2.extras import execute_values

from utils import fetch_with_retry
from pipeline.common import record_fetch


DB_DSN = os.getenv("DB_DSN")
KADENCIJOS_ID = os.getenv("KADENCIJOS_ID", "10")
SESIJOS_ID_OVERRIDE = os.getenv("SESIJOS_ID")
POSEDZIO_ID_OVERRIDE = os.getenv("POSEDZIO_ID")

# p2b.ad_seimo_sesijos returns SeimoKadencija nodes with nested SeimoSesija
# children — the sittings live under sessions, sessions under terms.
SESIJOS_URL = "https://apps.lrs.lt/sip/p2b.ad_seimo_sesijos"
POSEDZIAI_URL = "https://apps.lrs.lt/sip/p2b.ad_seimo_posedziai"
EIGA_FULL_URL = "https://apps.lrs.lt/sip/p2b.ad_seimo_posedzio_eiga_full"


def parse_dt(value):
    """LRS timestamps are 'YYYY-MM-DD HH:MM[:SS]' or 'YYYY-MM-DD'."""
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def fetch_xml(url):
    response = fetch_with_retry(url, timeout=60)
    return ET.fromstring(response.content)


def parse_sessions_xml(payload: bytes, kadencijos_id):
    """Parse the sessions feed from raw bytes.

    Split out from fetch_sessions so a caller can hash and record the payload
    before anything parses it. Same logic, different input: bytes rather than a
    URL fetch performed inside the function.
    """
    root = ET.fromstring(payload)
    return _sessions_from_root(root, kadencijos_id)


def fetch_sessions(kadencijos_id):
    """Return list of sesijos_id strings for the given term."""
    root = fetch_xml(SESIJOS_URL)
    return _sessions_from_root(root, kadencijos_id)


def _sessions_from_root(root, kadencijos_id):
    sessions = []
    for kad in root.findall("SeimoKadencija"):
        if kad.get("kadencijos_id") != str(kadencijos_id):
            continue
        for ses in kad.findall("SeimoSesija"):
            sessions.append(
                {
                    "sesijos_id": ses.get("sesijos_id"),
                    "numeris": ses.get("numeris"),
                    "pavadinimas": ses.get("pavadinimas"),
                    "data_nuo": ses.get("data_nuo"),
                    "data_iki": ses.get("data_iki"),
                }
            )
    return sessions


def fetch_sittings(sesijos_id):
    """Return list of {posedis_id, date, stenograma_url} for one session."""
    url = f"{POSEDZIAI_URL}?sesijos_id={sesijos_id}"
    root = fetch_xml(url)
    sittings = []
    for pos in root.findall(".//SeimoPosėdis"):
        sten = pos.find("Stenograma")
        sittings.append(
            {
                "posedis_id": pos.get("posėdžio_id"),
                "numeris": pos.get("numeris"),
                "tipas": pos.get("tipas"),
                "pradzia": pos.get("pradžia"),
                "stenograma_url": sten.get("stenogramos_nuoroda") if sten is not None else None,
            }
        )
    return sittings


def fetch_turns(posedis_id, stenograma_url):
    """
    Yield one turn per (kalbetojas with asm_id) across all agenda items in
    a sitting. Each turn carries the agenda title as speech_title.
    """
    url = f"{EIGA_FULL_URL}?posedzio_id={posedis_id}"
    root = fetch_xml(url)
    posedis = root.find("posedis")
    if posedis is None:
        return

    sitting_dt = parse_dt(posedis.findtext("data") or posedis.findtext("pradzia"))
    sitting_date = sitting_dt.date() if sitting_dt else None

    for item in posedis.findall(".//darbotvarkes-klausimas"):
        title = (item.findtext("pavadinimas") or "").strip() or None
        for k in item.findall("kalbos/kalbetojas"):
            asm_id = k.get("asm_id")
            if not asm_id:
                continue  # rapporteur / minister / external — not a Seimas member

            klb_id = k.get("klb_id")
            if not klb_id:
                continue

            nuo = parse_dt(k.findtext("nuo"))
            iki = parse_dt(k.findtext("iki"))
            duration = None
            if nuo and iki:
                duration = max(0, int((iki - nuo).total_seconds()))

            yield {
                "asm_id": asm_id,
                "klb_id": klb_id,
                "speech_date": sitting_date,
                "session_date": sitting_date,
                "title": title,
                "duration_seconds": duration,
                "stenograma_url": stenograma_url,
            }


# A closed sitting is append-only at the source, so re-reading it is wasted.
# Sittings inside this window are always re-read anyway: a stenogram can be
# revised shortly after the sitting, and 14 days is cheap insurance against
# treating a provisional read as final.
SETTLED_AFTER_DAYS = 14


def load_sitting_state(cur):
    """posedis_id -> (stenogram_present, turns_seen, sitting_date)."""
    cur.execute("SELECT to_regclass('public.sitting_ingest_state') AS t")
    row = cur.fetchone()
    present = row[0] if not isinstance(row, dict) else row.get("t")
    if present is None:
        return {}
    cur.execute(
        "SELECT posedis_id, stenogram_present, turns_seen, sitting_date "
        "FROM sitting_ingest_state"
    )
    return {r[0]: (r[1], r[2], r[3]) for r in cur.fetchall()}


def _as_date(value):
    """Normalise a sitting timestamp to a date.

    fetch_sittings yields `pradzia` as the raw feed string ("2024-12-19 10:00"),
    not a datetime, and comparing that to a date raises rather than returning
    False — so an unparseable value must mean "do not skip", never "skip".
    """
    import datetime as _dt
    if value is None:
        return None
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    try:
        return _dt.date.fromisoformat(str(value).strip()[:10])
    except (ValueError, TypeError):
        return None


def should_skip(posedis_id, sitting_dt, state, force_full):
    """Skip only where re-reading has been observed to find nothing."""
    if force_full:
        return False
    entry = state.get(str(posedis_id))
    if not entry:
        return False                      # never read
    stenogram_present, turns_seen, _ = entry
    if not stenogram_present or not turns_seen:
        return False                      # may still gain a stenogram or turns
    day = _as_date(sitting_dt)
    if day is None:
        return False                      # undated or unparseable: never skip
    from datetime import date, timedelta
    return day < date.today() - timedelta(days=SETTLED_AFTER_DAYS)


def record_sitting_state(cur, posedis_id, sitting_dt, stenograma_url, turns_seen):
    cur.execute(
        """
        INSERT INTO sitting_ingest_state
            (posedis_id, sitting_date, stenogram_present, turns_seen, last_read_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (posedis_id) DO UPDATE SET
            sitting_date = EXCLUDED.sitting_date,
            stenogram_present = EXCLUDED.stenogram_present,
            turns_seen = EXCLUDED.turns_seen,
            last_read_at = NOW()
        """,
        (str(posedis_id), _as_date(sitting_dt), bool(stenograma_url), turns_seen),
    )


def build_asm_id_map(cur):
    """seimas_mp_id (str) → politicians.id (uuid str). Only active MPs."""
    cur.execute(
        """
        SELECT id, seimas_mp_id
        FROM politicians
        WHERE is_active = TRUE AND seimas_mp_id IS NOT NULL
        """
    )
    return {str(seimas_mp_id): str(uuid) for uuid, seimas_mp_id in cur.fetchall()}


def _ingest():
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    asm_to_uuid = build_asm_id_map(cur)
    print(f"Loaded {len(asm_to_uuid)} active MPs.")

    if POSEDZIO_ID_OVERRIDE:
        # Single-sitting mode — no Stenograma URL available without the list call,
        # so we accept that the URL fragment will lack a stenograma host.
        sittings_by_session = {None: [{"posedis_id": POSEDZIO_ID_OVERRIDE,
                                       "stenograma_url": None,
                                       "pradzia": None, "numeris": None, "tipas": None}]}
    else:
        sessions = fetch_sessions(KADENCIJOS_ID)
        if SESIJOS_ID_OVERRIDE:
            sessions = [s for s in sessions if s["sesijos_id"] == SESIJOS_ID_OVERRIDE]
        print(f"Sessions in scope: {[s['sesijos_id'] for s in sessions]}")
        sittings_by_session = {}
        for s in sessions:
            sids = fetch_sittings(s["sesijos_id"])
            sittings_by_session[s["sesijos_id"]] = sids
            print(f"  session {s['sesijos_id']} ({s['pavadinimas']}): {len(sids)} sittings")

    total_attempted = 0   # payload rows sent to INSERT
    total_inserted = 0    # rows actually written (cursor.rowcount)
    total_deduped = 0     # ON CONFLICT skips (attempted - inserted)
    skipped_unknown_mp = defaultdict(int)
    sittings_processed = 0
    sittings_skipped = 0

    force_full = "--full" in sys.argv
    sitting_state = load_sitting_state(cur)
    if force_full:
        print("  --full: re-reading every sitting, ignoring recorded state")

    for ses_id, sittings in sittings_by_session.items():
        for sitting in sittings:
            posedis_id = sitting["posedis_id"]
            stenograma_url = sitting.get("stenograma_url")
            sitting_dt = sitting.get("pradzia")
            if should_skip(posedis_id, sitting_dt, sitting_state, force_full):
                sittings_skipped += 1
                continue
            try:
                turns = list(fetch_turns(posedis_id, stenograma_url))
            except Exception as exc:
                print(f"  FAILED sitting {posedis_id}: {exc}")
                continue
            record_sitting_state(cur, posedis_id, sitting_dt, stenograma_url, len(turns))
            conn.commit()

            payload = []
            for t in turns:
                mp_uuid = asm_to_uuid.get(t["asm_id"])
                if not mp_uuid:
                    skipped_unknown_mp[t["asm_id"]] += 1
                    continue
                # Per-turn unique URL via fragment so the existing
                # UNIQUE (mp_id, speech_url) index dedupes idempotently.
                base = stenograma_url or f"https://www.lrs.lt/sip/?p_pos_id={posedis_id}"
                speech_url = f"{base}#klb-{t['klb_id']}"
                payload.append(
                    (
                        mp_uuid,
                        t["session_date"],
                        t["duration_seconds"],
                        t["klb_id"],
                        t["speech_date"],
                        t["title"],
                        speech_url,
                        "floor_speech",
                    )
                )

            inserted = 0
            if payload:
                try:
                    execute_values(
                        cur,
                        """
                        INSERT INTO speeches (
                            mp_id, session_date, speech_duration_seconds,
                            source_speech_id, speech_date, speech_title,
                            speech_url, speech_type
                        ) VALUES %s
                        ON CONFLICT (mp_id, speech_url) DO NOTHING
                        """,
                        payload,
                    )
                    inserted = cur.rowcount
                    conn.commit()
                    total_attempted += len(payload)
                    total_inserted += inserted
                    total_deduped += len(payload) - inserted
                except Exception as exc:
                    conn.rollback()
                    print(f"  INSERT FAILED for sitting {posedis_id}: {exc}")
                    continue

            sittings_processed += 1
            stenograma_present = bool(stenograma_url)
            print(
                f"  sitting {posedis_id} ({sitting.get('numeris')}, "
                f"{sitting.get('pradzia')}): "
                f"attempted={len(payload)} inserted={inserted} "
                f"deduped={len(payload)-inserted} "
                f"stenograma={'yes' if stenograma_present else 'NO'}"
            )

    cur.close()
    conn.close()
    print(
        f"\nFloor-speech ingest complete.\n"
        f"  sittings processed: {sittings_processed}"
        f" (skipped {sittings_skipped} already-settled)\n"
        f"  turn rows attempted: {total_attempted}\n"
        f"  turn rows inserted: {total_inserted}\n"
        f"  turn rows deduped (ON CONFLICT, prior runs): {total_deduped}"
    )
    if skipped_unknown_mp:
        unknown_total = sum(skipped_unknown_mp.values())
        print(
            f"  skipped {unknown_total} turn(s) for {len(skipped_unknown_mp)} "
            f"asm_id(s) not in active politicians — former members or replacements."
        )
    return total_attempted, total_inserted


def run():
    """Ingest with a provenance row recorded around it (plan §2.2)."""
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2
    conn = psycopg2.connect(DB_DSN)
    try:
        with record_fetch(conn, "seimas_floor_speeches", EIGA_FULL_URL) as fetch:
            attempted, inserted = _ingest()
            fetch["rows"] = inserted
            # Two different numbers. What the source offered is what says
            # whether the feed is alive; what we inserted is 0 on every healthy
            # run once the backlog is in, and reporting that as rows_affected
            # made frozen_feed fire on a perfectly working ingest.
            #
            # These assignments must stay inside the with-block: record_fetch
            # writes the row on exit, so mutating the dict afterwards changes
            # nothing and leaves parsed_count NULL.
            fetch["parsed"] = attempted
            fetch["inserted"] = inserted
            if attempted != inserted:
                fetch["note"] = (
                    f"{attempted - inserted} turns already stored "
                    "(idempotent re-run; a closed sitting is append-only at source)"
                )
    finally:
        conn.close()
    return 0


def main(args=None):
    return run()


if __name__ == "__main__":
    run()
