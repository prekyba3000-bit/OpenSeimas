"""Draft summaries for all votes and bills; approval is a separate human action."""
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
SUMMARY_DRAFT_SECRET = os.environ.get("SUMMARY_DRAFT_SECRET")

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

def draft_summary(entity_type: str, entity_id: str, body_lt: str):
    headers = {"Authorization": f"Bearer {SUMMARY_DRAFT_SECRET}"}

    rev_payload = {
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "body_lt": body_lt,
        "editor": "System (Initial Batch)",
        "note": "Initial generation from verified pipeline; awaiting independent approval."
    }

    post_with_retry(f"{API_URL}/admin/summaries", rev_payload, headers)


def main():
    if not SUMMARY_DRAFT_SECRET:
        print("Error: SUMMARY_DRAFT_SECRET environment variable is required.")
        sys.exit(1)
    print(f"Drafting to {API_URL}...")
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # 1. Fetch all votes that are NOT yet published
            cur.execute("""
                SELECT v.id FROM votes v 
                WHERE NOT EXISTS (
                    SELECT 1 FROM summary_revisions sr 
                    WHERE sr.entity_type = 'vote' AND sr.entity_id = v.id::text
                      AND sr.approved_at IS NOT NULL
                )
            """)
            votes = [str(r["id"]) for r in cur.fetchall()]
            
            # 2. Fetch all bills that are NOT yet published
            cur.execute("""
                SELECT l.project_id FROM legislation l
                WHERE NOT EXISTS (
                    SELECT 1 FROM summary_revisions sr 
                    WHERE sr.entity_type = 'bill' AND sr.entity_id = l.project_id
                      AND sr.approved_at IS NOT NULL
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
            drafted_votes = 0
            for i, vote_id in enumerate(votes):
                summary, row = render_summary("vote", vote_id, cur)
                if summary:
                    body = getattr(summary, "text", str(summary))
                    draft_summary("vote", vote_id, body)
                    drafted_votes += 1
                if i > 0 and i % 100 == 0:
                    print(f"  ... {i}/{len(votes)}")
                    
            print("Processing bills...")
            drafted_bills = 0
            for i, bill_id in enumerate(bills):
                summary, row = render_summary("bill", bill_id, cur)
                if summary:
                    body = getattr(summary, "text", str(summary))
                    draft_summary("bill", bill_id, body)
                    drafted_bills += 1
                if i > 0 and i % 100 == 0:
                    print(f"  ... {i}/{len(bills)}")
                    
    finally:
        conn.close()

    print(f"Done! Drafted {drafted_votes} vote summaries and {drafted_bills} bill summaries.")
    print("A separate approver must review and approve the drafts before they become public.")

if __name__ == "__main__":
    main()
