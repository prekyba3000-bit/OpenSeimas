import sys
import defusedxml.ElementTree as ET
import psycopg2
from psycopg2 import pool, extras
import os
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import fetch_with_retry  # noqa: E402
from pipeline.common import record_fetch  # noqa: E402
from pipeline.project_number import resolve as resolve_project

# Vote ids whose result fetch failed this run. A gap nobody knows about is
# worse than a gap on the record: these are reported and re-attempted next run
# (ingest is idempotent, so a recovered vote simply UPSERTs into place).
_FAILED_VOTE_IDS: list = []

# --- Configuration ---
# Use the verified working credentials
DB_DSN = os.getenv("DB_DSN")
import datetime

BASE_URL = "https://apps.lrs.lt/sip/p2b"
TERM_ID = "10" # 2024-2028 Term

# Global Connection Pool
_db_pool = None

def init_db_pool():
    global _db_pool
    if _db_pool is None:
        print(f"Initializing DB Pool for {DB_DSN.split('@')[-1]}...")
        _db_pool = psycopg2.pool.ThreadedConnectionPool(2, 20, DB_DSN)

@contextmanager
def get_db_conn():
    conn = _db_pool.getconn()
    try:
        yield conn
    finally:
        _db_pool.putconn(conn)

# --- Caching ---
MP_CACHE = {} # seimas_id (int) -> uuid (str)

def cache_mp_ids():
    """Fetch all MP IDs once to avoid N+1 lookups."""
    print("Caching MP IDs...")
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT seimas_mp_id, id FROM politicians WHERE seimas_mp_id IS NOT NULL")
            rows = cur.fetchall()
            for row in rows:
                MP_CACHE[str(row[0])] = row[1]
    print(f"Cached {len(MP_CACHE)} MPs.")

# --- Fetching ---
def fetch_xml(url):
    """Parsed XML, or None once retries are exhausted.

    Previously a single attempt with no retry: two vote-result fetches timed
    out during the 2026-08-10 backfill and those votes were silently missing
    from production with nothing recording their absence.
    """
    try:
        r = fetch_with_retry(url, timeout=30)
        if r.status_code != 200:
            print(f"Error fetching {url}: HTTP {r.status_code}")
            return None
        return ET.fromstring(r.content)
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def _parse_tallies(totals):
    """Pull the protocol totals off <BendriBalsavimoRezultatai>.

    Six attributes the ingest previously fetched and discarded. Returns None for
    each field the element does not carry, so a source that omits them stores
    NULL rather than a fabricated zero — a vote with 0 recorded "už" and a vote
    whose tally was never published must not look identical.

    Deliberately does NOT derive an outcome: the source publishes no pass/fail
    field, and `už > prieš` is not the rule (constitutional laws need 3/5).
    """
    empty = {
        'votes_for': None, 'votes_against': None, 'votes_abstained': None,
        'votes_participated': None, 'seats_eligible': None, 'voted_at': None,
    }
    if totals is None:
        return empty

    def _int(attr):
        raw = totals.get(attr)
        if raw is None or str(raw).strip() == '':
            return None
        try:
            return int(str(raw).strip())
        except ValueError:
            # A non-numeric tally is a source anomaly, not a reason to crash the
            # whole sitting; store NULL and let the provenance row carry it.
            return None

    voted_at = None
    raw_time = totals.get('balsavimo_laikas')
    if raw_time and raw_time.strip():
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
            try:
                voted_at = datetime.datetime.strptime(raw_time.strip(), fmt)
                break
            except ValueError:
                continue

    return {
        'votes_for':          _int('už'),
        'votes_against':      _int('prieš'),
        'votes_abstained':    _int('susilaikė'),
        'votes_participated': _int('balsavo'),
        'seats_eligible':     _int('viso'),
        'voted_at':           voted_at,
    }


