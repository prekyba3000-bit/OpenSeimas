#!/usr/bin/env python3
"""Wiki identity validator (single file + batch session audit).

Single-file mode checks:
  1. File has YAML frontmatter (--- delimiters).
  2. Frontmatter contains `mp_id`.
  3. `mp_id` equals filename UUID stem.
  4. If --expected-mp-id is provided, it matches frontmatter.

Batch mode adds session health gates:
  - FAIL: identity contract violations.
  - FAIL: 100% of expected files missing.
  - WARN: stale content, partial missing expected files, or orphan files.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _fail(reason: str) -> dict:
    return {"status": "FAIL", "reason": reason}


def _parse_frontmatter(content: str) -> tuple[dict[str, str], str | None]:
    if not content.startswith("---"):
        return {}, "Missing YAML frontmatter (file must start with '---')."
    fm_end = content.find("---", 3)
    if fm_end == -1:
        return {}, "Malformed frontmatter — missing closing '---'."
    frontmatter = content[3:fm_end]
    fields: dict[str, str] = {}
    for raw in frontmatter.splitlines():
        if ":" not in raw:
            continue
        key, value = raw.split(":", 1)
        fields[key.strip()] = value.strip().strip("\"'")
    return fields, None


def _parse_iso8601(value: str) -> datetime | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def validate(path: str, expected_mp_id: str | None = None) -> dict:
    p = Path(path)
    if not p.is_file():
        return _fail(f"File not found: {path}")

    stem = p.stem
    if not _UUID_RE.match(stem):
        return _fail(f"Filename stem '{stem}' is not a valid UUID.")

    try:
        content = p.read_text(encoding="utf-8")
    except OSError as exc:
        return _fail(f"Cannot read file: {exc}")

    fields, fm_err = _parse_frontmatter(content)
    if fm_err:
        return _fail(fm_err)
    fm_uuid = fields.get("mp_id")
    if not fm_uuid:
        return _fail("Frontmatter missing required 'mp_id' field.")

    if fm_uuid.lower() != stem.lower():
        return _fail(
            f"UUID mismatch: filename stem is '{stem}' but "
            f"frontmatter mp_id is '{fm_uuid}'."
        )

    if expected_mp_id and fm_uuid.lower() != expected_mp_id.lower():
        return _fail(
            f"Expected mp_id '{expected_mp_id}' but "
            f"frontmatter contains '{fm_uuid}'."
        )

    result = {
        "status": "PASS",
        "mp_id": fm_uuid,
        "path": str(p),
    }
    generated_at = fields.get("generated_at")
    if generated_at:
        result["generated_at"] = generated_at
    return result


def validate_batch(
    dir_path: str,
    session_start: str | None = None,
    expected_mp_ids: list[str] | None = None,
    stale_threshold_hours: int = 6,
) -> dict:
    root = Path(dir_path)
    if not root.is_dir():
        return _fail(f"Directory not found: {dir_path}")

    session_start_dt = _parse_iso8601(session_start) if session_start else None
    stale_seconds = max(1, stale_threshold_hours) * 3600
    expected = [x.lower() for x in (expected_mp_ids or [])]

    files = sorted(root.glob("*.md"))
    identity_failures: list[dict[str, str]] = []
    stale_warnings: list[dict[str, str]] = []
    valid_ids: list[str] = []
    all_uuid_stems: list[str] = []

    for path in files:
        if _UUID_RE.match(path.stem):
            all_uuid_stems.append(path.stem.lower())
        result = validate(str(path))
        if result["status"] != "PASS":
            identity_failures.append(
                {"path": str(path), "reason": result.get("reason", "unknown validation error")},
            )
            continue
        mp_id = str(result.get("mp_id", "")).lower()
        if mp_id:
            valid_ids.append(mp_id)
        if session_start_dt:
            generated_at = str(result.get("generated_at", "")).strip()
            generated_dt = _parse_iso8601(generated_at) if generated_at else None
            if generated_dt is None:
                stale_warnings.append(
                    {"path": str(path), "reason": "missing or invalid generated_at"},
                )
            else:
                age_seconds = (session_start_dt - generated_dt).total_seconds()
                if age_seconds > stale_seconds:
                    stale_warnings.append(
                        {
                            "path": str(path),
                            "reason": (
                                f"generated_at ({generated_at}) is older than "
                                f"{stale_threshold_hours}h before session_start ({session_start})."
                            ),
                        },
                    )

    missing_expected = sorted([mp for mp in expected if mp not in valid_ids])
    orphan_files = sorted([mp for mp in all_uuid_stems if expected and mp not in expected])

    hard_failures = len(identity_failures)
    missing_all_expected = len(expected) > 0 and len(missing_expected) == len(expected)

    status = "PASS"
    if hard_failures > 0 or missing_all_expected:
        status = "FAIL"
    elif stale_warnings or missing_expected or orphan_files:
        status = "WARN"

    return {
        "status": status,
        "total_files": len(files),
        "valid_identities": len(valid_ids),
        "identity_failures": hard_failures,
        "identity_failure_details": identity_failures,
        "stale_warnings": len(stale_warnings),
        "stale_warning_details": stale_warnings,
        "expected_total": len(expected),
        "missing_expected_count": len(missing_expected),
        "missing_expected": missing_expected,
        "orphan_count": len(orphan_files),
        "orphan_files": orphan_files,
        "stale_threshold_hours": stale_threshold_hours,
        "session_start": session_start,
        "missing_all_expected": missing_all_expected,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate wiki file UUID identity consistency.",
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="Run batch session audit over a wiki directory.",
    )
    parser.add_argument("--path", default=None, help="Path to one wiki .md file.")
    parser.add_argument(
        "--dir",
        default="dashboard/public/wikis",
        help="Directory for batch mode (default: dashboard/public/wikis).",
    )
    parser.add_argument(
        "--expected-mp-id",
        action="append",
        default=[],
        help=(
            "Expected UUID. Repeat for multiple values. In single-file mode, the first value "
            "is used for strict equality check."
        ),
    )
    parser.add_argument(
        "--session-start",
        default=None,
        help="ISO-8601 timestamp for staleness checks (batch mode).",
    )
    parser.add_argument(
        "--stale-threshold-hours",
        type=int,
        default=6,
        help="Staleness threshold in hours for WARN classification (batch mode).",
    )
    args = parser.parse_args()

    if args.batch:
        result = validate_batch(
            dir_path=args.dir,
            session_start=args.session_start,
            expected_mp_ids=args.expected_mp_id or None,
            stale_threshold_hours=args.stale_threshold_hours,
        )
    else:
        if not args.path:
            parser.error("--path is required unless --batch is provided.")
        expected = args.expected_mp_id[0] if args.expected_mp_id else None
        result = validate(args.path, expected)

    print(json.dumps(result))
    sys.exit(0 if result["status"] in {"PASS", "WARN"} else 1)


if __name__ == "__main__":
    main()
