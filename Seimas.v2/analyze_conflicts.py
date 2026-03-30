import psycopg2
import os

def analyze_lrt_conflicts():
    db_dsn = os.getenv("DB_DSN")
    if not db_dsn:
        print("DB_DSN not set.")
        return

    conn = psycopg2.connect(db_dsn)
    cur = conn.cursor()

    # The LRT vote we identified: -55102
    vote_id = -55102
    
    print("\n=== 🕵️ CONFLICT ANALYZER: LRT Law (47-47 Tie) ===")
    print("Searching for MPs with substantial securities/art stake who voted.\n")

    query = """
    SELECT 
        p.display_name,
        p.current_party,
        mv.vote_choice,
        a.securities_art_jewelry_eur,
        a.mandatory_assets_eur,
        a.cash_deposits_eur
    FROM politicians p
    JOIN mp_votes mv ON p.id = mv.politician_id
    JOIN mp_assets a ON p.id = a.politician_id
    WHERE mv.vote_id = %s
    AND a.year = 2023
    ORDER BY a.securities_art_jewelry_eur DESC
    LIMIT 10;
    """
    
    cur.execute(query, (vote_id,))
    results = cur.fetchall()

    if not results:
        print("No matching data found. Ensure assets are ingested for these MPs.")
        return

    print(f"{'MP Name':<25} | {'Party':<20} | {'Vote':<6} | {'Securities (€)':<15}")
    print("-" * 75)
    for name, party, vote, securities, mandatory, cash in results:
        print(f"{name:<25} | {party[:20]:<20} | {vote:<6} | {securities:,.2f} €")

    print("\n[NOTE] Significant 'Securities/Art' holdings can indicate private media interests.")
    print("Next Step: Link to VMI detailed interest declarations (ID-001).")

    cur.close()
    conn.close()

if __name__ == "__main__":
    analyze_lrt_conflicts()
