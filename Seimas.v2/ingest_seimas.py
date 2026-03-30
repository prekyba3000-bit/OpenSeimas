import re
import requests
import psycopg2
from psycopg2.extras import execute_values
import unidecode
import os
import defusedxml.ElementTree as ET
from datetime import datetime
from utils import fetch_with_retry

DB_DSN = os.getenv("DB_DSN") 
SEIMAS_API_URL = "https://apps.lrs.lt/sip/p2b.ad_seimo_nariai"
FACTIONS_API_URL = "https://apps.lrs.lt/sip/p2b.ad_seimo_frakcijos"
PHOTO_BASE = "https://www.lrs.lt/SIPIS/sn_foto/2024"

def normalize(name):
    if not name: return ""
    clean = unidecode.unidecode(name).lower().strip()
    return " ".join(clean.split())

def build_photo_url(first_name, last_name):
    """Build photo URL from name: 'Agnė' 'Bilotaitė' -> agne_bilotaite.jpg"""
    slug = unidecode.unidecode(f"{first_name} {last_name}").lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "_", slug).strip("_")
    return f"{PHOTO_BASE}/{slug}.jpg"

def parse_date(date_str):
    if not date_str: return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def get_attr(node, candidates):
    for key in candidates:
        val = node.get(key)
        if val is not None and str(val).strip() != "":
            return str(val).strip()
    return None


def fetch_factions_map() -> dict[str, str]:
    print(f"Fetching factions XML from {FACTIONS_API_URL}...")
    response = fetch_with_retry(FACTIONS_API_URL, timeout=30)
    root = ET.fromstring(response.content)
    factions: dict[str, str] = {}

    for node in root.findall(".//*"):
        faction_id = get_attr(node, ("padalinio_id", "frakcijos_id", "frakcija_id", "id"))
        faction_name = get_attr(
            node,
            ("padalinio_pavadinimas", "pavadinimas", "frakcija", "name"),
        )
        if faction_id and faction_name:
            factions[faction_id] = faction_name

    print(f"Resolved {len(factions)} faction IDs.")
    return factions


def is_committee_role(role_name: str, department_name: str) -> bool:
    role_val = (role_name or "").lower()
    dep_val = (department_name or "").lower()
    role_keywords = ("pirminink", "pavaduotoj", "narys", "member", "chair", "deputy")
    committee_keywords = ("komitet", "committee")
    has_role = any(keyword in role_val for keyword in role_keywords)
    has_committee = any(keyword in dep_val for keyword in committee_keywords)
    return has_role and has_committee


def normalize_committee_role(role_name: str) -> str:
    role_val = (role_name or "").lower()
    if "pirminink" in role_val and "pavaduotoj" not in role_val:
        return "Chair"
    if "pavaduotoj" in role_val or "deputy" in role_val:
        return "Deputy Chair"
    return "Member"

