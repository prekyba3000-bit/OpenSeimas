"""Shared utilities for the `Seimas.v2.pipeline` package.

Keep utilities minimal and dependency-free so scripts can adopt them gradually.
"""
from __future__ import annotations

import logging
import os
import uuid
from contextlib import contextmanager
from typing import Dict, Optional


def setup_logging(level: int = logging.INFO) -> None:
    """Configure basic logging for pipeline scripts.

    Call early in CLI-based runs to ensure consistent logging output.
    """
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def load_env_config(prefix: str = "SEIMAS_") -> Dict[str, str]:
    """Load simple configuration from environment variables.

    Returns a dict of keys without the prefix. Example: `SEIMAS_DB_URL` -> {"DB_URL": "..."}
    """
    out: Dict[str, str] = {}
    for k, v in os.environ.items():
        if k.startswith(prefix):
            out[k[len(prefix):]] = v
    return out


def get_db_url_from_env() -> Optional[str]:
    """Convenience helper that returns `DB_URL` from `SEIMAS_DB_URL` if present."""
    cfg = load_env_config()
    return cfg.get("DB_URL")


__all__ = [
    "setup_logging",
    "load_env_config",
    "get_db_url_from_env",
    "job_id",
    "record_fetch",
]


# ─── Provenance ──────────────────────────────────────────────────────────────
# V.4 plan §2.2: "Provenance or it doesn't ship." Every ingest records what it
# fetched, from where, when, and how many rows resulted, so a reader can check
# our numbers instead of trusting them.

_JOB_ID: Optional[str] = None


def job_id() -> str:
    """Stable identifier for this pipeline run, shared by every step in it."""
    global _JOB_ID
    if _JOB_ID is None:
        _JOB_ID = os.environ.get("PIPELINE_JOB_ID") or uuid.uuid4().hex[:12]
    return _JOB_ID


def _scalar(row):
    """First column, whether the cursor yields tuples or RealDictRow."""
    if row is None:
        return None
    if isinstance(row, dict):
        return next(iter(row.values()))
    return row[0]


@contextmanager
def record_fetch(conn, source_name: str, source_url: Optional[str] = None):
    """Record one ingest step in `source_fetches`.

    Usage:
        with record_fetch(conn, "seimas_registrations", url) as fetch:
            ...
            fetch["rows"] = n

    Failures are recorded with their error and re-raised — a run that half
    failed must not look identical to one that succeeded. If the table is
    absent (migrations not yet applied) this degrades to a no-op with a
    warning rather than breaking ingestion.
    """
    log = logging.getLogger("pipeline.provenance")
    result: Dict[str, int] = {"rows": 0}
    cur = conn.cursor()
    cur.execute("SELECT to_regclass('public.source_fetches')")
    if _scalar(cur.fetchone()) is None:
        log.warning("source_fetches missing — provenance not recorded for %s", source_name)
        yield result
        return

    cur.execute(
        """
        INSERT INTO source_fetches (source_name, source_url, job_id, status)
        VALUES (%s, %s, %s, 'running') RETURNING id
        """,
        (source_name, source_url, job_id()),
    )
    fetch_id = _scalar(cur.fetchone())
    conn.commit()

    try:
        yield result
    except Exception as exc:
        cur.execute(
            "UPDATE source_fetches SET status='error', error=%s, rows_affected=%s, finished_at=NOW() WHERE id=%s",
            (str(exc)[:2000], result.get("rows", 0), fetch_id),
        )
        conn.commit()
        raise
    # parsed/inserted/manifest are optional: a caller that does not set them
    # leaves NULL, and the reconciliation check skips NULL rather than reading
    # an unmeasured run as a mismatch.
    cur.execute(
        """
        UPDATE source_fetches
        SET status='ok', rows_affected=%s, finished_at=NOW(),
            parsed_count = COALESCE(%s, parsed_count),
            inserted_count = COALESCE(%s, inserted_count),
            manifest_id = COALESCE(%s, manifest_id),
            reconciliation_note = COALESCE(%s, reconciliation_note)
        WHERE id=%s
        """,
        (result.get("rows", 0), result.get("parsed"), result.get("inserted"),
         result.get("manifest_id"), result.get("note"), fetch_id),
    )
    conn.commit()

