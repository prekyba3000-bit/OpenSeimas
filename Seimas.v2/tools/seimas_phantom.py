#!/usr/bin/env python3
"""CLI wrapper: Phantom network / indirect corporate link analysis (Engine 04)."""
from __future__ import annotations

import argparse
import json
import sys

from _bootstrap import ensure_skaidrumas_path, load_env


def main() -> None:
    parser = argparse.ArgumentParser(description="Run phantom network analysis on MP business links.")
    parser.add_argument("--dry-run", action="store_true", help="Validate imports without connecting to DB.")
    args = parser.parse_args()

    if args.dry_run:
        load_env()
        ensure_skaidrumas_path()
        import analysis.phantom_network  # noqa: F401
        print(json.dumps({"status": "dry_run", "links_detected": 0}))
        return

    load_env()
    ensure_skaidrumas_path()
    from analysis.phantom_network import run_phantom_network_analysis

    n = run_phantom_network_analysis()
    print(json.dumps({"status": "ok", "links_detected": n}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}), file=sys.stderr)
        sys.exit(1)