def sync_db():
    if not DB_DSN:
        print("ERROR: DB_DSN environment variable not set.")
        return

    factions_map = fetch_factions_map()

    print(f"Fetching XML from {SEIMAS_API_URL}...")
    response = fetch_with_retry(SEIMAS_API_URL, timeout=30)
    root = ET.fromstring(response.content)
    
    mps = []
    committee_rows = []
    active_count = 0
    
    # Adjusted to match actual API response which uses CamelCase and Lithuanian diacritics
    for node in root.findall('.//SeimoNarys'):
        # API uses 'asmens_id' not 'sn_id'
        mp_id = node.get('asmens_id')
        if not mp_id: continue
        
        # 'pavardė' has a dot/special char on e
        full_name = f"{node.get('vardas')} {node.get('pavardė')}"
        
        # LOGIC: If 'data_iki' exists, mandate has ended.
        data_iki = node.get('data_iki')
        term_end = parse_date(data_iki)
        is_active = term_end is None
        
        if is_active: active_count += 1
        
        mp_faction_id = get_attr(node, ("frakcijos_id", "frakcija_id", "fakcijos_id"))
        party = get_attr(node, ("iškėlusi_partija", "iskelusi_partija", "partija")) or 'Unknown'
        if mp_faction_id and mp_faction_id in factions_map:
            party = factions_map[mp_faction_id]

        for pareigos in node.findall('Pareigos'):
            role_name = pareigos.get('pareigos')
            department_name = pareigos.get('padalinio_pavadinimas')
            department_id = get_attr(pareigos, ("padalinio_id", "frakcijos_id", "frakcija_id"))
            department_type = (pareigos.get("padalinio_tipas") or "").lower()

            if "frakc" in department_type and department_id and department_id in factions_map:
                party = factions_map[department_id]

            role_norm = (role_name or "").lower()
            if "frakcijos nar" in role_norm:
                if department_id and department_id in factions_map:
                    party = factions_map[department_id]
                elif department_name:
                    party = department_name

            if is_committee_role(role_name or "", department_name or ""):
                committee_rows.append((
                    mp_id,
                    department_name or "Unknown committee",
                    normalize_committee_role(role_name or ""),
                    parse_date(pareigos.get('data_nuo')),
                    parse_date(pareigos.get('data_iki')),
                    pareigos.get('pareigu_id') or pareigos.get('id') or role_name,
                ))
        
        first_name = node.get('vardas') or ''
        last_name = node.get('pavardė') or ''
        photo_url = build_photo_url(first_name, last_name)
        bio = "" # Bio requires separate fetch or child node
        
        mps.append((
            normalize(full_name),
            full_name,
            mp_id,
            party,
            is_active,
            term_end,
            photo_url,
            bio
        ))
        
    print(f"Found {active_count} active MPs out of {len(mps)} total records.")
    
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    
    sql = """
        INSERT INTO politicians (
            full_name_normalized, display_name, seimas_mp_id, current_party, is_active, term_end_date, photo_url, bio
        ) VALUES %s
        ON CONFLICT (seimas_mp_id) DO UPDATE SET
            current_party = EXCLUDED.current_party,
            is_active = EXCLUDED.is_active,
            term_end_date = EXCLUDED.term_end_date,
            photo_url = EXCLUDED.photo_url;
    """
    
    execute_values(cur, sql, mps)
    if committee_rows:
        mp_ext_ids = [row[2] for row in mps]
        cur.execute(
            """
            SELECT id, seimas_mp_id
            FROM politicians
            WHERE seimas_mp_id = ANY(%s::int[])
            """,
            (mp_ext_ids,),
        )
        id_map = {str(row[1]): str(row[0]) for row in cur.fetchall()}
        committee_payload = [
            (
                id_map[ext_mp_id],
                committee_name,
                role,
                start_date,
                end_date,
                source_duty_id
            )
            for ext_mp_id, committee_name, role, start_date, end_date, source_duty_id in committee_rows
            if ext_mp_id in id_map
        ]

        if committee_payload:
            mp_uuid_list = sorted({row[0] for row in committee_payload})
            cur.execute(
                """
                DELETE FROM committee_memberships
                WHERE mp_id = ANY(%s::uuid[])
                """,
                (mp_uuid_list,),
            )
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name='committee_memberships'
                """
            )
            committee_columns = {row[0] for row in cur.fetchall()}
            if "source_duty_id" in committee_columns:
                execute_values(
                    cur,
                    """
                    INSERT INTO committee_memberships (
                        mp_id, committee_name, role, start_date, end_date, source_duty_id
                    ) VALUES %s
                    """,
                    committee_payload
                )
            else:
                stripped_payload = [row[:5] for row in committee_payload]
                execute_values(
                    cur,
                    """
                    INSERT INTO committee_memberships (
                        mp_id, committee_name, role, start_date, end_date
                    ) VALUES %s
                    """,
                    stripped_payload
                )

    print("Refreshing mp_stats_summary after party updates...")
    cur.execute("REFRESH MATERIALIZED VIEW mp_stats_summary")

    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    sync_db()
