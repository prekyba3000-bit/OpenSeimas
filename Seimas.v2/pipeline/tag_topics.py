"""Deterministic topic tagging for votes and legislation (V.4 "Tau" engine).

Tags every vote/bill title with 0..N of 8 everyday-life topic categories
using case-insensitive Lithuanian keyword stems (substring matching, which
covers inflection: "mokesč" matches mokesčiai/mokesčių/mokesčiams).

Only votes that are untagged or whose title changed since tagging
(detected via a stored md5 hash of the normalized title, since `votes`
has no updated_at column) are rewritten. Running twice produces no
changes; a vote whose tags would change is deleted and re-inserted.

Usage:
    DB_DSN=postgresql://... python -m pipeline.cli tag_topics
    DB_DSN=postgresql://... python pipeline/tag_topics.py --retag-all
"""
import argparse
import hashlib
import os
import re
import sys

import psycopg2
from psycopg2.extras import execute_values

# --- Configuration ---
DB_DSN = os.getenv("DB_DSN")

# Topic dictionary: slug -> Lithuanian label + keyword stems.
# Stems are matched case-insensitively as substrings of the normalized
# title, so a stem like "mokesč" covers all case forms (mokesčio,
# mokesčių, mokesčiams, ...). Keep stems long enough to avoid false
# positives (e.g. "saugumo", not "saug", which would hit "saugaus eismo").
TOPICS = {
    "bustas": {
        "label_lt": "Būstas",
        "terms": [
            "būst", "hipotek", "nekilnojam", "daugiabut", "renovac",
            "nuoma", "nuomos", "butų", "butams", "komunalin", "šildym",
            "sodinink", "bustinink", "patalpų",
        ],
    },
    "pajamos": {
        "label_lt": "Pajamos ir mokesčiai",
        "terms": [
            "mokesč", "pajamų", "atlyginim", "alga", "algų", "pensij",
            "pašalp", "sodr", "socialin", "minimali", "indeksavim",
            "išmok", "kompensac", "muit", "akciz", "biudžet", "finansin",
            "užimtum", "nedarb", "darbo kodeks", "rinkliav", "bank",
            "kredit", "šeimos", "vaik",
        ],
    },
    "sveikata": {
        "label_lt": "Sveikata",
        "terms": [
            "sveikat", "ligonin", "gydym", "gydytoj", "vaist", "medicin",
            "medik", "psich", "pacient", "reabilitac", "odontolog",
            "slaug", "epidemi", "skiep", "vakcin", "tabak", "alkohol",
            "farmak", "narkotik",
        ],
    },
    "svietimas": {
        "label_lt": "Švietimas",
        "terms": [
            "švietim", "mokykl", "mokytoj", "mokymo", "mokin",
            "universitet", "studij", "student", "daržel", "ikimokykl",
            "gimnazij", "moksl", "stipend", "profesinio mokymo",
            "kolegij", "pedagog", "ugdym", "vadovėl",
        ],
    },
    "transportas": {
        "label_lt": "Transportas",
        "terms": [
            "keli", "geležinkel", "automobil", "transport", "eismo",
            "oro uost", "aviac", "uost", "vairuotoj", "kelion",
            "traukin", "autobus", "greitkel", "laivyb", "rail baltica",
        ],
    },
    "saugumas": {
        "label_lt": "Saugumas ir gynyba",
        "terms": [
            "krašto apsaug", "gynyb", "kariuomen", "karišk", "policij",
            "teisėtvark", "sien", "nusikaltim", "baudžiam", "žvalgyb",
            "saugumo", "teror", "kibernetin", "migrac", "priešgaisrin",
            "civilinės saugos", "pareigūn", "karo",
        ],
    },
    "aplinka": {
        "label_lt": "Aplinka",
        "terms": [
            "aplink", "klimat", "atliek", "mišk", "vanden", "tarš",
            "terš", "atsinaujinanč", "energetik", "energij", "elektros",
            "gamtos", "atomin", "biologin", "želdyn", "medžiokl", "duj",
        ],
    },
    "valdymas": {
        "label_lt": "Valdymas ir teisingumas",
        "terms": [
            "konstituc", "rinkim", "referendum", "teism", "teisėj",
            "teisingum", "savivald", "administrac", "korupc", "prokuratūr",
            "vyriausyb", "ministerij", "ministr", "valstybės kontrol",
            "viešųjų pirkim", "konkurenc", "statut", "žmogaus teisi",
            "demokratij", "diplomat",
        ],
    },
}

_WS_RE = re.compile(r"\s+")


def normalize_title(title):
    """Lowercase and collapse whitespace so matching is deterministic."""
    if not title:
        return ""
    return _WS_RE.sub(" ", title.strip().lower())


