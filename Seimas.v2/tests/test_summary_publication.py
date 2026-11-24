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
DRAFT_TOKEN = "test-summary-draft-token"
APPROVE_TOKEN = "test-summary-approve-token"
APPROVER = "Testinis redaktorius"


@pytest.fixture(autouse=True)
def _admin_token(monkeypatch):
    monkeypatch.setattr(core, "SYNC_SECRET", TOKEN, raising=False)
    monkeypatch.setattr(core, "SUMMARY_DRAFT_SECRET", DRAFT_TOKEN, raising=False)
    monkeypatch.setattr(core, "SUMMARY_APPROVE_SECRET", APPROVE_TOKEN, raising=False)
    monkeypatch.setattr(core, "SUMMARY_APPROVER_NAME", APPROVER, raising=False)
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


async def _post(path, json, token=None):
    if token is None:
        token = APPROVE_TOKEN if path.endswith("/approve") else DRAFT_TOKEN
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        return await c.post(path, json=json, headers={"Authorization": f"Bearer {token}"})


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
    assert body["summary"]["approved_by"] == APPROVER


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
async def test_approval_refuses_relabelled_figures_and_an_invented_outcome(vote):
    conn, cur, vote_id = vote
    rendered = _rendered_body(cur, vote_id)
    tampered = rendered.replace("Už balsavo 90 narių", "Už balsavo 5 nariai")
    tampered = tampered.replace("prieš – 5 nariai", "prieš – 90 narių")
    tampered = tampered.replace("2026 m. vasario 3 d.", "2026 m. kovo 3 d.")
    tampered += " Klausimas priimtas."
    _draft(cur, conn, vote_id, tampered)

    response = await _post(
        "/api/admin/summaries/approve",
        {"entity_type": "vote", "entity_id": vote_id,
         "revision": 1, "approved_by": "Redaktorius"},
    )
    assert response.status_code == 422
    kinds = {v["kind"] for v in response.json()["violations"]}
    assert "figure_label_mismatch" in kinds
    assert "unsupported_outcome" in kinds
    assert (await _get(f"/api/summaries/vote/{vote_id}")).json()["status"] == "none"


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


@pytest.mark.asyncio
async def test_public_history_contains_only_approved_revisions(vote):
    conn, cur, vote_id = vote
    rendered = _rendered_body(cur, vote_id)
    _draft(cur, conn, vote_id, rendered, revision=1)
    assert (await _get(f"/api/trust/summary-history/vote/{vote_id}")).json()["revisions"] == []

    await _post("/api/admin/summaries/approve",
                {"entity_type": "vote", "entity_id": vote_id,
                 "revision": 1, "approved_by": "Redaktorius"})
    _draft(cur, conn, vote_id, rendered + " Nepatvirtintas juodraštis.", revision=2, editor="llm:simplify")
    response = await _get(f"/api/trust/summary-history/vote/{vote_id}")
    assert response.status_code == 200
    assert [row["revision"] for row in response.json()["revisions"]] == [1]
    assert "Nepatvirtintas juodraštis" not in response.text


@pytest.mark.asyncio
async def test_posting_and_approving_the_same_revision_is_idempotent(vote):
    conn, cur, vote_id = vote
    payload = {
        "entity_type": "vote",
        "entity_id": vote_id,
        "body_lt": _rendered_body(cur, vote_id),
        "editor": "pipeline:template v1",
        "note": "Bandymo redakcija.",
    }
    first = await _post("/api/admin/summaries", payload)
    second = await _post("/api/admin/summaries", payload)
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["revision"] == second.json()["revision"] == 1
    cur.execute("SELECT count(*) AS n FROM summary_revisions WHERE entity_type='vote' AND entity_id=%s", (vote_id,))
    assert cur.fetchone()["n"] == 1

    approval = {"entity_type": "vote", "entity_id": vote_id, "revision": 1, "approved_by": "Redaktorius"}
    assert (await _post("/api/admin/summaries/approve", approval)).status_code == 200
    cur.execute("SELECT approved_at, approved_by FROM summary_revisions WHERE entity_type='vote' AND entity_id=%s", (vote_id,))
    original = cur.fetchone()
    retry = dict(approval, approved_by="Kitas redaktorius")
    assert (await _post("/api/admin/summaries/approve", retry)).status_code == 200
    cur.execute("SELECT approved_at, approved_by FROM summary_revisions WHERE entity_type='vote' AND entity_id=%s", (vote_id,))
    assert cur.fetchone() == original


