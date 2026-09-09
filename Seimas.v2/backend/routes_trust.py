"""Trust floor endpoints (V.4 Phase 1).

Public:
  GET  /api/trust/corrections                      — public corrections log (no emails)
  POST /api/trust/corrections                      — report an error (rate-limited, honeypot)
  GET  /api/trust/methodology/{metric_key}         — current + all versions
  GET  /api/trust/summary-history/{etype}/{eid}    — full public edit history
  GET  /api/trust/replies/{mp_id}                  — verified MP right-of-reply entries

Admin (Authorization: Bearer $SYNC_SECRET):
  POST /api/admin/corrections/{id}/status
  POST /api/admin/methodology
  POST /api/admin/summaries
  POST /api/admin/replies

Conventions: routes resolve runtime helpers through backend.core proxies so tests can
monkeypatch backend.core.* (same pattern as routes_public/routes_meta).
"""
from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import JSONResponse
import datetime
from typing import Optional

from pydantic import BaseModel, Field

from backend import core


# Call-time proxies — keep bare names in route bodies patchable via backend.core.
def get_db_conn():
    return core.get_db_conn()


def check_rate_limit(ip):
    return core.check_rate_limit(ip)


def _table_exists(cur, table_name):
    return core._table_exists(cur, table_name)


def _require_admin_auth(authorization):
    return core._require_admin_auth(authorization)


router = APIRouter()

_ENTITY_TYPES = ("mp", "vote", "bill", "topic_tag", "summary", "metric", "other")
_SUMMARY_TYPES = ("vote", "bill", "mp", "topic")
_CORRECTION_STATUSES = ("open", "accepted", "rejected", "resolved")

# Submissions are public only after a maintainer has acted on them. `open` means
# "received, not yet reviewed" and is never served publicly: the submit endpoint
# is anonymous and unauthenticated, so without this gate anyone could publish
# arbitrary claims about a named MP on the platform's own corrections log.
# Rejected reports stay public on purpose — a log of only the reports we agreed
# with would be worth little to a skeptical reader. Abusive submissions are left
# at `open`, where they remain invisible.
_PUBLIC_CORRECTION_STATUSES = ("accepted", "rejected", "resolved")


def _client_ip(request: Request) -> str:
    return core.client_ip(request)


def _require_table(cur, table: str):
    """503 instead of 500 when migration 017 has not been applied yet."""
    if not _table_exists(cur, table):
        raise HTTPException(
            status_code=503,
            detail=f"Trust floor not installed — run migrations (017_trust_floor.sql)",
        )


# ─── Public: corrections ─────────────────────────────────────────────────────


class CorrectionIn(BaseModel):
    entity_type: str = Field(..., max_length=20)
    entity_id: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=4000)
    reporter_email: Optional[str] = Field(None, max_length=320)
    website: Optional[str] = Field(None, max_length=50)  # honeypot — must stay empty


@router.post("/api/trust/corrections", status_code=201)
def submit_correction(payload: CorrectionIn, request: Request):
    if not check_rate_limit(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    if payload.website:  # bot filled the honeypot — pretend success, store nothing
        return {"status": "received"}
    if payload.entity_type not in _ENTITY_TYPES:
        raise HTTPException(status_code=422, detail=f"entity_type must be one of {_ENTITY_TYPES}")

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "corrections")
            cur.execute(
                """
                INSERT INTO corrections (entity_type, entity_id, description, reporter_email)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (payload.entity_type, payload.entity_id, payload.description, payload.reporter_email),
            )
            row = cur.fetchone()
        conn.commit()
    return {"status": "received", "id": str(row["id"]), "created_at": row["created_at"].isoformat()}


@router.get("/api/trust/corrections")
def list_corrections(request: Request, status: Optional[str] = None, limit: int = 50):
    """Public log of reviewed corrections.

    Only `_PUBLIC_CORRECTION_STATUSES` are ever returned — unreviewed (`open`)
    submissions are not public, and asking for them explicitly is refused rather
    than quietly ignored. reporter_email is deliberately never selected.
    """
    if not check_rate_limit(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    if status and status not in _PUBLIC_CORRECTION_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of {_PUBLIC_CORRECTION_STATUSES} — unreviewed submissions are not public",
        )
    limit = max(1, min(limit, 200))

    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "corrections")
            if status:
                where = "WHERE status = %s"
                params = (status, limit)
            else:
                where = "WHERE status = ANY(%s)"
                params = (list(_PUBLIC_CORRECTION_STATUSES), limit)
            cur.execute(
                f"""
                SELECT id, entity_type, entity_id, description, status,
                       resolution_note, created_at, resolved_at
                FROM corrections
                {where}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                params,
            )
            rows = cur.fetchall()
    return {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "count": len(rows),
        "corrections": [
            {**r, "id": str(r["id"]), "created_at": r["created_at"].isoformat(),
             "resolved_at": r["resolved_at"].isoformat() if r["resolved_at"] else None}
            for r in rows
        ],
    }


