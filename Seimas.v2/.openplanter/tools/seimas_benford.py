#!/usr/bin/env python3
"""CLI wrapper: Benford's Law analysis (Engine 02)."""
from __future__ import annotations

import argparse
import json
import sys

from _bootstrap import ensure_skaidrumas_path, load_env


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Benford forensic analysis on MP declarations.")
    parser.add_argument("--dry-run", action="store_true", help="Validate imports without connecting to DB.")
    args = parser.parse_args()

    if args.dry_run:
        load_env()
        ensure_skaidrumas_path()
        import analysis.benford_engine  # noqa: F401 — import path check
        print(json.dumps({"status": "dry_run", "mps_analyzed": 0}))
        return

    load_env()
    ensure_skaidrumas_path()
    from analysis.benford_engine import run_benford_analysis

    n = run_benford_analysis()
    print(json.dumps({"status": "ok", "mps_analyzed": n}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}), file=sys.stderr)
        sys.exit(1)
