#!/usr/bin/env python3
"""CLI wrapper: Chrono-forensics amendment analysis (Engine 01)."""
from __future__ import annotations

import argparse
import json
import sys

from _bootstrap import ensure_skaidrumas_path, load_env


def main() -> None:
    parser = argparse.ArgumentParser(description="Run chrono-forensics analysis on amendments.")
    parser.add_argument("--dry-run", action="store_true", help="Validate imports without connecting to DB.")
    args = parser.parse_args()

    if args.dry_run:
        load_env()
        ensure_skaidrumas_path()
        import analysis.chrono_forensics  # noqa: F401
        print(json.dumps({"status": "dry_run", "profiles_written": 0}))
        return

    load_env()
    ensure_skaidrumas_path()
    from analysis.chrono_forensics import run_chrono_analysis

    n = run_chrono_analysis()
    print(json.dumps({"status": "ok", "profiles_written": n}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}), file=sys.stderr)
        sys.exit(1)