# ─── Public: methodology ─────────────────────────────────────────────────────


@router.get("/api/trust/methodology/{metric_key}")
def get_methodology(metric_key: str):
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "methodology_versions")
            cur.execute(
                """
                SELECT metric_key, version, title_lt, body_lt, announced_at, effective_from
                FROM methodology_versions
                WHERE metric_key = %s
                ORDER BY version DESC
                """,
                (metric_key,),
            )
            rows = cur.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No methodology published for '{metric_key}'")
    return {
        "metric_key": metric_key,
        "current": {
            **rows[0],
            "announced_at": rows[0]["announced_at"].isoformat() if rows[0]["announced_at"] else None,
            "effective_from": rows[0]["effective_from"].isoformat(),
        },
        "history": [
            {
                **r,
                "announced_at": r["announced_at"].isoformat() if r["announced_at"] else None,
                "effective_from": r["effective_from"].isoformat(),
            }
            for r in rows[1:]
        ],
    }


# ─── Public: summary edit history ────────────────────────────────────────────


@router.get("/api/trust/summary-history/{entity_type}/{entity_id}")
def get_summary_history(entity_type: str, entity_id: str):
    if entity_type not in _SUMMARY_TYPES:
        raise HTTPException(status_code=422, detail=f"entity_type must be one of {_SUMMARY_TYPES}")
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "summary_revisions")
            cur.execute(
                """
                SELECT revision, body_lt, editor, note, created_at
                FROM summary_revisions
                WHERE entity_type = %s AND entity_id = %s
                ORDER BY revision DESC
                """,
                (entity_type, entity_id),
            )
            rows = cur.fetchall()
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "revisions": [{**r, "created_at": r["created_at"].isoformat()} for r in rows],
    }


# ─── Public: right of reply ──────────────────────────────────────────────────


@router.get("/api/trust/replies/{mp_id}")
def get_mp_replies(mp_id: str):
    """Verified MP replies only — unverified submissions are never public."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "mp_replies")
            cur.execute(
                """
                SELECT subject_type, subject_ref, body_lt, created_at
                FROM mp_replies
                WHERE politician_id = %s AND verified = TRUE
                ORDER BY created_at DESC
                """,
                (mp_id,),
            )
            rows = cur.fetchall()
    return {
        "politician_id": mp_id,
        "replies": [{**r, "created_at": r["created_at"].isoformat()} for r in rows],
    }


# ─── Admin ───────────────────────────────────────────────────────────────────


class CorrectionStatusIn(BaseModel):
    status: str
    resolution_note: Optional[str] = Field(None, max_length=4000)


@router.post("/api/admin/corrections/{correction_id}/status")
def set_correction_status(
    correction_id: str,
    payload: CorrectionStatusIn,
    authorization: Optional[str] = Header(None),
):
    _require_admin_auth(authorization)
    if payload.status not in _CORRECTION_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {_CORRECTION_STATUSES}")
    resolved = payload.status in ("resolved", "rejected")
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "corrections")
            cur.execute(
                """
                UPDATE corrections
                SET status = %s,
                    resolution_note = %s,
                    resolved_at = CASE WHEN %s THEN NOW() ELSE resolved_at END
                WHERE id = %s
                RETURNING id
                """,
                (payload.status, payload.resolution_note, resolved, correction_id),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Correction not found")
    return {"status": "ok", "id": correction_id}


class MethodologyIn(BaseModel):
    metric_key: str = Field(..., min_length=1, max_length=100)
    title_lt: str = Field(..., min_length=1, max_length=500)
    body_lt: str = Field(..., min_length=1)
    announced_at: Optional[datetime.datetime] = None
    effective_from: Optional[datetime.datetime] = None


@router.post("/api/admin/methodology", status_code=201)
def publish_methodology(payload: MethodologyIn, authorization: Optional[str] = Header(None)):
    """Publish a NEW version (auto-incremented). Old versions stay queryable — plan §7."""
    _require_admin_auth(authorization)
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "methodology_versions")
            cur.execute(
                "SELECT COALESCE(MAX(version), 0) + 1 AS v FROM methodology_versions WHERE metric_key = %s",
                (payload.metric_key,),
            )
            next_version = cur.fetchone()["v"]
            cur.execute(
                """
                INSERT INTO methodology_versions
                    (metric_key, version, title_lt, body_lt, announced_at, effective_from)
                VALUES (%s, %s, %s, %s, %s, COALESCE(%s, NOW()))
                RETURNING id, version
                """,
                (
                    payload.metric_key,
                    next_version,
                    payload.title_lt,
                    payload.body_lt,
                    payload.announced_at,
                    payload.effective_from,
                ),
            )
            row = cur.fetchone()
        conn.commit()
    return {"status": "ok", "id": row["id"], "metric_key": payload.metric_key, "version": row["version"]}


class SummaryRevisionIn(BaseModel):
    entity_type: str
    entity_id: str = Field(..., min_length=1, max_length=200)
    body_lt: str = Field(..., min_length=1)
    editor: str = Field(..., min_length=1, max_length=200)
    note: Optional[str] = Field(None, max_length=1000)


@router.post("/api/admin/summaries", status_code=201)
def add_summary_revision(payload: SummaryRevisionIn, authorization: Optional[str] = Header(None)):
    """Append a revision (auto-incremented per entity). Used by maintainers and the pipeline."""
    _require_admin_auth(authorization)
    if payload.entity_type not in _SUMMARY_TYPES:
        raise HTTPException(status_code=422, detail=f"entity_type must be one of {_SUMMARY_TYPES}")
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "summary_revisions")
            cur.execute(
                """
                SELECT COALESCE(MAX(revision), 0) + 1 AS r FROM summary_revisions
                WHERE entity_type = %s AND entity_id = %s
                """,
                (payload.entity_type, payload.entity_id),
            )
            next_rev = cur.fetchone()["r"]
            cur.execute(
                """
                INSERT INTO summary_revisions (entity_type, entity_id, revision, body_lt, editor, note)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (payload.entity_type, payload.entity_id, next_rev, payload.body_lt, payload.editor, payload.note),
            )
            row = cur.fetchone()
        conn.commit()
    return {"status": "ok", "id": str(row["id"]), "revision": next_rev}


