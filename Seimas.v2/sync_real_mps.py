#!/usr/bin/env python3
"""
MISSION: REALITY SYNC - Photo Sync & Ghost Buster Engine
Purpose: Fetch real MP photos, filter inactive MPs, update database
"""
import os
import re
import sys
import aiohttp
import psycopg2
import asyncio
import unidecode
from datetime import datetime
import defusedxml.ElementTree as ET

DB_DSN = os.getenv('DB_DSN')
if not DB_DSN:
    print("ERROR: DB_DSN environment variable not set")
    sys.exit(1)

API_BASE = "https://apps.lrs.lt/sip/p2b"
PHOTO_BASE = "https://www.lrs.lt/SIPIS/sn_foto/2024"

async def fetch_mps_from_api():
    """Fetch all MPs from LRS API"""
    url = f"{API_BASE}.ad_seimo_nariai"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    print(f"API error: {resp.status}")
                    return None
                
                content = await resp.text()
                return content
        except Exception as e:
            print(f"API fetch error: {e}")
            return None

def parse_mps_from_xml(xml_content):
    """Parse MPs from XML response, checking for data_iki to determine active status"""
    mps = []
    
    try:
        root = ET.fromstring(xml_content)
        
        # Navigate to MP records - LRS API uses SeimoNarys elements
        for mp_elem in root.findall('.//SeimoNarys'):
            try:
                asmens_id = mp_elem.get('asmens_id', '').strip()
                vardas = mp_elem.get('vardas', '').strip()
                pavarde = mp_elem.get('pavardė', '').strip()
                display_name = f"{vardas} {pavarde}".strip()
                data_nuo = mp_elem.get('data_nuo', '').strip()
                data_iki = mp_elem.get('data_iki', '').strip()
                
                if not asmens_id or not display_name:
                    continue
                
                # Determine if active: if data_iki is set and in the past, they're inactive
                is_active = True
                if data_iki:
                    try:
                        # Parse date (format: YYYY-MM-DD)
                        end_date = datetime.strptime(data_iki, '%Y-%m-%d')
                        is_active = end_date > datetime.now()
                    except ValueError:
                        pass
                
                # Extract party: prefer faction from Pareigos, fallback to iškėlusi_partija
                party = 'Unknown'
                for pareigos in mp_elem.findall('Pareigos'):
                    pad = pareigos.get('padalinio_pavadinimas', '')
                    role = pareigos.get('pareigos', '')
                    if 'frakcij' in pad.lower() or 'frakcij' in role.lower():
                        party = pad
                        break
                if party == 'Unknown':
                    party = mp_elem.get('iškėlusi_partija', '') or 'Unknown'

                slug = unidecode.unidecode(f"{vardas} {pavarde}").lower().strip()
                slug = re.sub(r"[^a-z0-9]+", "_", slug).strip("_")
                photo_url = f"{PHOTO_BASE}/{slug}.jpg"
                
                mps.append({
                    'asmens_id': asmens_id,
                    'display_name': display_name,
                    'photo_url': photo_url,
                    'is_active': is_active,
                    'data_nuo': data_nuo,
                    'data_iki': data_iki,
                    'party': party,
                })
            except Exception as e:
                print(f"  Warning: Failed to parse MP record: {e}")
                continue
        
        return mps
    except ET.ParseError as e:
        print(f"XML parse error: {e}")
        return []

def update_politicians_in_db(mps):
    """Update politicians table with fetched data"""
    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        
        # Update with fetched data
        update_data = [
            (
                mp['photo_url'],
                mp['is_active'],
                mp.get('party', 'Unknown'),
                int(mp['asmens_id'])
            )
            for mp in mps
        ]
        
        if update_data:
            sql = """
            UPDATE politicians 
            SET photo_url = %s, is_active = %s, current_party = %s, last_synced_at = NOW()
            WHERE seimas_mp_id = %s
            """
            
            for item in update_data:
                cur.execute(sql, item)
            
            conn.commit()
            print(f"✅ Updated {len(update_data)} MP records")
        
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Database update error: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_ghost_mps():
    """Remove inactive MPs who never voted (< 5 votes)"""
    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        
        # Delete inactive MPs with few votes
        delete_sql = """
        DELETE FROM politicians 
        WHERE is_active = FALSE 
        AND (SELECT COUNT(*) FROM mp_votes WHERE mp_id = politicians.id) < 5
        """
        
        cur.execute(delete_sql)
        deleted_count = cur.rowcount
        conn.commit()
        
        print(f"🧹 Removed {deleted_count} ghost MPs (inactive with <5 votes)")
        
        cur.close()
        conn.close()
        return deleted_count
    except Exception as e:
        print(f"❌ Cleanup error: {e}")
        return 0

def count_active_mps():
    """Count active MPs remaining"""
    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM politicians WHERE is_active = TRUE")
        active_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM politicians")
        total_count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return active_count, total_count
    except Exception as e:
        print(f"❌ Count error: {e}")
        return 0, 0

async def main():
    """Main sync pipeline"""
    print("=" * 60)
    print("MISSION: REALITY SYNC - Phase 2")
    print("=" * 60)
    
    # Step 1: Apply migration
    print("\n📋 STEP 1: Database Migration")
    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        
        with open('migration_reality.sql', 'r') as f:
            migration_sql = f.read()
        
        # Split and execute each statement
        for statement in migration_sql.split(';'):
            statement = statement.strip()
            if statement:
                cur.execute(statement)
        
        conn.commit()
        print("✅ Migration applied")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return
    
    # Step 2: Fetch MPs
    print("\n📡 STEP 2: Fetching MPs from LRS API...")
    xml_content = await fetch_mps_from_api()
    if not xml_content:
        print("❌ Failed to fetch MPs from API")
        return
    
    # Step 3: Parse and extract
    print("🔍 STEP 3: Parsing MPs...")
    mps = parse_mps_from_xml(xml_content)
    print(f"✅ Found {len(mps)} MPs in API response")
    
    # Step 4: Update database
    print("\n💾 STEP 4: Updating database...")
    if not update_politicians_in_db(mps):
        print("❌ Failed to update database")
        return
    
    # Step 5: Cleanup ghosts
    print("\n👻 STEP 5: Cleanup - Removing ghost MPs...")
    deleted = cleanup_ghost_mps()
    
    # Step 6: Final count
    print("\n📊 STEP 6: Final Status")
    active, total = count_active_mps()
    print(f"Active MPs: {active}")
    print(f"Total MPs: {total}")
    
    print("\n" + "=" * 60)
    print("✅ MISSION COMPLETE: REALITY SYNC")
    print("=" * 60)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
        sys.exit(1)
