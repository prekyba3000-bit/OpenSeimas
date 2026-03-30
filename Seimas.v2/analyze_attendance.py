import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def analyze_attendance():
    db_dsn = os.getenv("DB_DSN")
    if not db_dsn:
        print("ERROR: DB_DSN not set.")
        return

    print(">>> Analyzing MP Attendance Patterns...")
    
    conn = psycopg2.connect(db_dsn)
    cur = conn.cursor()

    # Calculate attendance percentage per MP
    # We define attendance as NOT 'Nedalyvavo' (Did not participate)
    query = """
    SELECT 
        p.display_name,
        p.current_party,
        COUNT(mv.id) as total_votes,
        COUNT(CASE WHEN mv.vote_choice != 'Nedalyvavo' THEN 1 END) as attended_votes,
        ROUND(CAST(COUNT(CASE WHEN mv.vote_choice != 'Nedalyvavo' THEN 1 END) AS NUMERIC) / COUNT(mv.id) * 100, 2) as attendance_pct
    FROM politicians p
    JOIN mp_votes mv ON p.id = mv.politician_id
    GROUP BY p.id, p.display_name, p.current_party
    HAVING COUNT(mv.id) > 0
    ORDER BY attendance_pct DESC;
    """
    
    cur.execute(query)
    rows = cur.fetchall()

    print(f"\n| {'MP Name':<30} | {'Party':<20} | {'Attendance %':<12} |")
    print("|" + "-"*32 + "|" + "-"*22 + "|" + "-"*14 + "|")
    
    for name, party, total, attended, pct in rows[:10]:
        print(f"| {name:<30} | {party:<20} | {pct:<12}% |")

    print("\n... and more. Top 10 displayed.")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    analyze_attendance()
