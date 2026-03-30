import requests
import defusedxml.ElementTree as ET
import psycopg2
from psycopg2 import pool, extras
import os
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager

# --- Configuration ---
# Use the verified working credentials
DB_DSN = os.getenv("DB_DSN")
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
    try:
        r = requests.get(url, timeout=20)
        if r.status_code != 200: return None
        return ET.fromstring(r.content)
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

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

    # Iterate 'darbotvarkes-klausimas' (Agenda Item)
    for q in agenda.findall('.//darbotvarkes-klausimas'):
        title_base = q.findtext('pavadinimas') or "Unknown Motion"
        stadija = q.findtext('stadija') # e.g. Pateikimas
        
        # Extract Project ID
        project_id = q.get('registracijos_nr')
        if not project_id:
            match = re.search(r'Nr\.\s*([A-Za-z0-9-]+)', title_base)
            if match: project_id = match.group(1)
        
        # Find votes inside this question
        for b in q.findall('.//balsavimas'):
            vid = b.get('bals_id') or b.get('balsavimo_id')
            if not vid: continue
            
            # 4. Fetch Results
            res_xml = fetch_xml(f"{BASE_URL}.ad_sp_balsavimo_rezultatai?balsavimo_id={vid}")
            if not res_xml: continue
            
            # Metadata
            title = title_base
            header = res_xml.find('.//BalsavimoRezultataiAntraštė')
            if header is not None:
                res_title = header.get('klausimo_pavadinimas')
                if res_title: title = res_title
                if not stadija: stadija = header.get('balsavimo_tipas')
            
            # Prepare Vote Record
            # (seimas_vote_id, sitting_date, title, project_id, vote_type, created_at)
            votes_to_insert.append((vid, sitting_date_str, title, project_id, stadija))
            
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

    with get_db_conn() as conn:
        with conn.cursor() as cur:
            # Upsert Votes
            extras.execute_values(cur, """
                INSERT INTO votes (seimas_vote_id, sitting_date, title, project_id, vote_type)
                VALUES %s
                ON CONFLICT (seimas_vote_id) 
                DO UPDATE SET 
                    title = EXCLUDED.title, 
                    sitting_date = EXCLUDED.sitting_date,
                    project_id = EXCLUDED.project_id,
                    vote_type = EXCLUDED.vote_type
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
    if _db_pool: _db_pool.closeall()

def sync_votes():
    """Entry point for API admin sync. Runs full term vote ingestion."""
    ingest_term_votes()


if __name__ == "__main__":
    ingest_term_votes()
