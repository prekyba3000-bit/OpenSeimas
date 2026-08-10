"""Shared utilities for the `Seimas.v2.pipeline` package.

Keep utilities minimal and dependency-free so scripts can adopt them gradually.
"""
from __future__ import annotations

import logging
import os
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


__all__ = ["setup_logging", "load_env_config", "get_db_url_from_env"]
