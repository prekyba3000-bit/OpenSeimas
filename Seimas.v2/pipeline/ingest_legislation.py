"""Fill `legislation` from the sitting agendas already ingested.

## Why this no longer fetches anything

The previous version requested
`e-seimas.lrs.lt/rs/legalactproject/search/find?number=<id>` for each distinct
`votes.project_id`. Verified 2026-09-05: that endpoint returns **404 on every
variant tried**, including the bare path with no query string. It is not the
unsupported-parameter trap recorded in `upstream-source-map-verification.md` —
the route is gone, and every working ingest in this repo talks to
`apps.lrs.lt/sip/p2b.*` instead. The script had never successfully run, which is
why the table held 0 rows for the life of the project. „No runner" was the
wrong diagnosis; there was also nothing at the other end.

The one live alternative, `p2b.ad_sn_inicijuoti_ta_projektai`, was measured
across all 148 members: 707 projects, covering **336 of the 1,710 voted on —
19.6%**. It is a per-MP feed of member-initiated projects for the current term,
so government-initiated projects and previous-term projects cannot appear in it
by construction. Filling this table from it would produce something that looks
complete and holds a fifth of the record.

## Where the data comes from now

The sitting agenda feed, which this project already ingests for every vote,
publishes the project's registration number and its full title in the agenda
item. Both are already in `votes.title`. So `legislation` is built from data
LRS published and we already hold — no new source, no new request, and the
runner cannot break when a remote endpoint moves.

Corroborated against an independent source per charter §9: of the agenda titles
whose project also appears in the per-MP feed, **334 of 341** contain the feed's
own title for that project.

## What it does not do

`summary` and `url` stay NULL. Nothing available publishes a project summary,
and the e-seimas URL cannot be verified to resolve. A plausible-looking link is
worse than no link.

    .venv/bin/python -m pipeline.ingest_legislation           # write
    .venv/bin/python -m pipeline.ingest_legislation --dry-run # report only
"""
from __future__ import annotations

import argparse
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

from pipeline.project_number import project_title, resolve

DB_DSN = os.getenv("DB_DSN")


def collect(cur) -> tuple[dict, dict]:
    """{registration: title} and {seimas_vote_id: ProjectNumber}, from the agendas.

    Ordered by sitting date so that later spellings overwrite earlier ones: the
    source words the same document differently across stages for 13 of 1,683
    projects, and the most recent wording is the one LRS is currently using.
    """
    cur.execute(
        """
        SELECT seimas_vote_id, project_id, title, sitting_date
        FROM votes
        ORDER BY sitting_date NULLS FIRST, seimas_vote_id
        """
    )
    titles: dict[str, str] = {}
    per_vote: dict[int, object] = {}
    for row in cur.fetchall():
        found = resolve(row["project_id"], row["title"])
        if not found:
            continue
        per_vote[row["seimas_vote_id"]] = found
        name = project_title(row["title"])
        if name:
            titles[found.registration] = name
    return titles, per_vote


def run(dry_run: bool = False) -> int:
    if not DB_DSN:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    titles, per_vote = collect(cur)
    cur.execute("SELECT count(*) AS n FROM votes")
    total_votes = cur.fetchone()["n"]

    print(f"votes read                    : {total_votes}")
    print(f"  resolved to one project     : {len(per_vote)}")
    print(f"  no single project           : {total_votes - len(per_vote)}")
    print(f"distinct projects (registrations): {len(titles)}")
    print(f"distinct base projects           : {len({p.base for p in per_vote.values()})}")

    if dry_run:
        print("\n--dry-run: nothing written")
        return 0

    # The per-vote columns. An UPDATE of columns this migration added, from a
    # value derived from a column already present — additive in substance, and
    # it never touches votes.project_id.
    execute_values(
        cur,
        """
        UPDATE votes AS v SET
            project_registration_nr = d.reg,
            project_base_nr = d.base
        FROM (VALUES %s) AS d(vote_id, reg, base)
        WHERE v.seimas_vote_id = d.vote_id
        """,
        [(vid, p.registration, p.base) for vid, p in per_vote.items()],
        page_size=1000,
    )
    # Counted with a query, not from cur.rowcount: execute_values sends the rows
    # in pages and rowcount reports only the last one, which printed 853 for a
    # run that correctly stamped 3,853.
    cur.execute("SELECT count(project_registration_nr) AS n FROM votes")
    print(f"votes stamped with a project  : {cur.fetchone()['n']}")

    execute_values(
        cur,
        """
        INSERT INTO legislation (project_id, title, summary, url)
        VALUES %s
        ON CONFLICT (project_id) DO UPDATE SET title = EXCLUDED.title
        """,
        [(reg, name, None, None) for reg, name in sorted(titles.items())],
        page_size=500,
    )
    conn.commit()

    cur.execute("SELECT count(*) AS n FROM legislation")
    print(f"legislation rows              : {cur.fetchone()['n']}")
    cur.close()
    conn.close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="report what would be written and exit")
    args = parser.parse_args()
    return run(dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
