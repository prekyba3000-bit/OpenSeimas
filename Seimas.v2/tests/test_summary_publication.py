"""Serving a summary behind approval.

Charter P5: "no LLM-assisted text to production until approved." A revision is
a draft when written; the public sees only the latest *approved* one, and
approval runs the figure gate so a body whose numbers do not match the record
cannot be published — nor served if the record later drifts from it.

Real Postgres, because the whole behaviour is the SQL and the gate together.
"""
from __future__ import annotations

import os

import psycopg2
import psycopg2.extras
import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app
import backend.core as core

DSN = os.environ.get("DB_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="DB_DSN not set")

TOKEN = "test-admin-token"


@pytest.fixture(autouse=True)
def _admin_token(monkeypatch):
    # _require_admin_auth compares against SYNC_SECRET; set a known one.
    monkeypatch.setattr(core, "SYNC_SECRET", TOKEN, raising=False)
    monkeypatch.setenv("SYNC_SECRET", TOKEN)
    yield


@pytest.fixture()
def vote():
    """A real votes row to key a summary to, torn down after."""
    conn = psycopg2.connect(DSN)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        INSERT INTO votes (seimas_vote_id, sitting_date, title, vote_type,
                           votes_for, votes_against, votes_abstained,
                           votes_participated, seats_eligible)
        VALUES (%s, '2026-02-03', 'Testinis balsavimas dėl X', 'Priėmimas',
                90, 5, 2, 97, 141)
        RETURNING id
        """,
        (-778001,),
    )
    vote_id = cur.fetchone()["id"]
    conn.commit()
    yield conn, cur, str(vote_id)
    cur.execute("DELETE FROM summary_revisions WHERE entity_type='vote' AND entity_id=%s", (str(vote_id),))
    cur.execute("DELETE FROM votes WHERE id=%s", (vote_id,))
    conn.commit()
    conn.close()


async def _get(path):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        return await c.get(path)


async def _post(path, json):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        return await c.post(path, json=json, headers={"Authorization": f"Bearer {TOKEN}"})


def _rendered_body(cur, vote_id):
    from pipeline.summaries import render_summary
    summary, _ = render_summary("vote", vote_id, cur)
    return summary.text


def _draft(cur, conn, vote_id, body, revision=1, editor="pipeline:template v1"):
    cur.execute(
        """INSERT INTO summary_revisions (entity_type, entity_id, revision, body_lt, editor)
           VALUES ('vote', %s, %s, %s, %s)""",
        (vote_id, revision, body, editor),
    )
    conn.commit()


@pytest.mark.asyncio
async def test_a_drafted_summary_is_not_served(vote):
    """The load-bearing property. A revision exists, unapproved; the public
    endpoint returns nothing rather than the draft."""
    conn, cur, vote_id = vote
    _draft(cur, conn, vote_id, _rendered_body(cur, vote_id))
    resp = await _get(f"/api/summaries/vote/{vote_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "none"
    assert body["summary"] is None


@pytest.mark.asyncio
async def test_approval_publishes_the_template_body(vote):
    conn, cur, vote_id = vote
    _draft(cur, conn, vote_id, _rendered_body(cur, vote_id))
    ap = await _post("/api/admin/summaries/approve",
                     {"entity_type": "vote", "entity_id": vote_id,
                      "revision": 1, "approved_by": "Redaktorius"})
    assert ap.status_code == 200, ap.text

    resp = await _get(f"/api/summaries/vote/{vote_id}")
    body = resp.json()
    assert body["status"] == "published"
    assert "Testinis balsavimas dėl X" in body["summary"]["body_lt"]
    assert body["summary"]["approved_by"] == "Redaktorius"


@pytest.mark.asyncio
async def test_approval_refuses_a_body_whose_figures_do_not_match(vote):
    """The gate at the publication boundary. A body that renumbers the tally is
    rejected even with a valid token."""
    conn, cur, vote_id = vote
    tampered = _rendered_body(cur, vote_id).replace("90 narių", "apie 100 narių")
    _draft(cur, conn, vote_id, tampered)
    ap = await _post("/api/admin/summaries/approve",
                     {"entity_type": "vote", "entity_id": vote_id,
                      "revision": 1, "approved_by": "Redaktorius"})
    assert ap.status_code == 422
    body = ap.json()
    assert body["title"].lower().startswith("figure gate")
    assert body["violations"]
    kinds = {v["kind"] for v in body["violations"]}
    assert "unsupported_figure" in kinds

    # And nothing was published as a side effect.
    resp = await _get(f"/api/summaries/vote/{vote_id}")
    assert resp.json()["status"] == "none"


@pytest.mark.asyncio
async def test_a_later_draft_does_not_change_what_is_published(vote):
    """Approve v1; write an unapproved v2. The public keeps seeing v1, because
    "latest" means latest approved, not latest."""
    conn, cur, vote_id = vote
    body_v1 = _rendered_body(cur, vote_id)
    _draft(cur, conn, vote_id, body_v1, revision=1)
    await _post("/api/admin/summaries/approve",
                {"entity_type": "vote", "entity_id": vote_id,
                 "revision": 1, "approved_by": "Redaktorius"})
    # A v2 draft — same figures, reworded, but unapproved.
    _draft(cur, conn, vote_id, body_v1 + " ", revision=2, editor="llm:simplify")
    resp = await _get(f"/api/summaries/vote/{vote_id}")
    body = resp.json()
    assert body["status"] == "published"
    assert body["summary"]["revision"] == 1


@pytest.mark.asyncio
async def test_approving_v2_supersedes_v1(vote):
    conn, cur, vote_id = vote
    body = _rendered_body(cur, vote_id)
    _draft(cur, conn, vote_id, body, revision=1)
    _draft(cur, conn, vote_id, body, revision=2)
    for rev in (1, 2):
        await _post("/api/admin/summaries/approve",
                    {"entity_type": "vote", "entity_id": vote_id,
                     "revision": rev, "approved_by": "Redaktorius"})
    resp = await _get(f"/api/summaries/vote/{vote_id}")
    assert resp.json()["summary"]["revision"] == 2


@pytest.mark.asyncio
async def test_a_published_summary_is_withheld_once_the_data_drifts(vote):
    """The serve-time re-verification. Approve a summary, then change the row
    so the stored figures no longer match — the body is held back, not shown
    stale."""
    conn, cur, vote_id = vote
    _draft(cur, conn, vote_id, _rendered_body(cur, vote_id))
    await _post("/api/admin/summaries/approve",
                {"entity_type": "vote", "entity_id": vote_id,
                 "revision": 1, "approved_by": "Redaktorius"})
    assert (await _get(f"/api/summaries/vote/{vote_id}")).json()["status"] == "published"

    # The record moves under the approved text.
    cur.execute("UPDATE votes SET votes_for = 91 WHERE id = %s", (int(vote_id),))
    conn.commit()

    body = (await _get(f"/api/summaries/vote/{vote_id}")).json()
    assert body["status"] == "withheld_stale"
    assert body["summary"] is None


@pytest.mark.asyncio
async def test_approve_requires_the_token(vote):
    conn, cur, vote_id = vote
    _draft(cur, conn, vote_id, _rendered_body(cur, vote_id))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.post("/api/admin/summaries/approve",
                            json={"entity_type": "vote", "entity_id": vote_id,
                                  "revision": 1, "approved_by": "x"})
    assert resp.status_code in (401, 403)
    assert (await _get(f"/api/summaries/vote/{vote_id}")).json()["status"] == "none"


@pytest.mark.asyncio
async def test_a_missing_revision_is_a_404(vote):
    conn, cur, vote_id = vote
    ap = await _post("/api/admin/summaries/approve",
                     {"entity_type": "vote", "entity_id": vote_id,
                      "revision": 9, "approved_by": "x"})
    assert ap.status_code == 404


@pytest.mark.asyncio
async def test_an_unknown_entity_type_is_rejected():
    assert (await _get("/api/summaries/nonsense/1")).status_code == 422
