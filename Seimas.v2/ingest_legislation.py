import requests
import psycopg2
from psycopg2.extras import execute_values
import os
import time
import defusedxml.ElementTree as ET

# --- Configuration ---
DB_DSN = os.getenv("DB_DSN")
BASE_SEARCH_URL = "https://e-seimas.lrs.lt/rs/legalactproject/search/find"

def get_db():
    return psycopg2.connect(DB_DSN)

def run_legislation_sync():
    conn = get_db()
    cur = conn.cursor()
    
    # 1. Get unique Project IDs from Votes
    print("Fetching missing project IDs from votes...")
    cur.execute("""
        SELECT DISTINCT project_id 
        FROM votes 
        WHERE project_id IS NOT NULL 
          AND project_id NOT IN (SELECT project_id FROM legislation)
    """)
    projects = [r[0] for r in cur.fetchall()]
    print(f"Found {len(projects)} new projects to ingest.")
    
    new_records = []
    
    # 2. Iterate and Fetch
    for pid in projects:
        try:
            # The API requires specific formatting
            url = f"{BASE_SEARCH_URL}?number={pid}"
            r = requests.get(url, timeout=10)
            
            if r.status_code != 200:
                print(f"  > Failed to fetch {pid} (Status {r.status_code})")
                continue
            
            # Response is typically Atom/XML
            # Heuristic title extraction from XML string to avoid complex NS handling
            xml_str = r.text
            title = "Unknown"
            summary = ""
            
            if '<pavadinimas>' in xml_str:
                start = xml_str.find('<pavadinimas>') + 13
                end = xml_str.find('</pavadinimas>')
                title = xml_str[start:end]
            elif '<title>' in xml_str:
                start = xml_str.find('<title>') + 7
                end = xml_str.find('</title>')
                title = xml_str[start:end]

            # Stripping HTML or excessive whitespace if any
            title = title.strip()
            
            new_records.append((pid, title, summary, url))
            print(f"  > Ingested {pid}: {title[:50]}...")
            
            time.sleep(1) # More conservative rate limit
            
        except Exception as e:
            print(f"  > Error processing {pid}: {e}")

    # 3. Save
    if new_records:
        print(f"Saving {len(new_records)} legislation records...")
        sql = """
            INSERT INTO legislation (project_id, title, summary, url)
            VALUES %s
            ON CONFLICT (project_id) DO NOTHING
        """
        execute_values(cur, sql, new_records)
        conn.commit()
    
    cur.close()
    conn.close()
    print("Legislation Sync Complete.")

if __name__ == "__main__":
    run_legislation_sync()
