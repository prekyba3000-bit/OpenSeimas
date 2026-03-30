#!/usr/bin/env python3
"""One-time fix: update all MP photo URLs to use the working SIPIS endpoint."""
import os
import re
import psycopg2
import unidecode

DB_DSN = os.getenv("DB_DSN")
PHOTO_BASE = "https://www.lrs.lt/SIPIS/sn_foto/2024"

def main():
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    cur.execute("SELECT id, display_name FROM politicians WHERE display_name IS NOT NULL")
    rows = cur.fetchall()
    updated = 0

    for pid, name in rows:
        slug = unidecode.unidecode(name).lower().strip()
        slug = re.sub(r"[^a-z0-9]+", "_", slug).strip("_")
        new_url = f"{PHOTO_BASE}/{slug}.jpg"
        cur.execute("UPDATE politicians SET photo_url = %s WHERE id = %s", (new_url, pid))
        updated += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Updated {updated} MP photo URLs")

if __name__ == "__main__":
    main()
