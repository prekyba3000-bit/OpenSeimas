"""
Ingest OpenSanctions LT Seimas dataset to resolve Unknown-party MPs and DOB.

Source: https://data.opensanctions.org/datasets/latest/lt_seimas/
  - entities.ftm.json — FollowTheMoney entities. We use the Person rows
    (141 current MPs) for QID, English party label, and the LRS sourceUrl
    that embeds p_asm_id (= our seimas_mp_id).
  - targets.simple.csv — flat row per Person; gives us birth_date keyed by
    the same QID.

Update policy:
  - open_sanctions_id  → set unconditionally for every matched MP.
  - date_of_birth      → set only when currently NULL (don't clobber).
  - current_party      → overwrite only when current value is 'Unknown' AND
    OpenSanctions' English label maps to a known LRS frakcija name. This
    leaves the LRS-scraped current_party authoritative for the 94 MPs we
    already had identified, and uses OS only as a *fill* for the 47
    Unknown-party MPs.

The English→Lithuanian party map is hand-curated against the seven labels
that appear in the dataset for the 2024-2028 term. If OpenSanctions adds new
labels (e.g. after a fraction split), update PARTY_EN_TO_LT below.
"""

import csv
import io
import json
import os
import re
import sys
from urllib.request import Request, urlopen

import psycopg2

DB_DSN = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")
DATASET_BASE = "https://data.opensanctions.org/datasets/latest/lt_seimas"
FTM_URL = f"{DATASET_BASE}/entities.ftm.json"
CSV_URL = f"{DATASET_BASE}/targets.simple.csv"

# Maps OpenSanctions English party labels to the LRS frakcija strings already
# stored in politicians.current_party. Keys must match OS labels verbatim
# (including the en-dash and curly quotes).
PARTY_EN_TO_LT = {
    "Lithuanian Social Democratic Party Political Group":
        "Lietuvos socialdemokratų partijos frakcija",
    "Homeland Union – Lithuanian Christian Democrat Political Group":
        "Tėvynės sąjungos-Lietuvos krikščionių demokratų frakcija",
    "Nemunas Dawn Political Group":
        "„Nemuno aušros“ frakcija",
    "Political Group of Democrats ‘For Lithuania’":
        "Demokratų frakcija „Vardan Lietuvos“",
    # NB: the LRS value has a double space between "Liberalų" and "sąjūdžio".
    "Liberals Movement Political Group":
        "Liberalų  sąjūdžio frakcija",
    "Political Group of the Lithuanian Farmers and Greens Union and the Christian Families Alliance":
        "Lietuvos valstiečių, žaliųjų ir Krikščioniškų šeimų sąjungos frakcija",
    "Non-attached Members":
        "Mišri Seimo narių grupė",
}

P_ASM_ID_RE = re.compile(r"p_asm_id=(\d+)")


def fetch(url):
    req = Request(url, headers={"User-Agent": "OpenSeimas/1.0 (transparency project)"})
    with urlopen(req, timeout=120) as resp:
        return resp.read()


def parse_ftm(blob):
    """Returns {seimas_mp_id (int): {qid, party_en, party_lt_or_none}}."""
    out = {}
    unmapped_parties = set()
    for line in blob.splitlines():
        if not line.strip():
            continue
        d = json.loads(line)
        if d.get("schema") != "Person":
            continue
        qid = d["id"]
        props = d.get("properties", {})
        mp_id = None
        for url in props.get("sourceUrl", []):
            m = P_ASM_ID_RE.search(url)
            if m:
                mp_id = int(m.group(1))
                break
        if mp_id is None:
            continue
        party_en = (props.get("political") or [None])[0]
        party_lt = PARTY_EN_TO_LT.get(party_en)
        if party_en and not party_lt:
            unmapped_parties.add(party_en)
        out[mp_id] = {"qid": qid, "party_en": party_en, "party_lt": party_lt}
    return out, unmapped_parties


def parse_csv(blob):
    """Returns {qid: birth_date_iso} for rows with a birth_date."""
    text = blob.decode("utf-8")
    out = {}
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        bd = row.get("birth_date")
        if bd:
            out[row["id"]] = bd
    return out


def main():
    if not DB_DSN:
        print("ERROR: DB_DSN not set")
        sys.exit(1)

    print(f"Fetching {FTM_URL}…")
    ftm_blob = fetch(FTM_URL)
    print(f"Fetching {CSV_URL}…")
    csv_blob = fetch(CSV_URL)

    by_mp_id, unmapped = parse_ftm(ftm_blob)
    dob_by_qid = parse_csv(csv_blob)
    print(f"  OpenSanctions: {len(by_mp_id)} Persons w/ p_asm_id, "
          f"{len(dob_by_qid)} with DOB")
    if unmapped:
        print(f"  WARN unmapped EN parties (need PARTY_EN_TO_LT entry): {sorted(unmapped)}")

    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, seimas_mp_id, current_party, date_of_birth
                FROM politicians
                WHERE is_active = TRUE AND seimas_mp_id IS NOT NULL
                """
            )
            mps = cur.fetchall()
            print(f"  matching against {len(mps)} active MPs")

            qid_set = 0
            dob_set = 0
            party_resolved = 0
            party_unresolved_unknown = 0
            no_os_match = 0

            for mp_uuid, seimas_id, current_party, current_dob in mps:
                os_row = by_mp_id.get(seimas_id)
                if not os_row:
                    no_os_match += 1
                    continue

                qid = os_row["qid"]
                party_lt = os_row["party_lt"]
                dob = dob_by_qid.get(qid)

                fields = ["open_sanctions_id = %s"]
                values = [qid]
                qid_set += 1

                if current_dob is None and dob:
                    fields.append("date_of_birth = %s")
                    values.append(dob)
                    dob_set += 1

                if current_party in (None, "Unknown"):
                    if party_lt:
                        fields.append("current_party = %s")
                        values.append(party_lt)
                        party_resolved += 1
                    else:
                        party_unresolved_unknown += 1

                values.append(mp_uuid)
                cur.execute(
                    f"UPDATE politicians SET {', '.join(fields)} WHERE id = %s",
                    values,
                )

            conn.commit()
    finally:
        conn.close()

    print(f"  open_sanctions_id set:       {qid_set}")
    print(f"  date_of_birth filled:        {dob_set}")
    print(f"  current_party resolved:      {party_resolved}")
    print(f"  Unknown w/o OS party label:  {party_unresolved_unknown}")
    print(f"  no OpenSanctions match:      {no_os_match}")


if __name__ == "__main__":
    main()