def match_topics(title):
    """Return {slug: [matched_terms]} for a vote/bill title (0..N topics)."""
    text = normalize_title(title)
    hits = {}
    for slug, cfg in TOPICS.items():
        matched = [t for t in cfg["terms"] if t in text]
        if matched:
            hits[slug] = matched
    return hits


def title_hash(title):
    """md5 of the normalized title; stored to detect title changes."""
    return hashlib.md5(normalize_title(title).encode("utf-8")).hexdigest()


def plan_tagging(records, existing_hashes):
    """Decide what to write. Pure function — unit-testable, no DB.

    records:         [(ref_id, title), ...]
    existing_hashes: {ref_id: title_hash} from the topics table

    Returns (ids_to_delete, rows_to_insert) where rows are
    (ref_id, topic, matched_terms, title_hash). Empty when nothing
    changed — that is what makes repeated runs idempotent.
    """
    to_delete = []
    to_insert = []
    for ref_id, title in records:
        h = title_hash(title)
        if existing_hashes.get(ref_id) == h:
            continue  # already tagged from this exact title
        tags = match_topics(title)
        if ref_id in existing_hashes:
            to_delete.append(ref_id)  # title changed -> drop stale tags
        for topic in sorted(tags):
            to_insert.append((ref_id, topic, tags[topic], h))
    return to_delete, to_insert


def apply_tags(cur, topics_table, id_col, to_delete, to_insert):
    """Apply a tagging plan to the DB (stale deletes, then batch insert)."""
    if to_delete:
        cur.execute(
            f"DELETE FROM {topics_table} WHERE {id_col} = ANY(%s)",
            (to_delete,),
        )
    if to_insert:
        execute_values(
            cur,
            f"INSERT INTO {topics_table} ({id_col}, topic, matched_terms, title_hash) "
            "VALUES %s ON CONFLICT DO NOTHING",
            to_insert,
        )


def tag_table(cur, table, topics_table, id_col, retag_all=False):
    """Tag one entity table; return a per-topic count dict for the summary."""
    cur.execute(f"SELECT {id_col}, title FROM {table} WHERE title IS NOT NULL")
    records = cur.fetchall()

    existing_hashes = {}
    if not retag_all:
        cur.execute(f"SELECT {id_col}, title_hash FROM {topics_table}")
        for ref_id, h in cur.fetchall():
            existing_hashes[ref_id] = h
    else:
        cur.execute(f"DELETE FROM {topics_table}")

    to_delete, to_insert = plan_tagging(records, existing_hashes)
    apply_tags(cur, topics_table, id_col, to_delete, to_insert)

    counts = {slug: 0 for slug in TOPICS}
    for _, topic, _, _ in to_insert:
        counts[topic] += 1
    return {
        "scanned": len(records),
        "retagged": len(to_delete),
        "inserted": len(to_insert),
        "per_topic": counts,
    }


def table_exists(cur, name):
    cur.execute("SELECT to_regclass(%s);", (f"public.{name}",))
    return cur.fetchone()[0] is not None


def run(retag_all=False):
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2
    conn = psycopg2.connect(DB_DSN)
    try:
        with conn:
            with conn.cursor() as cur:
                print("Tagging votes...")
                stats = tag_table(cur, "votes", "vote_topics", "vote_id", retag_all)
                print(
                    f"  > scanned {stats['scanned']} votes, "
                    f"re-tagged {stats['retagged']}, "
                    f"inserted {stats['inserted']} topic rows."
                )
                for slug, n in stats["per_topic"].items():
                    if n:
                        print(f"    {slug:<12} ({TOPICS[slug]['label_lt']}): {n}")

                if table_exists(cur, "legislation") and table_exists(cur, "legislation_topics"):
                    print("Tagging legislation...")
                    stats = tag_table(
                        cur, "legislation", "legislation_topics", "project_id", retag_all
                    )
                    print(
                        f"  > scanned {stats['scanned']} bills, "
                        f"re-tagged {stats['retagged']}, "
                        f"inserted {stats['inserted']} topic rows."
                    )
                else:
                    print("  > legislation tables not present, skipping.")
    finally:
        conn.close()
    print("SUCCESS: topic tagging complete.")
    return 0


def main(args=None):
    parser = argparse.ArgumentParser(description="Tag votes/legislation with topics")
    parser.add_argument(
        "--retag-all",
        action="store_true",
        help="drop all existing tags and recompute from scratch",
    )
    parsed = parser.parse_args(args)
    return run(retag_all=parsed.retag_all)


if __name__ == "__main__":
    sys.exit(main())
