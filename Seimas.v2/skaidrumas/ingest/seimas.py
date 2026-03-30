"""
ingest/seimas.py

Pulls data from the official Seimas XML API.
Base URL: https://apps.lrs.lt/sip/

All endpoints return XML. The API is public, open, CC BY 4.0 licensed,
and requires no authentication. Rate limiting is gentle — we add 1s delays
between requests out of courtesy, not necessity.

Real endpoint structure (discovered from Seimas developer docs + network inspection):
    p2b.ad_seimo_nariai              → List of all MPs for a given term
    p2b.ad_seimo_kk_posedziai        → Committee session records
    p2b.ad_fn_balsavimai             → Plenary vote records
    p2b.ad_fn_balsavimas_mp          → Individual MP vote detail for one bill
    p2b.ad_sn_inicijuoti_ta_projektai→ Legislation initiated by specific MP
    p2b.ad_sn_pasiulymai_ta_projektams → Amendments proposed by MP
    p2b.ad_sn_komandiruotes          → MP business trips
    p2b.ad_sn_padejejai_sekretoriai  → MP assistants and secretaries
    p2b.ad_sn_dalyvavimas_posedziuose→ Attendance records
"""

import re
import time
import httpx
from lxml import etree
from datetime import datetime, date
from loguru import logger
from storage.db import get_session, MP, Vote, Amendment, Attendance


SEIMAS_BASE = "https://apps.lrs.lt/sip/"
HEADERS = {
    "User-Agent": "Skaidrumas.lt/1.0 (public interest transparency platform; contact@skaidrumas.lt)",
    "Accept": "application/xml",
}