def process_sitting(sess_id, sit_id):
    """Process a single sitting: fetch agenda, votes, and insert batch."""
    # 3. Get Agenda
    agenda = fetch_xml(f"{BASE_URL}.ad_seimo_posedzio_eiga_full?posedzio_id={sit_id}")
    if not agenda: return 0

    # Extract date
    sitting_date_str = None
    posedis_tag = agenda.find('.//posedis')
    if posedis_tag is not None:
        sitting_date_str = posedis_tag.findtext('data') or posedis_tag.get('data')

    votes_to_insert = [] # List of tuples for 'votes' table
    mp_votes_batch = []  # List of tuples for 'mp_votes' table

    local_votes_count = 0

    # Build kl_gr_id -> [(nr, pavadinimas, registracijos_nr), ...] map for resolving
    # "Klausimų grupė" placeholder titles (LRS uses this for package votes that
    # bundle multiple individual agenda items sharing the same group id).
    kl_gr_children = {}
    for q in agenda.findall('.//darbotvarkes-klausimas'):
        kg = q.get('kl_gr_id')
        pav = q.findtext('pavadinimas') or ''
        if kg and pav and pav.strip() != 'Klausimų grupė':
            kl_gr_children.setdefault(kg, []).append((
                (q.findtext('nr') or '').strip(),
                pav.strip(),
                q.get('registracijos_nr'),
            ))

    # Iterate 'darbotvarkes-klausimas' (Agenda Item)
    for q in agenda.findall('.//darbotvarkes-klausimas'):
        title_base = q.findtext('pavadinimas') or "Unknown Motion"
        stadija = q.findtext('stadija') # e.g. Pateikimas

        # Extract Project ID
        project_id = q.get('registracijos_nr')
        if not project_id:
            match = re.search(r'Nr\.\s*([A-Za-z0-9-]+)', title_base)
            if match: project_id = match.group(1)

        # Resolve "Klausimų grupė" placeholder via kl_gr_id sibling lookup.
        if title_base.strip() == 'Klausimų grupė':
            kg = q.get('kl_gr_id')
            children = kl_gr_children.get(kg, []) if kg else []
            nr_label = (q.findtext('nr') or '').strip()
            if children:
                joined = ' • '.join(c[1] for c in children)
                title_base = f"Klausimų grupė ({nr_label}): {joined}" if nr_label else f"Klausimų grupė: {joined}"
                if not project_id:
                    for _, _, rn in children:
                        if rn:
                            project_id = rn
                            break
            elif nr_label:
                title_base = f"Klausimų grupė (Nr. {nr_label})"
        
        # Find votes inside this question
        for b in q.findall('.//balsavimas'):
            vid = b.get('bals_id') or b.get('balsavimo_id')
            if not vid: continue
            
            # 4. Fetch Results
            res_xml = fetch_xml(f"{BASE_URL}.ad_sp_balsavimo_rezultatai?balsavimo_id={vid}")
            if not res_xml:
                _FAILED_VOTE_IDS.append(vid)
                continue
            
            # Metadata
            title = title_base
            header = res_xml.find('.//BalsavimoRezultataiAntraštė')
            if header is not None:
                res_title = header.get('klausimo_pavadinimas')
                if res_title: title = res_title
                if not stadija: stadija = header.get('balsavimo_tipas')
            
            # The protocol totals element carries the whole vote summary. The
            # source flags votes whose electronic per-MP results disagree with
            # those totals; keep that on the record (migration 018).
            totals = res_xml.find('.//BendriBalsavimoRezultatai')
            source_comment = totals.get('komentaras') if totals is not None else None
            tallies = _parse_tallies(totals)

            # Prepare Vote Record
            # Resolved from the FINAL title, after the results header has had its
            # chance to replace title_base. project_id keeps its legacy value
            # untouched; the two new columns carry the project as it really is.
            # See pipeline/project_number.py for why the title beats the
            # attribute and why a clipped one yields nothing.
            found = resolve_project(project_id, title)
            votes_to_insert.append((
                vid, sitting_date_str, title, project_id, stadija, source_comment,
                tallies['votes_for'], tallies['votes_against'], tallies['votes_abstained'],
                tallies['votes_participated'], tallies['seats_eligible'], tallies['voted_at'],
                found.registration if found else None,
                found.base if found else None,
            ))
            
            # Prepare Decisions (MP Votes)
            rows = res_xml.findall('.//IndividualusBalsavimoRezultatas')
            if not rows: rows = res_xml.findall('.//BalsavimoRezultatai')
            
            for v in rows:
                mp_ext_id = v.get('asmens_id') or v.get('sn_id')
                choice = v.get('kaip_balsavo') or v.get('balsavimo_rezultatas')
                
                if not mp_ext_id: continue
                
                # Use Cache
                mp_uuid = MP_CACHE.get(str(mp_ext_id))
                if mp_uuid:
                    mp_votes_batch.append((vid, mp_uuid, choice))
            
            local_votes_count += 1

    # Batch Insert into DB
    if not votes_to_insert: return 0

    # Dedupe by vid before the UPSERT: LRS XML lists the same <balsavimas>
    # under both a "Klausimų grupė" wrapper darbotvarkes-klausimas and its
    # child items (the deep-or-self .//balsavimas yields it twice), which
    # makes Postgres reject the batch with "ON CONFLICT DO UPDATE command
    # cannot affect row a second time". Prefer the child's resolved title
    # over the wrapper placeholder when both reference the same vid.
    def _is_placeholder(t):
        return (t or '').strip() in ('Klausimų grupė', 'Unknown Motion', '')

    votes_by_vid = {}
    for row in votes_to_insert:
        vid = row[0]
        existing = votes_by_vid.get(vid)
        if existing is None or _is_placeholder(existing[2]):
            votes_by_vid[vid] = row
    votes_to_insert = list(votes_by_vid.values())

    # mp_votes uses ON CONFLICT DO NOTHING, which tolerates intra-batch
    # duplicates, but dedupe anyway for cleanliness.
    mp_votes_batch = list({(r[0], r[1]): r for r in mp_votes_batch}.values())

    with get_db_conn() as conn:
        with conn.cursor() as cur:
            # Upsert Votes
            extras.execute_values(cur, """
                INSERT INTO votes (seimas_vote_id, sitting_date, title, project_id, vote_type, source_comment,
                                   votes_for, votes_against, votes_abstained,
                                   votes_participated, seats_eligible, voted_at,
                                   project_registration_nr, project_base_nr)
                VALUES %s
                ON CONFLICT (seimas_vote_id)
                DO UPDATE SET
                    title = EXCLUDED.title,
                    sitting_date = EXCLUDED.sitting_date,
                    project_id = EXCLUDED.project_id,
                    project_registration_nr = EXCLUDED.project_registration_nr,
                    project_base_nr = EXCLUDED.project_base_nr,
                    vote_type = EXCLUDED.vote_type,
                    source_comment = EXCLUDED.source_comment,
                    -- COALESCE so a re-run that hits a momentarily tally-less
                    -- response cannot blank figures already stored.
                    votes_for          = COALESCE(EXCLUDED.votes_for,          votes.votes_for),
                    votes_against      = COALESCE(EXCLUDED.votes_against,      votes.votes_against),
                    votes_abstained    = COALESCE(EXCLUDED.votes_abstained,    votes.votes_abstained),
                    votes_participated = COALESCE(EXCLUDED.votes_participated, votes.votes_participated),
                    seats_eligible     = COALESCE(EXCLUDED.seats_eligible,     votes.seats_eligible),
                    voted_at           = COALESCE(EXCLUDED.voted_at,           votes.voted_at)
            """, votes_to_insert)

            # Upsert MP Votes
            if mp_votes_batch:
                extras.execute_values(cur, """
                    INSERT INTO mp_votes (vote_id, politician_id, vote_choice)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                """, mp_votes_batch)

            conn.commit()
            
    print(f"  > Sitting {sit_id}: Synced {local_votes_count} votes.")
    return local_votes_count