# ─── Source snapshots ────────────────────────────────────────────────────────
# Every fetch is hashed before it is parsed. lrs.lt sends neither ETag nor
# Last-Modified, so "has this feed changed" has no server-side answer — the
# only available one is a hash of the bytes we received, compared to the last
# hash we recorded.
#
# The manifest row is the durable artifact. Payload bytes are NOT written here:
# Render's disk is ephemeral, and the storage layout is proposed in
# docs/reviews/wave1-data-health.md for review before anything writes files.
# `snapshot_path()` returns where a payload WOULD go, so the layout is fixed in
# one place when that is approved.

SNAPSHOT_PARSER_VERSION = "1"


def sha256_bytes(payload: bytes) -> str:
    import hashlib
    return hashlib.sha256(payload).hexdigest()


# The p2b feeds stamp their own generation time into the root element:
#   <SeimoInformacija ... suformavimo_laikas="2026-08-24 04:54:36" ...>
# Two fetches seconds apart are byte-identical except for those digits, so a
# raw hash answers "did this change" with yes, always. Verified against
# p2b.ad_seimo_sesijos: two 1048-byte payloads differing at one offset.
_VOLATILE_ATTRS = (rb'suformavimo_laikas="[^"]*"',)


def canonical_bytes(payload: bytes) -> bytes:
    """Payload with feed-generation noise removed, for change detection."""
    import re
    out = payload
    for pattern in _VOLATILE_ATTRS:
        out = re.sub(pattern, b'suformavimo_laikas=""', out)
    return out


def content_sha256(payload: bytes) -> str:
    return sha256_bytes(canonical_bytes(payload))


def snapshot_path(source: str, digest: str, suffix: str = ".xml") -> str:
    """Content-addressed location for a payload. Nothing writes this yet."""
    # Sharded by the first two hex characters: a flat directory of tens of
    # thousands of files is slow to list and unpleasant in git tooling.
    return f"snapshots/{source}/{digest[:2]}/{digest}{suffix}"


def record_snapshot(conn, source: str, url: str, payload: bytes,
                    parser_version: str = SNAPSHOT_PARSER_VERSION,
                    fetch_status: str = "ok", error: Optional[str] = None):
    """Append a manifest row for one fetch. Returns (manifest_id, digest, unchanged).

    `unchanged` is True when this exact byte-sequence was already recorded for
    this source — the client-side replacement for a 304.

    Degrades to a no-op when the table is absent (migration 027 not yet applied)
    so ingestion keeps working rather than failing on provenance.
    """
    log = logging.getLogger("pipeline.provenance")
    digest = sha256_bytes(payload)
    content_digest = content_sha256(payload)
    cur = conn.cursor()
    cur.execute("SELECT to_regclass('public.snapshot_manifest')")
    if _scalar(cur.fetchone()) is None:
        log.warning("snapshot_manifest missing — snapshot not recorded for %s", source)
        return None, digest, False

    # Compared on the canonical hash: the raw one differs on every fetch.
    cur.execute(
        "SELECT 1 FROM snapshot_manifest WHERE source = %s AND content_sha256 = %s LIMIT 1",
        (source, content_digest),
    )
    unchanged = cur.fetchone() is not None

    cur.execute(
        """
        INSERT INTO snapshot_manifest
            (source, url, sha256, content_sha256, byte_count, parser_version, fetch_status, error)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (source, url, digest, content_digest, len(payload), parser_version,
         "unchanged" if unchanged and fetch_status == "ok" else fetch_status, error),
    )
    manifest_id = _scalar(cur.fetchone())
    conn.commit()
    return manifest_id, digest, unchanged