def _get(endpoint: str, params: dict) -> etree._Element:
    """
    Fetches one Seimas API endpoint and returns parsed XML root.
    Retries once on network errors. Respects the API with a 1s delay.
    """
    url = SEIMAS_BASE + endpoint
    time.sleep(1)  # Polite delay

    try:
        response = httpx.get(url, params=params, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return etree.fromstring(response.content)
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP {e.response.status_code} from Seimas API: {url} params={params}")
        raise
    except etree.XMLSyntaxError as e:
        logger.error(f"Malformed XML from Seimas API: {url} — {e}")
        raise


def fetch_mp_list(term: int) -> list[dict]:
    """
    Fetches the full list of Seimas members for a given parliamentary term.

    The term parameter uses the Seimas internal term numbering:
        term=10 → 2020–2024 parliament
        term=11 → 2024–2028 parliament (current)

    Each MP in the XML has attributes: asmens_id, vardas, pavarde,
    frakcija, partija, and a nested <komitetai> block with their committees.
    """
    root = _get("p2b.ad_seimo_nariai", {"kadencija": term})
    mps = []

    for mp_el in root.findall(".//SeimoPastovusMuo"):
        committees = [
            k.get("pavadinimas", "")
            for k in mp_el.findall(".//Komitetas")
        ]
        mps.append({
            "seimas_id": mp_el.get("asmens_id"),
            "term": term,
            "first_name": mp_el.get("vardas", ""),
            "last_name": mp_el.get("pavarde", ""),
            "full_name": f"{mp_el.get('vardas', '')} {mp_el.get('pavarde', '')}".strip(),
            "party": mp_el.get("partija", ""),
            "fraction": mp_el.get("frakcija", ""),
            "committees": committees,
            "email": mp_el.get("el_pastas", ""),
            "phone": mp_el.get("telefonas", ""),
        })

    logger.info(f"Fetched {len(mps)} MPs for term {term}")
    return mps


def fetch_votes_for_session(session_id: str) -> list[dict]:
    """
    Fetches all vote records for a plenary session.

    The Seimas voting system records each MP's individual vote.
    'session_id' is the Seimas internal posedzio_id, which you get from
    iterating through p2b.ad_seimo_kk_posedziai.

    Key XML structure:
        <Balsavimai>
          <Balsavimas projekto_id="..." balsavimo_laikas="..." pavadinimas="...">
            <Balsavo asmens_id="..." balsas="Už|Prieš|Susilaikė|Nedalyvavo"/>
          </Balsavimas>
        </Balsavimai>
    """
    root = _get("p2b.ad_fn_balsavimai", {"posedzio_id": session_id})
    votes = []

    for vote_el in root.findall(".//Balsavimas"):
        bill_id = vote_el.get("projekto_id")
        bill_title = vote_el.get("pavadinimas", "")
        voted_at_str = vote_el.get("balsavimo_laikas", "")

        try:
            voted_at = datetime.strptime(voted_at_str, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            voted_at = None

        is_night_vote = voted_at and voted_at.hour >= 22

        for mp_vote_el in vote_el.findall(".//Balsavo"):
            raw_result = mp_vote_el.get("balsas", "")

            # Normalize Lithuanian vote labels to English for DB consistency
            result_map = {
                "Už": "for",
                "Prieš": "against",
                "Susilaikė": "abstain",
                "Nedalyvavo": "absent",
                "Nevotavo": "absent",
            }

            votes.append({
                "seimas_mp_id": mp_vote_el.get("asmens_id"),
                "bill_id": bill_id,
                "bill_title": bill_title,
                "vote_result": result_map.get(raw_result, raw_result),
                "voted_at": voted_at,
                "is_night_vote": is_night_vote,
                "session_id": session_id,
            })

    return votes


def fetch_plenary_sessions(date_from: date, date_to: date) -> list[dict]:
    """
    Returns a list of plenary session IDs and dates within a date range.
    This is the entry point for a bulk historical pull — iterate sessions,
    then for each session call fetch_votes_for_session().
    """
    root = _get("p2b.ad_seimo_kk_posedziai", {
        "nuo": date_from.strftime("%Y-%m-%d"),
        "iki": date_to.strftime("%Y-%m-%d"),
        "tipas": "P",  # P = plenary, K = committee
    })

    sessions = []
    for session_el in root.findall(".//Posedzis"):
        sessions.append({
            "session_id": session_el.get("posedzio_id"),
            "session_date": session_el.get("data"),
            "session_type": "plenary",
            "agenda_items": int(session_el.get("darbotvarkes_punktu_sk", 0)),
        })

    logger.info(f"Found {len(sessions)} plenary sessions between {date_from} and {date_to}")
    return sessions


def fetch_amendments_for_mp(seimas_mp_id: str, term: int) -> list[dict]:
    """
    Fetches all amendments proposed by a specific MP.

    The lead_time_minutes field is critical — amendments submitted fewer than
    60 minutes before a vote are flagged as 'nocturnal' regardless of hour,
    because they prevent any meaningful public scrutiny.

    XML structure provides both pasiulymo_data (submission time) and
    the linked project's balsavimo_laikas — we compute the diff here.
    """
    root = _get("p2b.ad_sn_pasiulymai_ta_projektams", {
        "asmens_id": seimas_mp_id,
        "kadencija": term,
    })

    amendments = []
    for amend_el in root.findall(".//Pasiulymas"):
        proposed_str = amend_el.get("pasiulymo_data", "")
        voted_str = amend_el.get("balsavimo_laikas", "")

        try:
            proposed_at = datetime.strptime(proposed_str, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            proposed_at = None

        try:
            voted_at = datetime.strptime(voted_str, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            voted_at = None

        lead_minutes = None
        if proposed_at and voted_at:
            lead_minutes = int((voted_at - proposed_at).total_seconds() / 60)

        text = amend_el.get("turinys", "")
        word_count = len(text.split()) if text else 0
        citation_count = len(re.findall(
            r'\b(?:straipsn|įstatym|direktyv|nutarim|Nr\.\s*\w+)', text, re.IGNORECASE
        )) if text else 0

        amendments.append({
            "amendment_id": amend_el.get("pasiulymo_id"),
            "bill_id": amend_el.get("projekto_id"),
            "seimas_mp_id": seimas_mp_id,
            "proposed_at": proposed_at,
            "voted_at": voted_at,
            "lead_time_minutes": lead_minutes,
            "amendment_text": text,
            "result": amend_el.get("rezultatas", ""),
            "word_count": word_count,
            "legal_citation_count": citation_count,
        })

    return amendments


def fetch_attendance(seimas_mp_id: str, date_from: date, date_to: date) -> list[dict]:
    """
    Fetches session attendance for an MP. Per diem is paid per session
    recorded as attended — so this data can be cross-checked against
    declared income to spot discrepancies.
    """
    root = _get("p2b.ad_sn_dalyvavimas_posedziuose", {
        "asmens_id": seimas_mp_id,
        "nuo": date_from.strftime("%Y-%m-%d"),
        "iki": date_to.strftime("%Y-%m-%d"),
    })

    records = []
    for session_el in root.findall(".//Posedzis"):
        records.append({
            "seimas_mp_id": seimas_mp_id,
            "session_id": session_el.get("posedzio_id"),
            "session_date": session_el.get("data"),
            "attended": session_el.get("dalyvavo") == "T",
            "per_diem_eligible": session_el.get("dienpinigiai") == "T",
        })

    return records


def ingest_current_term(session_factory=get_session):
    """
    Full ingest pipeline for the current parliamentary term.
    Call this on first run. After that, use incremental_ingest() daily.

    This will take ~4-6 hours on first run because of the per-session
    vote fetching. Run it as a background job.
    """
    from datetime import date

    CURRENT_TERM = 11  # 2024–2028
    TERM_START = date(2024, 11, 12)

    logger.info("Starting full Seimas ingest for current term...")

    # Step 1: All MPs
    mp_data = fetch_mp_list(CURRENT_TERM)
    mp_id_map = {}  # seimas_id → db row id

    with session_factory() as db:
        for mp_dict in mp_data:
            mp = MP(**mp_dict)
            db.merge(mp)
        db.commit()
        # Build ID map for foreign key resolution
        for mp in db.query(MP).filter_by(term=CURRENT_TERM):
            mp_id_map[mp.seimas_id] = mp.id

    logger.info(f"Stored {len(mp_data)} MPs")

    # Step 2: All plenary sessions since term start
    sessions = fetch_plenary_sessions(TERM_START, date.today())

    for session in sessions:
        logger.info(f"Fetching votes for session {session['session_id']} ({session['session_date']})")
        try:
            votes = fetch_votes_for_session(session["session_id"])
        except Exception as e:
            logger.warning(f"Skipping session {session['session_id']}: {e}")
            continue

        with session_factory() as db:
            for v in votes:
                mp_db_id = mp_id_map.get(v["seimas_mp_id"])
                if not mp_db_id:
                    continue
                vote = Vote(
                    mp_id=mp_db_id,
                    bill_id=v["bill_id"],
                    bill_title=v["bill_title"],
                    vote_result=v["vote_result"],
                    voted_at=v["voted_at"],
                    is_night_vote=v["is_night_vote"],
                )
                db.add(vote)
            db.commit()

    # Step 3: Amendments for each MP
    for seimas_id, db_id in mp_id_map.items():
        try:
            amendments = fetch_amendments_for_mp(seimas_id, CURRENT_TERM)
        except Exception as e:
            logger.warning(f"Skipping amendments for {seimas_id}: {e}")
            continue

        with session_factory() as db:
            for a in amendments:
                amend = Amendment(
                    amendment_id=a["amendment_id"],
                    bill_id=a["bill_id"],
                    proposer_mp_id=db_id,
                    proposed_at=a["proposed_at"],
                    voted_at=a["voted_at"],
                    lead_time_minutes=a["lead_time_minutes"],
                    amendment_text=a["amendment_text"],
                    result=a["result"],
                )
                db.merge(amend)
            db.commit()

    logger.success("Seimas full ingest complete.")