class SummaryApproveIn(BaseModel):
    entity_type: str = Field(..., min_length=1)
    entity_id: str = Field(..., min_length=1, max_length=200)
    revision: int = Field(..., ge=1)
    approved_by: str = Field(..., min_length=1, max_length=200)


def _figure_gate(entity_type: str, entity_id: str, body_lt: str, cur):
    """Run the figure gate on a stored body against a freshly-rendered template.

    Returns the list of gate violation dicts. Empty means the body's figures
    all match the live row — the charter's condition for publishing it. A type
    with no template (mp/topic) returns a single "unsupported" violation, so it
    cannot be approved into a figure-verified state it was never checked for.
    """
    from pipeline.summaries import render_summary
    from pipeline.summaries.verify import verify_rendered

    summary, row = render_summary(entity_type, entity_id, cur)
    if summary is None:
        return [{
            "kind": "no_template",
            "detail": f"{entity_type!r} has no figure-bearing template, or "
                      f"{entity_id!r} matched no data — cannot verify or publish it",
        }]
    return [{"kind": v.kind, "detail": v.detail} for v in verify_rendered(body_lt, summary)]


@router.post("/api/admin/summaries/approve")
def approve_summary_revision(payload: SummaryApproveIn, authorization: Optional[str] = Header(None)):
    """Publish one drafted revision — after its figures are checked.

    This is the boundary the charter's "every figure must match or the summary
    is rejected" lives on. A revision is a draft until it is approved; approval
    re-renders the template for the entity and runs the gate on the stored
    body, refusing (422) if any figure the body states is not one the current
    row supports. So an unreviewed pilot, or a future rephrasing that renumbers,
    cannot be approved even by a maintainer with the token.
    """
    _require_admin_auth(authorization)
    if payload.entity_type not in _SUMMARY_TYPES:
        raise HTTPException(status_code=422, detail=f"entity_type must be one of {_SUMMARY_TYPES}")

    # Outcome is decided inside the DB block; the HTTP error is raised after it.
    # get_db_conn's context manager has a broad `except Exception` that logs and
    # re-raises as a connection error, so an HTTPException raised inside it comes
    # out mangled — the detail dict arrives at the client as a string.
    outcome: dict = {}
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "summary_revisions")
            cur.execute(
                """
                SELECT id, body_lt FROM summary_revisions
                WHERE entity_type = %s AND entity_id = %s AND revision = %s
                """,
                (payload.entity_type, payload.entity_id, payload.revision),
            )
            rev = cur.fetchone()
            if not rev:
                outcome = {"code": 404, "detail": "revision not found"}
            else:
                violations = _figure_gate(payload.entity_type, payload.entity_id, rev["body_lt"], cur)
                if violations:
                    outcome = {"code": 422, "violations": violations}
                else:
                    cur.execute(
                        "UPDATE summary_revisions SET approved_at = NOW(), approved_by = %s WHERE id = %s",
                        (payload.approved_by, rev["id"]),
                    )
                    conn.commit()

    if outcome.get("code") == 404:
        raise HTTPException(status_code=404, detail="revision not found")
    if outcome.get("code") == 422:
        # Same shape as the app's other problem-details errors, with the gate's
        # findings in an `extra` field the global handler would otherwise drop —
        # a maintainer approving a summary needs to see why it was refused.
        return JSONResponse(
            status_code=422,
            content={
                "type": "https://openseimas.local/problems/figure-gate",
                "title": "Figure gate rejected the summary",
                "status": 422,
                "detail": "A figure in the summary is not one the record supports.",
                "instance": "/api/admin/summaries/approve",
                "violations": outcome["violations"],
            },
        )
    return {"status": "ok", "revision": payload.revision, "approved": True}