def ingest_term_votes():
    init_db_pool()
    cache_mp_ids()
    
    # 1. Get Sessions
    print(f"Fetching Sessions for Term {TERM_ID}...")
    root = fetch_xml(f"{BASE_URL}.ad_seimo_sesijos?kadencijos_id={TERM_ID}")
    if not root: 
        print("Failed to fetch sessions.")
        return
    
    sessions = [s.get('sesijos_id') for s in root.findall('.//SeimoSesija')]
    print(f"Found Sessions: {sessions}")

    total_votes = 0
    
    # Process Sessions sequentially, but Sittings concurrently
    for sess_id in sessions:
        if not sess_id: continue
        
        # 2. Get Sittings
        s_root = fetch_xml(f"{BASE_URL}.ad_seimo_posedziai?sesijos_id={sess_id}")
        if not s_root: continue
        
        sittings = [p.get('posėdžio_id') for p in s_root.findall('.//SeimoPosėdis')]
        print(f"Session {sess_id}: Discovered {len(sittings)} sittings. Starting concurrent sync...")
        
        # Use ThreadPoolExecutor to process sittings in parallel
        # Max workers = 5 to be polite to LRS API and Render DB limit
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(process_sitting, sess_id, sit_id) for sit_id in sittings if sit_id]
            
            for future in as_completed(futures):
                try:
                    count = future.result()
                    total_votes += count
                except Exception as e:
                    print(f"Worker failed: {e}")

    print(f"SUCCESS: Ingested {total_votes} votes/updates.")
    if _FAILED_VOTE_IDS:
        # Named, not just counted, so a specific missing vote can be chased.
        print(f"WARNING: {len(_FAILED_VOTE_IDS)} vote result(s) could not be fetched "
              f"and are MISSING from this run: {', '.join(_FAILED_VOTE_IDS)}")
        print("They will be retried on the next run (ingest is idempotent).")
    if _db_pool: _db_pool.closeall()
    return {"votes": total_votes, "failed_vote_ids": list(_FAILED_VOTE_IDS)}

def sync_votes():
    """Entry point for API admin sync. Runs full term vote ingestion."""
    ingest_term_votes()


if __name__ == "__main__":
    ingest_term_votes()
