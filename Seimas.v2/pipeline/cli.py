"""Small CLI runner for the `Seimas.v2.pipeline` package.

Usage examples:
  python -m Seimas.v2.pipeline.cli --list
  python -m Seimas.v2.pipeline.cli ingest_votes_v2 -- --arg value

The CLI imports a chosen module from the package and calls `main(args)` or `run(args)`
if present. Remaining args are passed through as a list.
"""
from __future__ import annotations

import argparse
import importlib
import logging
import pkgutil
import sys
from typing import List

try:
    from . import common
except ImportError:
    import common



def list_modules() -> List[str]:
    pkg_name = __package__ or "pipeline"
    if pkg_name in sys.modules:
        package_path = sys.modules[pkg_name].__path__
    else:
        package_path = [os.path.dirname(os.path.abspath(__file__))]
    return sorted(
        name
        for _, name, _ in pkgutil.iter_modules(package_path)
        if name.startswith(("ingest", "link", "compute", "tag"))
    )


def run_module(name: str, args: List[str]) -> int:
    pkg_name = __package__ or "pipeline"
    try:
        mod = importlib.import_module(f".{name}", package=pkg_name)
    except (ImportError, ValueError):
        mod = importlib.import_module(f"pipeline.{name}")
    if hasattr(mod, "main"):
        return mod.main(args) or 0
    if hasattr(mod, "run"):
        return mod.run(args) or 0
    print(f"Module '{name}' has no callable 'main' or 'run'.")
    return 2



def main() -> None:
    parser = argparse.ArgumentParser(description="Run a pipeline module from the package")
    parser.add_argument("module", nargs="?", help="module name to run")
    parser.add_argument("--list", action="store_true", help="list available modules")
    parser.add_argument("--log-level", default="INFO", help="logging level")
    parsed, remaining = parser.parse_known_args()
    common.setup_logging(getattr(logging, parsed.log_level.upper(), logging.INFO))

    if parsed.list:
        for m in list_modules():
            print(m)
        sys.exit(0)

    if not parsed.module:
        parser.print_help()
        sys.exit(1)

    code = run_module(parsed.module, remaining)
    sys.exit(code)


if __name__ == "__main__":
    main()
