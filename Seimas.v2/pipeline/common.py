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
    cur.execute(
        "UPDATE source_fetches SET status='ok', rows_affected=%s, finished_at=NOW() WHERE id=%s",
        (result.get("rows", 0), fetch_id),
    )
    conn.commit()
