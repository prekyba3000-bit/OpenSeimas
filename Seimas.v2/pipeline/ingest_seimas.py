import re
import requests
import psycopg2
from psycopg2.extras import execute_values
import unidecode
import os
import defusedxml.ElementTree as ET
from datetime import datetime
from utils import fetch_with_retry
from pipeline.common import SNAPSHOT_PARSER_VERSION, record_snapshot

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


_pending_snapshots: list[tuple[str, str, bytes]] = []


def _capture(source: str, url: str, payload: bytes) -> bytes:
    """Hold raw bytes for the manifest. Returns them unchanged."""
    _pending_snapshots.append((source, url, payload))
    return payload


def flush_snapshots(conn) -> int:
    """Write held payloads to snapshot_manifest. Returns rows written."""
    written = 0
    while _pending_snapshots:
        source, url, payload = _pending_snapshots.pop(0)
        manifest_id, digest, unchanged = record_snapshot(
            conn, source, url, payload, parser_version=SNAPSHOT_PARSER_VERSION,
        )
        if manifest_id is not None:
            written += 1
            print(f"snapshot {source} {digest[:12]}… {len(payload)} bytes"
                  f"{' (unchanged)' if unchanged else ''}")
    return written


def fetch_factions_map() -> dict[str, str]:
    print(f"Fetching factions XML from {FACTIONS_API_URL}...")
    response = fetch_with_retry(FACTIONS_API_URL, timeout=30)
    root = ET.fromstring(_capture("seimas_factions", FACTIONS_API_URL, response.content))
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


# The factions feed exposes an umbrella node named "Seimo frakcijos" alongside
# the real factions. It is a container, not a group anyone belongs to.
_FACTION_UMBRELLA = {"seimo frakcijos"}


def resolve_faction(node, factions_map: dict[str, str]) -> str | None:
    """The member's CURRENT parliamentary group, or None.

    Matches on the department name rather than the role string. The role string
    was the original bug: it tested for "frakcijos nar" (Frakcijos narys/narė)
    and so missed "Frakcijos seniūnas" and "Frakcijos seniūno pavaduotojas",
    dropping the 10 faction leaders and deputies back onto their nominating
    party. `padalinio_tipas` cannot be used either — it is empty on every
    Pareigos row in the live feed.

    Roles carrying a `data_iki` are skipped: they have ended. Without that, the
    Speaker would keep the faction he left on 2025-09-10.

    Returns None when the member sits in no group. That is a real state, not a
    lookup failure, and it must reach the surface as unknown rather than as
    whoever nominated them.
    """
    for pareigos in node.findall('Pareigos'):
        if pareigos.get('data_iki'):
            continue
        department_name = (pareigos.get('padalinio_pavadinimas') or '').strip()
        if not department_name or department_name.lower() in _FACTION_UMBRELLA:
            continue
        low = department_name.lower()
        # „Mišri Seimo narių grupė" is a parliamentary group like any faction,
        # and does not carry the word frakcija.
        if 'frakcij' not in low and 'mišri' not in low:
            continue
        department_id = get_attr(pareigos, ("padalinio_id", "frakcijos_id", "frakcija_id"))
        name = factions_map.get(department_id or '', department_name)
        # The factions feed itself spells one name with a double space; two
        # entries differing only by whitespace would render as two factions.
        return re.sub(r'\s+', ' ', name).strip()
    return None


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
    root = ET.fromstring(_capture("seimas_members", SEIMAS_API_URL, response.content))
    
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
        # Mandate window — attendance is measured only over sitting days a
        # member could actually attend (migration 019).
        mandate_start = parse_date(node.get('data_nuo'))
        mandate_end = term_end
        
        if is_active: active_count += 1
        
        nominating_party = get_attr(
            node, ("iškėlusi_partija", "iskelusi_partija", "partija")
        ) or None
        party = resolve_faction(node, factions_map)

        for pareigos in node.findall('Pareigos'):
            role_name = pareigos.get('pareigos')
            department_name = pareigos.get('padalinio_pavadinimas')

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
            nominating_party,
            is_active,
            term_end,
            photo_url,
            bio,
            mandate_start,
            mandate_end
        ))
        
    print(f"Found {active_count} active MPs out of {len(mps)} total records.")
    
    conn = psycopg2.connect(DB_DSN)
    flush_snapshots(conn)
    cur = conn.cursor()
    
    sql = """
        INSERT INTO politicians (
            full_name_normalized, display_name, seimas_mp_id, current_party, nominating_party, is_active, term_end_date, photo_url, bio,
            mandate_start_date, mandate_end_date
        ) VALUES %s
        ON CONFLICT (seimas_mp_id) DO UPDATE SET
            current_party = EXCLUDED.current_party,
            nominating_party = EXCLUDED.nominating_party,
            is_active = EXCLUDED.is_active,
            term_end_date = EXCLUDED.term_end_date,
            photo_url = EXCLUDED.photo_url,
            mandate_start_date = EXCLUDED.mandate_start_date,
            mandate_end_date = EXCLUDED.mandate_end_date,
            last_synced_at = NOW();
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
