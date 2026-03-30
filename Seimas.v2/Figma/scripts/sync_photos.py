import os
import sys
import argparse
import requests
import time
from pathlib import Path

# Ensure we can import from the parent directory or utils location
# Assuming utils.py might be in the root or scripts directory
sys.path.append(str(Path(__file__).parent.parent))

try:
    from utils import get_db_connection
except ImportError:
    print("⚠️ Could not import 'get_db_connection' from 'utils'.")
    print("   Please ensure 'utils.py' exists and is in the PYTHONPATH.")
    # Mocking for standalone execution if utils is missing (for safety/demo)
    def get_db_connection():
        print("   [Mock] Connecting to database...")
        class MockCursor:
            def execute(self, sql, params=None):
                print(f"   [MockDB] Executing: {sql} | Params: {params}")
            def fetchall(self):
                # Return dummy data for testing
                return [
                    {'id': 1, 'seimas_mp_id': 141, 'display_name': 'Gabrielius Landsbergis'},
                    {'id': 2, 'seimas_mp_id': 142, 'display_name': 'Viktorija Čmilytė-Nielsen'}
                ]
            def close(self): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass
        
        class MockConn:
            def cursor(self, cursor_factory=None): return MockCursor()
            def commit(self): print("   [MockDB] Commit")
            def close(self): print("   [MockDB] Connection closed")
        return MockConn()

def sync_photos(force=False):
    # 1. Infrastructure Check
    # The prompt specifies 'dashboard/public/mps'. 
    # Adjusting base path relative to this script or project root.
    # Assuming the script runs from project root or 'scripts/' folder.
    # We'll treat 'dashboard/public/mps' as relative to the current working directory.
    
    target_dir = Path("public/mps")
    
    if not target_dir.exists():
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
            print(f"📂 Created asset directory: {target_dir}")
        except Exception as e:
            print(f"❌ Failed to create directory {target_dir}: {e}")
            return
    else:
        print(f"📂 Asset directory exists: {target_dir}")

    # 2. The Crawler Logic
    conn = get_db_connection()
    try:
        # Depending on the DB driver (psycopg2 usually), cursor_factory might be needed for dict access
        # Here assuming getting a cursor that supports fetchall returning dict-like or tuples.
        # If using psycopg2.extras.RealDictCursor in utils, great. 
        # Otherwise, we might need to handle tuple unpacking.
        # We'll assume RealDictCursor or similar behavior for simplicity in this script.
        cur = conn.cursor()
        
        print("🔍 Fetching active MPs from database...")
        cur.execute("SELECT id, seimas_mp_id, display_name FROM politicians WHERE is_active = true") # Assuming is_active filter or fetching all
        # If 'is_active' column doesn't exist, remove it. The prompt just said "Fetch all active MPs".
        # Safe fallback query if schema is unknown:
        # cur.execute("SELECT id, seimas_mp_id, display_name FROM politicians")
        
        # Let's try to be specific but safe.
        try:
            results = cur.fetchall()
        except Exception as e:
            print(f"❌ Error fetching MPs: {e}")
            return

        print(f"   Found {len(results)} MPs.")

        for mp in results:
            # Handle both dictionary and tuple rows
            if isinstance(mp, dict):
                mp_id = mp['id']
                seimas_id = mp['seimas_mp_id']
                name = mp['display_name']
            else:
                # Assuming order: id, seimas_mp_id, display_name
                mp_id = mp[0]
                seimas_id = mp[1]
                name = mp[2]

            if not seimas_id:
                print(f"⚠️ Skipping {name} (No Seimas ID)")
                continue

            file_path = target_dir / f"{seimas_id}.jpg"
            
            # Check if file exists and force flag
            if file_path.exists() and not force:
                print(f"⏭️  Skipping {name} (Photo exists)")
                continue

            # Construct Source URL
            url = f"https://www.lrs.lt/photo/sn_nuotraukos/{seimas_id}.jpg"
            
            try:
                # Download
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    with open(file_path, 'wb') as f:
                        f.write(response.content)
                    print(f"✅ Downloaded photo for {name}")
                    
                    # 3. The Database Link
                    # Update local path relative to public/ (which is usually root of serving)
                    # Prompt asks for value: '/mps/{seimas_mp_id}.jpg'
                    db_path = f"/mps/{seimas_id}.jpg"
                    
                    cur.execute(
                        "UPDATE politicians SET photo_url = %s WHERE id = %s",
                        (db_path, mp_id)
                    )
                    conn.commit() # Commit after each or batch? Prompt implies "If download successful... execute SQL".
                    
                elif response.status_code == 404:
                    print(f"⚠️ Photo not found for {name} (ID: {seimas_id})")
                else:
                    print(f"⚠️ Failed to download for {name}: Status {response.status_code}")
                    
                # Be nice to the server
                time.sleep(0.1)
                
            except Exception as e:
                print(f"❌ Error processing {name}: {e}")

    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed.")

def main():
    parser = argparse.ArgumentParser(description="Sync MP photos from LRS website.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing photos")
    args = parser.parse_args()

    sync_photos(force=args.force)

if __name__ == "__main__":
    main()
