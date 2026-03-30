"""Shared path and env setup for Seimas forensic CLI tools."""
from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(REPO_ROOT / ".env")
    parent_env = REPO_ROOT.parent / ".env"
    if parent_env.is_file():
        load_dotenv(parent_env)
    if os.getenv("DB_DSN") and not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = os.environ["DB_DSN"]


def ensure_skaidrumas_path() -> None:
    sk = REPO_ROOT / "skaidrumas"
    s = str(sk)
    if s not in sys.path:
        sys.path.insert(0, s)
