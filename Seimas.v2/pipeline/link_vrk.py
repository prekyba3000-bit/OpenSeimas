"""Link politicians to their VRK 2024 candidate ID — the key everything else in
this family (assets, interests) is keyed on.

Matched on (name, nominating party), not name alone. Verified against the live
VRK candidate list on 2026-09-06: of ~1,740 candidate rows, **5 pairs of
distinct people share a normalized name** (e.g. two different candidates both
named "Rasa Tamošiūnienė"). Matching by name alone — the previous version of
this script — would silently pick whichever one happened to load last into a
dict, and this table backs personal financial declarations: a wrong link
attaches one real person's income, loans and family employer relationships to
a different real person's public profile. Adding the nominating party as a
second key produces zero collisions across the same candidate list, because
`politicians.nominating_party` is populated for all 148 members (migration
039) and VRK's own candidate rows carry the same field.

Ambiguous or unmatched MPs are reported, never guessed at.
"""
import os
import re
import unicodedata

import psycopg2
from bs4 import BeautifulSoup
from psycopg2.extras import execute_values

from utils import fetch_with_retry

DB_DSN = os.getenv("DB_DSN")

ELECTION_ID = "1544"
ROUND_ID = "1870"
VRK_HTML_URL = (
    f"https://www.vrk.lt/statiniai/puslapiai/rinkimai/{ELECTION_ID}/rnk{ROUND_ID}"
    "/kandidatai/SeiKandidataiPilnasSarasas.html"
)

# VRK's own field for a candidate with no nominating party. Two of our 148
# members are self-nominated ("Išsikėlė pats"); mapped to the same empty
# string so both sides of the join agree on what "no party" looks like.
_SELF_NOMINATED = "išsikėlė pats"


def normalize_name(text: str) -> str:
    if not text:
        return ""
    stripped = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return " ".join(stripped.lower().split())


def normalize_party(text: str) -> str:
    """Comparable across VRK's HTML and our own column.

    Diacritics are kept — Lithuanian party names differ only by them in some
    cases, and collapsing them the way normalize_name does would reintroduce
    the collision risk this script exists to remove. Only punctuation that
    the two sources spell differently for the SAME party is unified: our own
    `nominating_party` column carries "Tėvynės sąjunga – Lietuvos krikščionys
    demokratai" (en dash, spaced) for some rows and "Tėvynės sąjunga-Lietuvos
    krikščionys demokratai" (hyphen, unspaced) for others — a pre-existing
    inconsistency in that column, not introduced here.
    """
    if not text or text.strip().lower() == _SELF_NOMINATED:
        return ""
    t = text.lower().strip()
    t = t.replace("–", "-").replace("—", "-")
    t = t.replace("„", '"').replace('"', '"')
    t = re.sub(r"\s*-\s*", "-", t)
    return " ".join(t.split())


