"""
Parse interests.description (VRK declaration JSON) into structured org fields.

Background: every interests row was originally written with organization_name
hard-coded to "VRK Import (Raw)"; the actual declaration data sits inside
description as a JSON object with one or more interest types per row. The
declaration JSON puts each form's field labels on a base key ("Darbovietė",
"Ryšys", "Ryšys sudarius sandorį") and the actual values on a sibling
"<base>.N" key.

Three org-bearing forms appear in the data; field indices differ between them,
so we drive the parser off the labels rather than fixed positions:

  Darbovietė               kodas → idx 3, pavadinimas → idx 2
  Ryšys                    kodas → idx 3, pavadinimas → idx 2
  Ryšys sudarius sandorį   no kodas; pavadinimas → idx 3 (counterparty name)

Other rows in the table are non-org metadata (submission date, candidate
profile blob, "Kiti duomenys ar aplinkybės" free-text) and stay NULL.

Idempotent: re-running overwrites with the same parsed values. We never
touch interests.organization_name (the original "VRK Import (Raw)" sentinel) —
that's preserved as audit trail; downstream code should read
parsed_organization_name + organization_code instead.
"""

import json
import os
import re
import sys
from collections import Counter

import psycopg2

DB_DSN = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")

# Match field labels (case- and accent-insensitive) without hard-coding a
# numeric index. "kodas" alone is too loose (e.g. "Pareigų pobūdis kodas"
# would match), but in the declaration schemas only "Juridinio asmens kodas"
# uses the word, so we anchor on that phrase.
KODAS_RE = re.compile(r"juridinio\s+asmens\s+kodas", re.IGNORECASE)
# "pavadinimas" is the canonical name field across all three forms; the
# transaction form uses "Kitos sandorio šalies pavadinimas" which still
# matches.
PAVADINIMAS_RE = re.compile(r"pavadinimas", re.IGNORECASE)

# Lithuanian legal-entity codes are exactly 9 digits. Filter out anything
# that came through as free text, an empty string, or a date.
KODAS_VALID_RE = re.compile(r"^\d{9}$")


def _normalize_code(value):
    if value is None:
        return None
    s = str(value).strip()
    if KODAS_VALID_RE.match(s):
        return s
    return None


def _normalize_name(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in ("null", "none", "-"):
        return None
    return s


def _find_indices(label_dict):
    """Given the label dict (e.g. {"0":"Darbdavys","2":"Pavadinimas",...}),
    return (kodas_idx_or_None, pavadinimas_idx_or_None)."""
    kodas_idx = None
    pavadinimas_idx = None
    for idx, label in label_dict.items():
        if not isinstance(label, str):
            continue
        if kodas_idx is None and KODAS_RE.search(label):
            kodas_idx = idx
        elif pavadinimas_idx is None and PAVADINIMAS_RE.search(label):
            pavadinimas_idx = idx
    return kodas_idx, pavadinimas_idx


def parse_description(desc):
    """
    Returns (org_code, org_name, category, interest_type) where:
      category is one of:
        "code_and_name"  — both fields populated
        "name_only"      — name populated, no code (transaction counterparty,
                           or fizinis-asmuo employer where kodas isn't required)
        "code_only"      — code populated but no readable name (rare)
        "metadata"       — declaration metadata, no org info expected
        "unparseable"    — invalid JSON or recognized form with empty fields
                           (e.g. anonymized natural-person counterparty)
      interest_type is the base key (e.g. "Darbovietė", "Ryšys") for org-
        bearing rows, "<metadata>" for numeric-only declaration profile rows,
        "<other>" for free-text forms ("Kiti duomenys ar aplinkybės"), and
        "<invalid>" for JSON-decode failures.
    """
    if not desc:
        return None, None, "unparseable", "<invalid>"
    try:
        d = json.loads(desc)
    except (TypeError, ValueError):
        return None, None, "unparseable", "<invalid>"
    if not isinstance(d, dict):
        return None, None, "unparseable", "<invalid>"

    top_keys = list(d.keys())
    by_base = {}  # base_name → list of "base.N" instance keys, sorted by N.
    for k in top_keys:
        if "." in k:
            base, _, suffix = k.partition(".")
            if base in d and suffix.isdigit():
                by_base.setdefault(base, []).append((int(suffix), k))

    if not by_base:
        # Numeric-only keys = declaration profile metadata. Anything else
        # without instance keys (e.g. "Kiti duomenys ar aplinkybės" free
        # text) we tag separately so the breakdown stays honest.
        if all(k.isdigit() for k in top_keys):
            return None, None, "metadata", "<metadata>"
        return None, None, "metadata", "<other>"

    # If multiple bases coexist in one row, take the first that yields any
    # extracted value (declaration order).
    for base, instances in by_base.items():
        labels = d.get(base)
        if not isinstance(labels, dict):
            continue
        kodas_idx, name_idx = _find_indices(labels)
        instances.sort()
        _, value_key = instances[0]
        values = d.get(value_key)
        if not isinstance(values, dict):
            continue

        code = _normalize_code(values.get(kodas_idx)) if kodas_idx else None
        name = _normalize_name(values.get(name_idx)) if name_idx else None

        if code and name:
            return code, name, "code_and_name", base
        if name and not code:
            return None, name, "name_only", base
        if code and not name:
            return code, None, "code_only", base
        return None, None, "unparseable", base

    return None, None, "unparseable", "<other>"


def main():
    if not DB_DSN:
        print("ERROR: DB_DSN not set")
        sys.exit(1)

    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, description FROM interests")
            rows = cur.fetchall()
            print(f"Parsing {len(rows)} interests rows…")

            # by_type[interest_type][category] = count
            by_type = {}
            updates = []
            for row_id, desc in rows:
                code, name, cat, itype = parse_description(desc)
                by_type.setdefault(itype, Counter())[cat] += 1
                if code is not None or name is not None:
                    updates.append((code, name, row_id))

            cur.executemany(
                """
                UPDATE interests
                SET organization_code = %s,
                    parsed_organization_name = %s
                WHERE id = %s
                """,
                updates,
            )
            conn.commit()
    finally:
        conn.close()

    total = sum(sum(c.values()) for c in by_type.values())
    print(f"\n  total rows seen: {total}")
    print(f"  rows updated:    {len(updates)}")
    print()
    print("  Per-type breakdown:")
    print(f"  {'type':<35} {'code+name':>10} {'name_only':>10} "
          f"{'code_only':>10} {'metadata':>10} {'unparse':>10}  total")
    print(f"  {'-' * 35} {'-' * 10} {'-' * 10} {'-' * 10} {'-' * 10} {'-' * 10}  -----")
    # Sort: org-bearing types first (by total desc), then meta sentinels.
    org_types = [t for t in by_type if not t.startswith("<")]
    meta_types = [t for t in by_type if t.startswith("<")]
    for itype in (sorted(org_types, key=lambda t: -sum(by_type[t].values())) + meta_types):
        c = by_type[itype]
        line_total = sum(c.values())
        print(f"  {itype:<35} {c['code_and_name']:>10} {c['name_only']:>10} "
              f"{c['code_only']:>10} {c['metadata']:>10} {c['unparseable']:>10}  {line_total}")


if __name__ == "__main__":
    main()
