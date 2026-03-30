import psycopg2
from psycopg2.extras import execute_values
import os
import re

# --- Configuration ---
DB_DSN = os.getenv("DB_DSN") 

def get_smart_id(title):
    """
    Extracts the Project ID with priority logic.
    Priority 1: Current Term (XVP-...)
    Priority 2: Previous Term (XIVP-...)
    """
    if not title: return None
    
    # Regex for 15th Term (2024-2028) and 14th Term (2020-2024)
    prio_pattern = r"(XVP-\d+(?:\(\d+\))?|XIVP-\d+(?:\(\d+\))?)"
    
    matches = re.findall(prio_pattern, title)
    
    if matches:
        # Return the LAST match (usually the explicit project one)
        return matches[-1]
        
    return None

def run_repair():
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    
    print("Fetching votes with ambiguous Project IDs...")
    cur.execute("SELECT id, title, project_id FROM votes WHERE title IS NOT NULL")
    rows = cur.fetchall()
    
    updates = []
    
    for vid, title, old_pid in rows:
        new_pid = get_smart_id(title)
        
        # Only update if we found a "Smart ID" and it's different
        if new_pid and new_pid != old_pid:
            updates.append((new_pid, vid))
            
    if updates:
        print(f"Applying fixes to {len(updates)} votes...")
        # Efficient batch update using JOIN to values list
        sql = """
            UPDATE votes AS v 
            SET project_id = u.new_pid 
            FROM (VALUES %s) AS u(new_pid, vote_id) 
            WHERE v.id = u.vote_id
        """
        execute_values(cur, sql, updates)
        conn.commit()
        print("Success: Database patched.")
    else:
        print("No extraction improvements found.")
        
    conn.close()

if __name__ == "__main__":
    run_repair()
