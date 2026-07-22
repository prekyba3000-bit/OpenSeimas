import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
import unidecode
import os
import re
from utils import fetch_with_retry

# --- Configuration ---
DB_DSN = os.getenv("DB_DSN") 

# VRK 2024 Seimas Election IDs
ELECTION_ID = "1544" 
ROUND_ID = "1870"
# HTML List URL (JSON is 404)
VRK_HTML_URL = f"https://www.vrk.lt/statiniai/puslapiai/rinkimai/{ELECTION_ID}/rnk{ROUND_ID}/kandidatai/SeiKandidataiPilnasSarasas.html"

def get_db_connection():
    return psycopg2.connect(DB_DSN)

def normalize(text):
    if not text: return ""
    clean = unidecode.unidecode(text).lower().strip()
    return " ".join(clean.split())

def fetch_vrk_candidates():
    print(f"Fetching VRK data from: {VRK_HTML_URL}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    resp = fetch_with_retry(VRK_HTML_URL, headers=headers)
    
    soup = BeautifulSoup(resp.content, 'lxml')
    candidates = []
    
    # Parse the table (usually class 'table' or just the first table)
    # Rows usually contain Name, Party, etc.
    # We need to find the link to the candidate profile to extract ID: 
    # e.g. <a href="...kandidatoJanketa&...&p_rknd_id=2422200...">
    
    rows = soup.find_all('tr')
    print(f"Found {len(rows)} rows in HTML.")
    
    for row in rows:
        cells = row.find_all('td')
        # Sometimes candidates are in list items or other structures if the table is different
        # But 'SeiKandidataiPilnasSarasas.html' usually has a table with one candidate per row looks like.
        # Let's search for the link ANYWHERE in the soup to be safe, or just iterate all main tags.
        # Actually, let's just find ALL 'a' tags with the specific href pattern. 
        pass
    
    # Better approach: Find all matching links directly
    links = soup.find_all('a', href=re.compile(r'rkndId-\d+'))
    print(f"Found {len(links)} candidate links.")
    
    for link in links:
        href = link.get('href', '')
        match = re.search(r'rkndId-(\d+)', href)
        if not match: continue
        
        vrk_id = match.group(1)
        raw_name = link.get_text(strip=True)
        
        # Clean name: "Virgilijus ALEKNA (D)" -> "Virgilijus ALEKNA"
        # Remove (...) at the end or anywhere
        clean_name = re.sub(r'\s*\(.*?\)', '', raw_name)
        
        candidates.append({
            'name': clean_name,
            'rink_kand_id': vrk_id
        })
        
    return candidates

def link_identities():
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Get our Golden Records (MPs)
    cur.execute("SELECT id, full_name_normalized FROM politicians WHERE vrk_candidate_id IS NULL")
    mps = cur.fetchall()
    print(f"Attempting to link {len(mps)} unlinked MPs...")

    # 2. Get VRK Candidates
    candidates = fetch_vrk_candidates()
    print(f"Loaded {len(candidates)} candidates from VRK HTML.")

    # Pre-process VRK candidates
    vrk_map = {}
    for cand in candidates:
        norm_name = normalize(cand['name'])
        vrk_map[norm_name] = cand['rink_kand_id']

    # 3. Match
    updates = []
    matches = 0
    
    for mp_id, mp_name in mps:
        vrk_id = vrk_map.get(mp_name)
        
        # Try simple fuzzy re-ordering if exact match fails
        if not vrk_id:
            # "jonas jonaitis" vs "jonaitis jonas"
            parts = mp_name.split()
            if len(parts) == 2:
                reversed_name = f"{parts[1]} {parts[0]}"
                vrk_id = vrk_map.get(reversed_name)

        if vrk_id:
            updates.append((vrk_id, str(mp_id)))
            matches += 1

    # 4. Commit
    if updates:
        # Use bulk update syntax for execute_values
        sql = """
            UPDATE politicians AS p
            SET vrk_candidate_id = v.vrk_id
            FROM (VALUES %s) AS v(vrk_id, id)
            WHERE p.id = v.id::uuid
        """
        execute_values(cur, sql, updates)
        conn.commit()
        print(f"SUCCESS: Linked {matches} MPs to VRK profiles.")
    else:
        print("No new links found.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    link_identities()
