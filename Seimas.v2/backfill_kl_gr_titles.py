"""Backfill 'Klausimų grupė' placeholder titles in votes table.

Refetches each affected sitting's agenda (eiga), resolves the group-id ->
sibling-children mapping, and UPDATEs only votes whose title is the placeholder.

Idempotent. Safe to re-run.
"""
import os
import re
import sys
import time
import requests
import defusedxml.ElementTree as ET
import psycopg2

DB_DSN = os.getenv("DB_DSN")
BASE_URL = "https://apps.lrs.lt/sip/p2b"
TERM_ID = "10"


def fetch_xml(url, retries=2):
    for attempt in range(retries + 1):
        try:
            r = requests.get(url, timeout=30)
            if r.status_code == 200:
                return ET.fromstring(r.content)
        except Exception as e:
            if attempt == retries:
                print(f"  ! fetch failed after retries: {url} ({e})")
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def resolve_titles_for_sitting(sit_id):
    """Return {seimas_vote_id: (resolved_title, project_id)} for placeholder votes."""
    agenda = fetch_xml(f"{BASE_URL}.ad_seimo_posedzio_eiga_full?posedzio_id={sit_id}")
    if agenda is None:
        return {}

    kl_gr_children = {}
    for q in agenda.findall(".//darbotvarkes-klausimas"):
        kg = q.get("kl_gr_id")
        pav = (q.findtext("pavadinimas") or "").strip()
        if kg and pav and pav != "Klausimų grupė":
            kl_gr_children.setdefault(kg, []).append((
                (q.findtext("nr") or "").strip(),
                pav,
                q.get("registracijos_nr"),
            ))

    out = {}
    for q in agenda.findall(".//darbotvarkes-klausimas"):
        pav = (q.findtext("pavadinimas") or "").strip()
        if pav != "Klausimų grupė":
            continue
        kg = q.get("kl_gr_id")
        nr = (q.findtext("nr") or "").strip()
        children = kl_gr_children.get(kg, [])
        if children:
            joined = " • ".join(c[1] for c in children)
            new_title = f"Klausimų grupė ({nr}): {joined}" if nr else f"Klausimų grupė: {joined}"
            project_id = next((rn for _, _, rn in children if rn), None)
        elif nr:
            new_title = f"Klausimų grupė (Nr. {nr})"
            project_id = None
        else:
            continue

        for b in q.findall(".//balsavimas"):
            vid = b.get("bals_id") or b.get("balsavimo_id")
            if vid:
                out[vid] = (new_title, project_id)
    return out


def main():
    if not DB_DSN:
        print("DB_DSN not set", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(DB_DSN)
    conn.autocommit = False

    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT sitting_date
            FROM votes
            WHERE title = 'Klausimų grupė'
            ORDER BY sitting_date
        """)
        affected_dates = [row[0] for row in cur.fetchall()]

    print(f"Affected sittings: {len(affected_dates)} dates")

    sessions_root = fetch_xml(f"{BASE_URL}.ad_seimo_sesijos?kadencijos_id={TERM_ID}")
    if sessions_root is None:
        print("Failed to fetch sessions"); sys.exit(1)
    session_ids = [s.get("sesijos_id") for s in sessions_root.findall(".//SeimoSesija") if s.get("sesijos_id")]

    sittings_by_date = {}
    for sess_id in session_ids:
        s_root = fetch_xml(f"{BASE_URL}.ad_seimo_posedziai?sesijos_id={sess_id}")
        if s_root is None:
            continue
        for p in s_root.findall(".//SeimoPosėdis"):
            sit_id = p.get("posėdžio_id")
            pradzia = p.get("pradžia") or ""
            m = re.match(r"(\d{4}-\d{2}-\d{2})", pradzia)
            if sit_id and m:
                sittings_by_date.setdefault(m.group(1), []).append(sit_id)
        time.sleep(0.4)

    total_updated = 0
    total_seen_placeholder_votes = 0

    for d in affected_dates:
        sit_ids = sittings_by_date.get(str(d), [])
        if not sit_ids:
            print(f"  {d}: no sitting id mapping found, skipping")
            continue

        merged = {}
        for sit_id in sit_ids:
            merged.update(resolve_titles_for_sitting(sit_id))
            time.sleep(0.4)

        if not merged:
            print(f"  {d}: 0 resolvable placeholder votes")
            continue

        with conn.cursor() as cur:
            cur.execute("""
                SELECT seimas_vote_id FROM votes
                WHERE sitting_date = %s AND title = 'Klausimų grupė'
            """, (d,))
            placeholder_vids = {str(r[0]) for r in cur.fetchall()}
            total_seen_placeholder_votes += len(placeholder_vids)

            updates = [(t, p, vid) for vid, (t, p) in merged.items() if vid in placeholder_vids]
            if updates:
                cur.executemany("""
                    UPDATE votes
                    SET title = %s,
                        project_id = COALESCE(project_id, %s)
                    WHERE seimas_vote_id = %s
                """, updates)
                total_updated += cur.rowcount if cur.rowcount > 0 else len(updates)
            conn.commit()

        unresolved = len(placeholder_vids) - sum(1 for vid in placeholder_vids if vid in merged)
        resolved_with_real_title = sum(
            1 for vid in placeholder_vids
            if vid in merged and not merged[vid][0].startswith("Klausimų grupė (Nr.")
        )
        print(f"  {d}: {len(updates)} updated, {resolved_with_real_title} with real titles, {unresolved} unresolved")

    print(f"\nDone. {total_updated} rows updated across {total_seen_placeholder_votes} placeholder votes seen.")


if __name__ == "__main__":
    main()