@pytest.mark.asyncio
@pytest.mark.parametrize("token", [TOKEN, DRAFT_TOKEN])
async def test_non_approval_credentials_cannot_approve(vote, token):
    conn, cur, vote_id = vote
    _draft(cur, conn, vote_id, _rendered_body(cur, vote_id))
    response = await _post(
        "/api/admin/summaries/approve",
        {"entity_type": "vote", "entity_id": vote_id, "revision": 1},
        token=token,
    )
    assert response.status_code == 401
    assert (await _get(f"/api/summaries/vote/{vote_id}")).json()["status"] == "none"


@pytest.mark.asyncio
async def test_approval_credential_cannot_create_a_draft(vote):
    conn, cur, vote_id = vote
    response = await _post(
        "/api/admin/summaries",
        {
            "entity_type": "vote",
            "entity_id": vote_id,
            "body_lt": _rendered_body(cur, vote_id),
            "editor": "self-appointed approver",
        },
        token=APPROVE_TOKEN,
    )
    assert response.status_code == 401
    cur.execute(
        "SELECT count(*) AS n FROM summary_revisions WHERE entity_type='vote' AND entity_id=%s",
        (vote_id,),
    )
    assert cur.fetchone()["n"] == 0


@pytest.mark.asyncio
async def test_draft_credential_cannot_use_general_admin_routes():
    response = await _post(
        "/api/admin/methodology",
        {"metric_key": "attendance", "title_lt": "t", "body_lt": "b"},
        token=DRAFT_TOKEN,
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_approval_refuses_a_credential_shared_with_another_role(vote, monkeypatch):
    conn, cur, vote_id = vote
    _draft(cur, conn, vote_id, _rendered_body(cur, vote_id))
    monkeypatch.setattr(core, "SUMMARY_APPROVE_SECRET", TOKEN)
    response = await _post(
        "/api/admin/summaries/approve",
        {"entity_type": "vote", "entity_id": vote_id, "revision": 1},
    )
    assert response.status_code == 503
    assert (await _get(f"/api/summaries/vote/{vote_id}")).json()["status"] == "none"


@pytest.mark.asyncio
async def test_summary_writes_record_credentials_not_caller_asserted_approver(vote):
    conn, cur, vote_id = vote
    body = _rendered_body(cur, vote_id)
    drafted = await _post(
        "/api/admin/summaries",
        {
            "entity_type": "vote",
            "entity_id": vote_id,
            "body_lt": body,
            "editor": "pipeline:template v1",
        },
    )
    assert drafted.status_code == 201
    approved = await _post(
        "/api/admin/summaries/approve",
        {
            "entity_type": "vote",
            "entity_id": vote_id,
            "revision": 1,
            "approved_by": "Suklastotas vardas",
        },
    )
    assert approved.status_code == 200

    public = (await _get(f"/api/summaries/vote/{vote_id}")).json()["summary"]
    assert public["approved_by"] == APPROVER
    cur.execute(
        """
        SELECT route, credential_id FROM admin_audit_log
        WHERE entity_type = 'vote' AND entity_id = %s
        ORDER BY id DESC LIMIT 2
        """,
        (vote_id,),
    )
    rows = list(reversed(cur.fetchall()))
    assert rows == [
        {"route": "/api/admin/summaries", "credential_id": "summary_draft"},
        {
            "route": "/api/admin/summaries/approve",
            "credential_id": f"summary_approver:{APPROVER}",
        },
    ]


@pytest.mark.asyncio
async def test_general_and_draft_routes_reject_shared_credentials(monkeypatch):
    monkeypatch.setattr(core, "SUMMARY_DRAFT_SECRET", TOKEN)
    general = await _post(
        "/api/admin/methodology",
        {"metric_key": "attendance", "title_lt": "t", "body_lt": "b"},
        token=TOKEN,
    )
    draft = await _post(
        "/api/admin/summaries",
        {"entity_type": "vote", "entity_id": "unused", "body_lt": "x", "editor": "x"},
        token=TOKEN,
    )
    assert general.status_code == 503
    assert draft.status_code == 503
