import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def analyze_loyalty():
    db_dsn = os.getenv("DB_DSN")
    if not db_dsn:
        print("ERROR: DB_DSN not set.")
        return

    print(">>> Analyzing Party Loyalty (Rebel Detection)...")
    
    conn = psycopg2.connect(db_dsn)
    cur = conn.cursor()

    # Revised Rebel Detection:
    # 1. Total votes per MP (where they voted 'Uz' or 'Pries')
    # 2. Percentage of those votes that were against the party majority
    rebel_summary_query = """
    WITH party_consensus AS (
        SELECT 
            v.seimas_vote_id as vote_id,
            p.current_party,
            mv.vote_choice,
            COUNT(*) as choice_count,
            RANK() OVER (PARTITION BY v.seimas_vote_id, p.current_party ORDER BY COUNT(*) DESC) as rank
        FROM votes v
        JOIN mp_votes mv ON v.seimas_vote_id = mv.vote_id
        JOIN politicians p ON mv.politician_id = p.id
        WHERE mv.vote_choice IN ('Už', 'Prieš')
        GROUP BY v.seimas_vote_id, p.current_party, mv.vote_choice
    ),
    dominant_choice AS (
        SELECT vote_id, current_party, vote_choice as party_majority
        FROM party_consensus
        WHERE rank = 1
    ),
    rebel_votes AS (
        SELECT 
            p.id as politician_id,
            p.display_name,
            p.current_party,
            COUNT(*) as rebel_count
        FROM mp_votes mv
        JOIN politicians p ON mv.politician_id = p.id
        JOIN dominant_choice dc ON mv.vote_id = dc.vote_id AND p.current_party = dc.current_party
        WHERE mv.vote_choice != dc.party_majority
        AND mv.vote_choice IN ('Už', 'Prieš')
        GROUP BY p.id, p.display_name, p.current_party
    ),
    total_active_votes AS (
        SELECT politician_id, COUNT(*) as total_count
        FROM mp_votes
        WHERE vote_choice IN ('Už', 'Prieš')
        GROUP BY politician_id
    )
    SELECT 
        rv.display_name,
        rv.current_party,
        rv.rebel_count,
        tav.total_count,
        ROUND(CAST(rv.rebel_count AS NUMERIC) / tav.total_count * 100, 2) as rebel_pct
    FROM rebel_votes rv
    JOIN total_active_votes tav ON rv.politician_id = tav.politician_id
    ORDER BY rebel_pct DESC
    LIMIT 10;
    """
    
    cur.execute(rebel_summary_query)
    rows = cur.fetchall()

    print(f"\n| {'MP Name':<25} | {'Party':<20} | {'Rebel Votes':<12} | {'Ratio %':<10} |")
    print("|" + "-"*27 + "|" + "-"*22 + "|" + "-"*14 + "|" + "-"*12 + "|")
    
    for name, party, count, total, pct in rows:
        print(f"| {name:<25} | {party:<20} | {count}/{total:<5} | {pct:<10}% |")

    cur.close()
    conn.close()

if __name__ == "__main__":
    analyze_loyalty()
