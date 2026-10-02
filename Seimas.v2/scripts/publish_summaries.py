"""Publish summaries for all votes and bills to the production API."""
import os
import sys
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path to allow imports from pipeline
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.summaries import render_summary

API_URL = os.environ.get("API_URL", "https://seimas-api.onrender.com/api")
SYNC_SECRET = os.environ.get("SYNC_SECRET")

if not SYNC_SECRET:
    print("Error: SYNC_SECRET environment variable is required.")
    sys.exit(1)

def get_db_connection():
    dsn = os.environ.get("DB_DSN")
    if not dsn:
        raise ValueError("DB_DSN not found in environment.")
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def post_with_retry(url, json_payload, headers, max_retries=5):
    for attempt in range(max_retries):
        try:
            r = requests.post(url, json=json_payload, headers=headers, timeout=10)
            if r.status_code == 429:
                print("Rate limited, sleeping 5s...")
                time.sleep(5)
                continue
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"Error {e} on {url}, retrying in 3s...")
                time.sleep(3)
            else:
                raise

def publish_summary(entity_type: str, entity_id: str, body_lt: str):
    headers = {"Authorization": f"Bearer {SYNC_SECRET}"}
    
    # 1. Post revision
    rev_payload = {
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "body_lt": body_lt,
        "editor": "System (Initial Batch)",
        "note": "Initial generation from verified pipeline."
    }
    
    r = post_with_retry(f"{API_URL}/admin/summaries", rev_payload, headers)
    revision_id = r.json()["revision"]
    
    # 2. Approve revision
    approve_payload = {
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "revision": revision_id,
        "approved_by": "System Auto-Approve"
    }
    post_with_retry(f"{API_URL}/admin/summaries/approve", approve_payload, headers)


def main():
    print(f"Publishing to {API_URL}...")
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # 1. Fetch all votes that are NOT yet published
            cur.execute("""
                SELECT v.id FROM votes v 
                WHERE NOT EXISTS (
                    SELECT 1 FROM summary_revisions sr 
                    WHERE sr.entity_type = 'vote' AND sr.entity_id = v.id::text
                )
            """)
            votes = [str(r["id"]) for r in cur.fetchall()]
            
            # 2. Fetch all bills that are NOT yet published
            cur.execute("""
                SELECT l.project_id FROM legislation l
                WHERE NOT EXISTS (
                    SELECT 1 FROM summary_revisions sr 
                    WHERE sr.entity_type = 'bill' AND sr.entity_id = l.project_id
                )
            """)
            bills = [str(r["project_id"]) for r in cur.fetchall()]
    finally:
        conn.close()

    print(f"Found {len(votes)} votes and {len(bills)} bills remaining to publish.")
    
    # Needs a separate connection for rendering during the loop
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            print("Processing votes...")
            published_votes = 0
            for i, vote_id in enumerate(votes):
                summary, row = render_summary("vote", vote_id, cur)
                if summary:
                    body = getattr(summary, "text", str(summary))
                    publish_summary("vote", vote_id, body)
                    published_votes += 1
                if i > 0 and i % 100 == 0:
                    print(f"  ... {i}/{len(votes)}")
                    
            print("Processing bills...")
            published_bills = 0
            for i, bill_id in enumerate(bills):
                summary, row = render_summary("bill", bill_id, cur)
                if summary:
                    body = getattr(summary, "text", str(summary))
                    publish_summary("bill", bill_id, body)
                    published_bills += 1
                if i > 0 and i % 100 == 0:
                    print(f"  ... {i}/{len(bills)}")
                    
    finally:
        conn.close()

    print(f"Done! Published {published_votes} vote summaries and {published_bills} bill summaries.")

if __name__ == "__main__":
    main()
