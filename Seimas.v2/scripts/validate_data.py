import psycopg2
import os
import sys

def validate_data():
    db_dsn = os.getenv("DB_DSN")
    if not db_dsn:
        print("[ERROR] DB_DSN not set.")
        sys.exit(1)

    try:
        conn = psycopg2.connect(db_dsn)
        cur = conn.cursor()

        print("\n=== DATA VALIDATION REPORT ===")
        
        # Check Politicians
        cur.execute("SELECT count(*) FROM politicians")
        mp_count = cur.fetchone()[0]
        print(f"[DATA] Total MPs: {mp_count}")
        
        # Check Votes
        cur.execute("SELECT count(*) FROM votes")
        vote_count = cur.fetchone()[0]
        print(f"[DATA] Total Votes: {vote_count}")

        # Check Relationships
        cur.execute("SELECT count(*) FROM mp_votes WHERE politician_id NOT IN (SELECT id FROM politicians)")
        orphaned_votes = cur.fetchone()[0]
        if orphaned_votes > 0:
            print(f"[WARN] Found {orphaned_votes} orphaned votes (no matching politician).")
        else:
            print("[OK] All votes linked to known politicians.")

        cur.close()
        conn.close()
        print("\n=== VALIDATION COMPLETE ===")

    except Exception as e:
        print(f"[ERROR] Validation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    validate_data()
