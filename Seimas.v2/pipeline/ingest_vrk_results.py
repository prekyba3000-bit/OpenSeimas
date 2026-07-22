"""
Ingest 2024 Seimas election results from VRK open data.

Source: https://atviriduomenys.vrk.lt/datasets/gov/vrk/Rezultatai
The dataset is per-polling-station per-candidate. We aggregate by candidate
across all stations and write per-MP election context into politicians:

  - election_type: 'single_mandate' if the MP has personal vote rows in
    Rezultatai (saraso_id IS NULL), else 'multimandate' (won purely via
    party list, no individual apygarda race).
  - constituency_number / constituency_name: dominant apygarda (the one
    where they got the most votes). NULL for multimandate.
  - vote_share: for single_mandate, candidate's share of valid single-
    mandate ballots in that apygarda. For multimandate, their party's
    national list share. Stored as a fraction in [0, 1].
  - vrk_election_id: 2150 (2024 Seimas I turas).

Caveats:
  - The PirmumoBalsai (preference votes) dataset has no 2024 Seimas data
    yet, so we can't compute per-candidate preference vote share within a
    party list. Multimandate vote_share = party's list share.
  - Isrinkti (elected) dataset is also missing 2024 Seimas, so we infer
    election_type from presence of Rezultatai rows rather than from an
    authoritative VRK seat-allocation record.
  - II turas (rink_turo_id=2148) currently returns 3 rows from the API —
    likely incomplete publication. We use I turas only.
"""

import os
import sys
import json
from collections import defaultdict
from urllib.request import Request, urlopen

import psycopg2

DB_DSN = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")
VRK_API = "https://atviriduomenys.vrk.lt/datasets/gov/vrk/Rezultatai/:format/jsonl"
ELECTION_ID = 2150  # 2024 Seimas I turas

# politicians.current_party uses LRS frakcija names (e.g., "...frakcija");
# VRK's saraso_pavad omits "frakcija". Map by stable substring.
PARTY_KEY_TO_VRK_NEEDLE = {
    "socialdemokratų": "socialdemokratų partija",
    "Tėvynės sąjungos": "Tėvynės sąjunga",
    "Nemuno aušros": "Nemuno Aušra",
    "Liberalų": "Liberalų sąjūdis",
    "Demokratų": "Demokratų sąjunga",
    "valstiečių": "valstiečių",
}


def fetch_rezultatai():
    """Fetch the full I-turas dataset as a list of dicts."""
    url = (
        f"{VRK_API}?rink_turo_id={ELECTION_ID}"
        "&select(rink_kandidato_id,saraso_id,saraso_pavad,apyg_nr,apyg_pavad,balsu_viso)"
        "&limit(60000)"
    )
    req = Request(url, headers={"User-Agent": "OpenSeimas/1.0 (transparency project)"})
    with urlopen(req, timeout=180) as resp:
        return [json.loads(line) for line in resp if line.strip()]


def aggregate(rows):
    """
    Returns:
      candidate_apyg[cid] = {apyg_nr: votes}
      candidate_apyg_names[cid] = {apyg_nr: name}
      apyg_total[apyg_nr] = sum of all single-mandate votes there
      party_total[saraso_pavad] = total party-list votes nationally
    """
    candidate_apyg = defaultdict(lambda: defaultdict(int))
    candidate_apyg_names = defaultdict(dict)
    apyg_total = defaultdict(int)
    party_total = defaultdict(int)

    for r in rows:
        cid = r.get("rink_kandidato_id")
        sid = r.get("saraso_id")
        apyg = r.get("apyg_nr")
        votes = r.get("balsu_viso") or 0

        if cid and sid is None:
            # Single-mandate row.
            candidate_apyg[cid][apyg] += votes
            candidate_apyg_names[cid][apyg] = r.get("apyg_pavad")
            apyg_total[apyg] += votes
        elif sid is not None and cid is None and r.get("saraso_pavad"):
            party_total[r["saraso_pavad"]] += votes

    return candidate_apyg, candidate_apyg_names, apyg_total, party_total


def party_share(current_party, party_total):
    """Resolve LRS frakcija name → VRK saraso name → national share, or None."""
    if not current_party or current_party == "Unknown":
        return None
    national = sum(party_total.values()) or 1
    for needle_lt, needle_vrk in PARTY_KEY_TO_VRK_NEEDLE.items():
        if needle_lt in current_party:
            for saraso, votes in party_total.items():
                if needle_vrk in saraso:
                    return votes / national
    return None


def main():
    if not DB_DSN:
        print("ERROR: DB_DSN not set")
        sys.exit(1)

    print(f"Fetching VRK Rezultatai for rink_turo_id={ELECTION_ID}…")
    rows = fetch_rezultatai()
    print(f"  {len(rows)} rows")

    candidate_apyg, candidate_apyg_names, apyg_total, party_total = aggregate(rows)
    print(
        f"  {len(candidate_apyg)} single-mandate candidates, "
        f"{len(apyg_total)} apygardas, "
        f"{len(party_total)} parties"
    )

    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, vrk_candidate_id, current_party
                FROM politicians
                WHERE is_active = TRUE AND vrk_candidate_id IS NOT NULL
                """
            )
            mps = cur.fetchall()
            print(f"  matching {len(mps)} active MPs with vrk_candidate_id…")

            updated_sm = 0
            updated_mm = 0
            unresolved = 0
            for mp_uuid, vrk_id_str, current_party in mps:
                try:
                    vrk_id = int(vrk_id_str)
                except (TypeError, ValueError):
                    continue

                if vrk_id in candidate_apyg:
                    # Single-mandate run — pick dominant apygarda.
                    by_apyg = candidate_apyg[vrk_id]
                    dominant = max(by_apyg.items(), key=lambda kv: kv[1])
                    apyg_nr, votes = dominant
                    apyg_name = candidate_apyg_names[vrk_id][apyg_nr]
                    share = votes / apyg_total[apyg_nr] if apyg_total[apyg_nr] else None
                    cur.execute(
                        """
                        UPDATE politicians SET
                            election_type = 'single_mandate',
                            constituency_number = %s,
                            constituency_name = %s,
                            vote_share = %s,
                            vrk_election_id = %s
                        WHERE id = %s
                        """,
                        (apyg_nr, apyg_name, share, ELECTION_ID, mp_uuid),
                    )
                    updated_sm += 1
                else:
                    # No single-mandate rows — multimandate-only winner.
                    share = party_share(current_party, party_total)
                    cur.execute(
                        """
                        UPDATE politicians SET
                            election_type = 'multimandate',
                            constituency_number = NULL,
                            constituency_name = NULL,
                            vote_share = %s,
                            vrk_election_id = %s
                        WHERE id = %s
                        """,
                        (share, ELECTION_ID, mp_uuid),
                    )
                    updated_mm += 1
                    if share is None:
                        unresolved += 1

            conn.commit()
    finally:
        conn.close()

    print(f"  single_mandate: {updated_sm}")
    print(f"  multimandate:   {updated_mm}")
    print(f"  multimandate unresolved party share: {unresolved}")


if __name__ == "__main__":
    main()
