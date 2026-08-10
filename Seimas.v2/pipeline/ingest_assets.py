import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
import os
import re

# VRK 2024 Seimas Election IDs
ELECTION_ID = "1544"
ROUND_ID = "1870"
BASE_URL = "https://rezultatai.vrk.lt/statiniai/puslapiai/rinkimai/1544/rnk1870/kandidatai/"

def get_db_connection():
    return psycopg2.connect(os.getenv("DB_DSN"))

def scrape_assets(vrk_id):
    url = f"{BASE_URL}KandidatasTurtoPajDekl_rkndId-{vrk_id}.html"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        return None
    
    soup = BeautifulSoup(resp.content, 'lxml')
    
    # We expect a table with specific labels
    # Category I: Privalomas registruoti turtas
    # Category II: Vertybiniai popieriai...
    # Category III: Piniginės lėšos
    # Category IV: Suteiktos paskolos
    # Category V: Gautos paskolos
    
    data = {
        "mandatory": 0.0,
        "securities": 0.0,
        "cash": 0.0,
        "loans_granted": 0.0,
        "loans_received": 0.0,
        "total_income": 0.0
    }
    
    def parse_eur(text):
        if not text: return 0.0
        # Clean: "123 456,78 EUR" -> "123456.78"
        clean = re.sub(r'[^\d,]', '', text).replace(',', '.')
        try:
            return float(clean)
        except:
            return 0.0

    # Look for the table cells
    cells = soup.find_all('td')
    for i, cell in enumerate(cells):
        text = cell.get_text(strip=True)
        if "I. Privalomas registruoti turtas" in text and i+1 < len(cells):
            data["mandatory"] = parse_eur(cells[i+1].get_text())
        elif "II. Vertybiniai popieriai" in text and i+1 < len(cells):
            data["securities"] = parse_eur(cells[i+1].get_text())
        elif "III. Piniginės lėšos" in text and i+1 < len(cells):
            data["cash"] = parse_eur(cells[i+1].get_text())
        elif "IV. Suteiktos paskolos" in text and i+1 < len(cells):
            data["loans_granted"] = parse_eur(cells[i+1].get_text())
        elif "V. Gautos paskolos" in text and i+1 < len(cells):
            data["loans_received"] = parse_eur(cells[i+1].get_text())
        elif "Deklaruota apmokestinamųjų ir neapmokestinamųjų pajamų suma" in text and i+1 < len(cells):
            data["total_income"] = parse_eur(cells[i+1].get_text())
            
    return data

def main():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Get MPs involved in the LRT tie-breaker or all unlinked ones
    cur.execute("""
        SELECT id, vrk_candidate_id, display_name 
        FROM politicians 
        WHERE vrk_candidate_id IS NOT NULL 
        AND id NOT IN (SELECT politician_id FROM mp_assets WHERE year = 2023);
    """)
    mps = cur.fetchall()
    
    print(f">>> Processing assets for {len(mps)} MPs...")
    
    asset_records = []
    for p_id, vrk_id, name in mps:
        print(f"Scraping assets for: {name} ({vrk_id})")
        assets = scrape_assets(vrk_id)
        if assets:
            asset_records.append((
                p_id, 
                2023, 
                assets["mandatory"], 
                assets["securities"], 
                assets["cash"], 
                assets["loans_granted"], 
                assets["loans_received"],
                assets["total_income"]
            ))
            
    if asset_records:
        sql = """
        INSERT INTO mp_assets 
        (politician_id, year, mandatory_assets_eur, securities_art_jewelry_eur, cash_deposits_eur, loans_granted_eur, loans_received_eur, total_income_eur)
        VALUES %s
        ON CONFLICT (politician_id, year) DO UPDATE SET
            mandatory_assets_eur = EXCLUDED.mandatory_assets_eur,
            securities_art_jewelry_eur = EXCLUDED.securities_art_jewelry_eur,
            cash_deposits_eur = EXCLUDED.cash_deposits_eur,
            loans_granted_eur = EXCLUDED.loans_granted_eur,
            loans_received_eur = EXCLUDED.loans_received_eur,
            total_income_eur = EXCLUDED.total_income_eur;
        """
        execute_values(cur, sql, asset_records)
        conn.commit()
        print(f"SUCCESS: Ingested {len(asset_records)} asset declarations.")
    else:
        print("No new assets to ingest.")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
