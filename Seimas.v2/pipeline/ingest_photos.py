"""Set MP photos from Wikimedia Commons (via Wikidata).

lrs.lt serves its MP portraits with `Cross-Origin-Resource-Policy: same-origin`,
so browsers refuse to show them on any other site — every card fell back to
initials. Commons images are openly licensed and served cross-origin.

Match: Wikidata people who held "Member of the Seimas" (Q18507240), are not
deceased, and have an image (P18), joined to active politicians by normalized
name. A name that maps to more than one Wikidata person is skipped, never
guessed. MPs without a Commons photo keep their current URL (initials fallback).
"""
import os

import psycopg2
import requests

from pipeline.ingest_seimas import normalize

SPARQL_URL = "https://query.wikidata.org/sparql"
USER_AGENT = "OpenSeimas/1.0 (https://github.com/prekyba3000-bit/OpenSeimas)"
COMMONS_PREFIX = "https://commons.wikimedia.org/wiki/Special:FilePath/"
QUERY = """
SELECT DISTINCT ?p ?pLabel ?img WHERE {
  ?p wdt:P39 wd:Q18507240 .
  FILTER NOT EXISTS { ?p wdt:P570 ?died }
  OPTIONAL { ?p wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "lt,en". }
}
"""


def name_key(name):
    return normalize((name or "").replace("-", " "))


def build_photo_map(bindings):
    """Wikidata SPARQL bindings -> {name_key: commons_url}, dropping ambiguous names."""
    people, images = {}, {}
    for b in bindings:
        key = name_key(b["pLabel"]["value"])
        people.setdefault(key, set()).add(b["p"]["value"])
        if "img" in b:
            filename = b["img"]["value"].rsplit("/Special:FilePath/", 1)[-1]
            images.setdefault(key, f"{COMMONS_PREFIX}{filename}?width=300")
    return {k: url for k, url in images.items() if len(people[k]) == 1}


def main():
    resp = requests.get(
        SPARQL_URL,
        params={"query": QUERY},
        headers={"Accept": "application/sparql-results+json", "User-Agent": USER_AGENT},
        timeout=60,
    )
    resp.raise_for_status()
    photos = build_photo_map(resp.json()["results"]["bindings"])

    conn = psycopg2.connect(os.environ["DB_DSN"])
    cur = conn.cursor()
    cur.execute("SELECT id, display_name FROM politicians WHERE is_active")
    updates = [(photos[name_key(n)], pid) for pid, n in cur.fetchall() if name_key(n) in photos]
    cur.executemany("UPDATE politicians SET photo_url = %s WHERE id = %s", updates)
    conn.commit()
    conn.close()
    print(f"Set Commons photos for {len(updates)} active MPs")


if __name__ == "__main__":
    main()
