"""Set MP photos: the VRK candidate portrait, else Wikimedia Commons.

lrs.lt serves its MP portraits with `Cross-Origin-Resource-Policy: same-origin`,
so browsers refuse to show them on any other site — every card fell back to
initials.

1. VRK. Every 2024 candidate's page carries the portrait they filed
   (about 600x900), at an address built from the candidate id. The member is
   identified by `politicians.vrk_candidate_id`, not by name. The address is
   stored only after VRK answers it with an image.
2. Commons, for members with no VRK portrait. Wikidata people who held
   "Member of the Seimas" (Q18507240), are not deceased, and have an image
   (P18), joined to active politicians by normalized name. A name that maps to
   more than one Wikidata person is skipped, never guessed.

A member with neither keeps their current URL (initials fallback).
"""
import os

import psycopg2
import requests

from pipeline.ingest_seimas import normalize

SPARQL_URL = "https://query.wikidata.org/sparql"
USER_AGENT = "OpenSeimas/1.0 (https://github.com/prekyba3000-bit/OpenSeimas)"
COMMONS_PREFIX = "https://commons.wikimedia.org/wiki/Special:FilePath/"
# 2024 Seimas election, the same election and round ingest_vrk_results reads.
VRK_PHOTO_URL = (
    "https://www.vrk.lt/statiniai/puslapiai/rinkimai/1544/rnk1870/"
    "kandidatai/kandImg/photo_{vrk_id}.jpeg"
)
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
            images.setdefault(key, f"{COMMONS_PREFIX}{filename}?width=600")
    return {k: url for k, url in images.items() if len(people[k]) == 1}


def vrk_photo_url(vrk_id):
    return VRK_PHOTO_URL.format(vrk_id=vrk_id)


def is_image(url):
    """True only when the address answers 200 with an image."""
    try:
        resp = requests.head(url, headers={"User-Agent": USER_AGENT}, timeout=20, allow_redirects=True)
    except requests.RequestException:
        return False
    return resp.status_code == 200 and resp.headers.get("Content-Type", "").startswith("image/")


def choose_photo(vrk_id, current_url, commons_url, exists=is_image):
    """The URL to store, or None to leave the row alone."""
    if vrk_id:
        url = vrk_photo_url(vrk_id)
        if current_url == url:
            return None
        if exists(url):
            return url
    if commons_url and commons_url != current_url:
        return commons_url
    return None


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
    cur.execute("SELECT id, display_name, vrk_candidate_id, photo_url FROM politicians WHERE is_active")
    updates = []
    for pid, name, vrk_id, current in cur.fetchall():
        url = choose_photo(vrk_id, current, photos.get(name_key(name)))
        if url:
            updates.append((url, pid))
    cur.executemany("UPDATE politicians SET photo_url = %s WHERE id = %s", updates)
    conn.commit()
    cur.execute(
        "SELECT count(*) FILTER (WHERE photo_url LIKE 'https://www.vrk.lt/%%'), "
        "count(*) FILTER (WHERE photo_url LIKE 'https://commons.wikimedia.org/%%'), count(*) "
        "FROM politicians WHERE is_active"
    )
    vrk, commons, total = cur.fetchone()
    conn.close()
    print(f"photos: {len(updates)} changed; {vrk} VRK, {commons} Commons, of {total} active MPs")


if __name__ == "__main__":
    main()
