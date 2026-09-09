"""Fetch an entity and render its summary — the one path approval and serving
both go through.

The publication boundary and the public read path must verify a stored summary
against *the same* rendering, or "approved" and "served" could mean different
things. So the fetch-and-render for each entity type lives here once, and both
`POST /api/admin/summaries/approve` and `GET /api/summaries/...` call it.

Only `vote` and `bill` have templates. `mp` and `topic` are valid
`summary_revisions.entity_type`s but have no figure-bearing template yet, so
there is nothing here to verify them against and nothing to serve; they return
(None, None) and the caller treats that as "cannot publish this type".
"""
from __future__ import annotations

from typing import Any

from .vote_template import render_vote_summary, VoteSummary
from .bill_template import render_bill_summary

# Everything render_vote_summary reads from a votes row. Keyed by votes.id, the
# integer PK the vote page already uses in its URLs, so the frontend asks for a
# summary with the same id it fetched the vote with.
_VOTE_COLUMNS = """
    seimas_vote_id, sitting_date, title, vote_type, project_id,
    votes_for, votes_against, votes_abstained, votes_participated, seats_eligible
"""

# One aggregate per bill. Every figure the bill template prints comes from a
# column here, so the gate has something to check each against. Mirrors
# scripts/pilot_bill_summaries.py, which imports fetch_bill from this module so
# the passage definition has a single home (§1.4).
_BILL_SQL = """
    SELECT l.project_id,
           l.title,
           count(*)                                         AS vote_count,
           count(*) FILTER (WHERE v.votes_participated > 0) AS tallied_count,
           min(v.sitting_date)                              AS first_date,
           max(v.sitting_date)                              AS last_date
    FROM legislation l
    JOIN votes v ON v.project_registration_nr = l.project_id
    WHERE l.project_id = %s
    GROUP BY l.project_id, l.title
"""

_BILL_STAGE_SQL = """
    SELECT v.vote_type, count(*) AS n
    FROM votes v
    WHERE v.project_registration_nr = %s
    GROUP BY v.vote_type
    ORDER BY min(v.sitting_date), count(*) DESC
"""


def fetch_vote(cur, vote_id: str) -> dict[str, Any] | None:
    """The votes row behind a vote summary, by votes.id."""
    try:
        pk = int(vote_id)
    except (TypeError, ValueError):
        return None
    cur.execute(f"SELECT {_VOTE_COLUMNS} FROM votes WHERE id = %s", (pk,))
    row = cur.fetchone()
    return dict(row) if row else None


def fetch_bill(cur, project_id: str) -> dict[str, Any] | None:
    """The passage aggregate behind a bill summary, by legislation.project_id.

    Returns a row carrying the flattened `stage_count.<Stage>` keys the gate
    resolves figure segments against, exactly as the pilot assembled them.
    """
    cur.execute(_BILL_SQL, (project_id,))
    row = cur.fetchone()
    if not row:
        return None
    row = dict(row)
    cur.execute(_BILL_STAGE_SQL, (project_id,))
    stages = cur.fetchall()
    row["stage_counts"] = [(r["vote_type"], r["n"]) for r in stages]
    row["last_stage"] = stages[-1]["vote_type"] if stages else None
    for stage, n in row["stage_counts"]:
        if stage:
            row[f"stage_count.{stage}"] = n
    return row


def render_summary(entity_type: str, entity_id: str, cur) -> tuple[VoteSummary | None, dict | None]:
    """(summary, row) for an entity, or (None, None) if it has no template or
    no data. The row is what the gate verifies the stored body against."""
    if entity_type == "vote":
        row = fetch_vote(cur, entity_id)
        return (render_vote_summary(row), row) if row else (None, None)
    if entity_type == "bill":
        row = fetch_bill(cur, entity_id)
        return (render_bill_summary(row), row) if row else (None, None)
    return None, None