@router.get("/api/summaries/{entity_type}/{entity_id}")
def get_published_summary(entity_type: str, entity_id: str):
    """The published summary for an entity — the latest APPROVED revision, or
    nothing.

    Two things stand between a stored row and a served string, and both are the
    trust floor:

      * a draft is never served. Only a revision with approved_at set is a
        candidate, and the latest such by revision number wins. An unapproved
        revision — a pilot, a rephrasing awaiting review — is invisible here
        however recent.
      * an approved summary whose figures no longer match the data is withheld,
        not shown. A bill's passage grows as new votes are ingested, so a count
        approved last week can go stale; rather than display a number the
        current record no longer supports, the body is held back and the state
        says so. Votes are stable, but the check is uniform.

    Never 500s on a missing table or an unrenderable type: it returns the
    honest "nothing published" shape, because the vote page always asks.
    """
    if entity_type not in _SUMMARY_TYPES:
        raise HTTPException(status_code=422, detail=f"entity_type must be one of {_SUMMARY_TYPES}")

    none = {"entity_type": entity_type, "entity_id": entity_id,
            "status": "none", "summary": None}

    result = none
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            if not _table_exists(cur, "summary_revisions"):
                return none
            cur.execute(
                """
                SELECT revision, body_lt, editor, note, approved_at, approved_by, created_at
                FROM summary_revisions
                WHERE entity_type = %s AND entity_id = %s AND approved_at IS NOT NULL
                ORDER BY revision DESC
                LIMIT 1
                """,
                (entity_type, entity_id),
            )
            rev = cur.fetchone()
            if rev:
                # Re-verify against the live row before serving. A published
                # figure the data no longer supports is withheld, not displayed.
                if _figure_gate(entity_type, entity_id, rev["body_lt"], cur):
                    result = {"entity_type": entity_type, "entity_id": entity_id,
                              "status": "withheld_stale", "summary": None}
                else:
                    result = {
                        "entity_type": entity_type, "entity_id": entity_id,
                        "status": "published",
                        "summary": {
                            "body_lt": rev["body_lt"],
                            "revision": rev["revision"],
                            "editor": rev["editor"],
                            "note": rev["note"],
                            "approved_by": rev["approved_by"],
                            "approved_at": rev["approved_at"].isoformat(),
                            "created_at": rev["created_at"].isoformat(),
                        },
                    }
    return result


class MpReplyIn(BaseModel):
    politician_id: str
    subject_type: str
    subject_ref: Optional[str] = Field(None, max_length=200)
    body_lt: str = Field(..., min_length=1, max_length=8000)
    verified: bool = False


@router.post("/api/admin/replies", status_code=201)
def add_mp_reply(payload: MpReplyIn, authorization: Optional[str] = Header(None)):
    _require_admin_auth(authorization)
    if payload.subject_type not in ("profile", "metric", "summary", "recommendation"):
        raise HTTPException(status_code=422, detail="invalid subject_type")
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            _require_table(cur, "mp_replies")
            cur.execute(
                """
                INSERT INTO mp_replies (politician_id, subject_type, subject_ref, body_lt, verified)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (payload.politician_id, payload.subject_type, payload.subject_ref, payload.body_lt, payload.verified),
            )
            row = cur.fetchone()
        conn.commit()
    return {"status": "ok", "id": str(row["id"])}