def fetch_vrk_candidates() -> list[dict]:
    """Every candidate row: id, name, and BOTH of the row's party fields.

    The table header is `Sąrašas` (the multi-mandate list, column 1) and
    `Iškėlė vienmandatėje` (who nominated them specifically in their
    single-mandate district, column 5). These are genuinely different facts —
    a coalition ("Taikos koalicija...") can be the list while a single
    constituent party is the single-mandate nomination — and a candidate who
    ran in only one mode leaves the other blank. Keeping both, rather than
    picking one column, is what lets a match succeed against whichever of the
    two happens to be the value this project already stores.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    resp = fetch_with_retry(VRK_HTML_URL, headers=headers)
    # html.parser rather than lxml: this venv has never had lxml installed,
    # which is further evidence this script had never actually been run.
    soup = BeautifulSoup(resp.content, "html.parser")

    candidates = []
    for link in soup.find_all("a", href=re.compile(r"rkndId-\d+")):
        match = re.search(r"rkndId-(\d+)", link["href"])
        if not match:
            continue
        row = link.find_parent("tr")
        if row is None:
            continue
        cells = [c.get_text(strip=True) for c in row.find_all("td")]
        raw_name = re.sub(r"\s*\(.*?\)", "", link.get_text(strip=True))
        candidates.append(
            {
                "rink_kand_id": match.group(1),
                "name": raw_name,
                "list_party": cells[1] if len(cells) > 1 else "",
                "district_party": cells[5] if len(cells) > 5 else "",
            }
        )
    return candidates


def build_index(candidates: list[dict]) -> tuple[dict, dict]:
    """(name, party) -> vrk_id for EITHER of the row's two party fields,
    plus the name-only collision set for the report."""
    by_key: dict[tuple[str, str], set[str]] = {}
    by_name: dict[str, set[str]] = {}
    for cand in candidates:
        name_key = normalize_name(cand["name"])
        by_name.setdefault(name_key, set()).add(cand["rink_kand_id"])
        # Index every distinct party_key this candidate's two fields produce,
        # including "" (self-nominated / independent) — that is a real,
        # comparable value, not a missing one. Skipping it here is what broke
        # matching for independents: VRK spells it "Išsikėlė pats" in the
        # district-party field, the same literal text our own column uses,
        # and normalize_party maps both to "" on purpose so they compare
        # equal — a guard that then discarded "" undid that.
        seen_keys = {normalize_party(f) for f in (cand["list_party"], cand["district_party"])}
        for party_key in seen_keys:
            by_key.setdefault((name_key, party_key), set()).add(cand["rink_kand_id"])

    name_collisions = {k: v for k, v in by_name.items() if len(v) > 1}
    return by_key, name_collisions


def link_identities() -> None:
    if not DB_DSN:
        raise SystemExit("DB_DSN not set")

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    cur.execute(
        "SELECT id, full_name_normalized, nominating_party FROM politicians "
        "WHERE vrk_candidate_id IS NULL"
    )
    mps = cur.fetchall()
    print(f"Attempting to link {len(mps)} unlinked politicians...")

    candidates = fetch_vrk_candidates()
    print(f"Loaded {len(candidates)} candidate rows from VRK.")

    by_key, name_collisions = build_index(candidates)
    if name_collisions:
        print(
            f"  {len(name_collisions)} normalized name(s) are shared by more than "
            f"one candidate on the VRK list — matching on name+party to avoid "
            f"picking one arbitrarily:"
        )
        for name, ids in sorted(name_collisions.items()):
            print(f"    {name}: {sorted(ids)}")

    updates = []
    unmatched = []
    for mp_id, mp_name, mp_party in mps:
        name_key = normalize_name(mp_name)
        party_key = normalize_party(mp_party or "")
        ids = by_key.get((name_key, party_key))

        if not ids and len(name_key.split()) == 2:
            # "jonas jonaitis" vs the source's "jonaitis jonas" — kept from the
            # original script, but still gated on the party matching.
            first, last = name_key.split()
            ids = by_key.get((f"{last} {first}", party_key))

        if not ids:
            # A compound surname on one side only — our own records hold
            # "dalia asanaviciute-gruzauskiene" where VRK's candidacy filing
            # (and photo caption) reads "Dalia ASANAVIČIŪTĖ" alone. Match when
            # the given name agrees and every surname token on the shorter
            # side is a prefix of some token on the longer side, still gated
            # on the party matching either row's party field.
            our_tokens = name_key.split()
            candidates_by_party = [
                (cand_name, ids_) for (cand_name, p), ids_ in by_key.items()
                if p == party_key
            ]
            hits = set()
            for cand_name, ids_ in candidates_by_party:
                cand_tokens = cand_name.split()
                if not cand_tokens or cand_tokens[0] != our_tokens[0]:
                    continue
                shorter, longer = sorted([our_tokens[1:], cand_tokens[1:]], key=len)
                if shorter and all(
                    any(lt.startswith(st) or st.startswith(lt) for lt in longer)
                    for st in shorter
                ):
                    hits |= ids_
            if hits:
                ids = hits

        if ids and len(ids) == 1:
            updates.append((next(iter(ids)), str(mp_id)))
        elif ids and len(ids) > 1:
            # Should be impossible given name+party produced zero collisions
            # in the 2026-09-06 measurement, but a future election list could
            # differ — refuse rather than pick one.
            unmatched.append((mp_name, mp_party, f"ambiguous: {sorted(ids)}"))
        else:
            unmatched.append((mp_name, mp_party, "no candidate row matched"))

    if updates:
        execute_values(
            cur,
            """
            UPDATE politicians AS p
            SET vrk_candidate_id = v.vrk_id
            FROM (VALUES %s) AS v(vrk_id, id)
            WHERE p.id = v.id::uuid
            """,
            updates,
        )
        conn.commit()
        print(f"SUCCESS: linked {len(updates)} politicians to a VRK candidate id.")
    else:
        print("No new links found.")

    if unmatched:
        print(f"{len(unmatched)} politician(s) not linked (reported, not guessed):")
        for name, party, reason in unmatched:
            print(f"    {name} ({party}): {reason}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    link_identities()
