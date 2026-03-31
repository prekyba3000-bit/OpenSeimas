from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_validator_module():
    module_path = (
        Path(__file__).resolve().parents[1]
        / ".openplanter"
        / "tools"
        / "validate_wiki_identity.py"
    )
    spec = importlib.util.spec_from_file_location("validate_wiki_identity", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_wiki(path: Path, mp_id: str, generated_at: str) -> None:
    path.write_text(
        (
            "---\n"
            f"mp_id: {mp_id}\n"
            "display_name: Test MP\n"
            "risk_level: High\n"
            f"generated_at: {generated_at}\n"
            "source: sql\n"
            "---\n"
            "## Summary\n"
            "Test\n"
        ),
        encoding="utf-8",
    )


def test_batch_pass_all_valid(tmp_path: Path):
    mod = _load_validator_module()
    wikis_dir = tmp_path / "wikis"
    wikis_dir.mkdir()
    u1 = "67835f9f-16a1-4151-a938-4bf84fb34a38"
    u2 = "18d2ac9d-69d3-431d-8e8c-0bff1586a387"
    _write_wiki(wikis_dir / f"{u1}.md", u1, "2026-03-31T10:00:00+00:00")
    _write_wiki(wikis_dir / f"{u2}.md", u2, "2026-03-31T10:05:00+00:00")

    result = mod.validate_batch(
        dir_path=str(wikis_dir),
        session_start="2026-03-31T09:00:00+00:00",
    )
    assert result["status"] == "PASS"
    assert result["total_files"] == 2
    assert result["identity_failures"] == 0
    assert result["stale_warnings"] == 0


def test_batch_warn_for_stale_content(tmp_path: Path):
    mod = _load_validator_module()
    wikis_dir = tmp_path / "wikis"
    wikis_dir.mkdir()
    u1 = "67835f9f-16a1-4151-a938-4bf84fb34a38"
    _write_wiki(wikis_dir / f"{u1}.md", u1, "2026-03-30T10:00:00+00:00")

    result = mod.validate_batch(
        dir_path=str(wikis_dir),
        session_start="2026-03-31T09:00:00+00:00",
    )
    assert result["status"] == "WARN"
    assert result["identity_failures"] == 0
    assert result["stale_warnings"] == 1


def test_batch_fail_for_identity_mismatch(tmp_path: Path):
    mod = _load_validator_module()
    wikis_dir = tmp_path / "wikis"
    wikis_dir.mkdir()
    u1 = "67835f9f-16a1-4151-a938-4bf84fb34a38"
    other = "18d2ac9d-69d3-431d-8e8c-0bff1586a387"
    _write_wiki(wikis_dir / f"{u1}.md", other, "2026-03-31T10:00:00+00:00")

    result = mod.validate_batch(
        dir_path=str(wikis_dir),
        session_start="2026-03-31T09:00:00+00:00",
    )
    assert result["status"] == "FAIL"
    assert result["identity_failures"] == 1


def test_batch_fail_when_all_expected_missing(tmp_path: Path):
    mod = _load_validator_module()
    wikis_dir = tmp_path / "wikis"
    wikis_dir.mkdir()
    expected = ["67835f9f-16a1-4151-a938-4bf84fb34a38"]

    result = mod.validate_batch(
        dir_path=str(wikis_dir),
        session_start="2026-03-31T09:00:00+00:00",
        expected_mp_ids=expected,
    )
    assert result["status"] == "FAIL"
    assert result["missing_expected"] == expected
    assert result["missing_expected_count"] == 1
