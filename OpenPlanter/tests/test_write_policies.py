"""Tests for workspace write_policies (uuid_frontmatter validator)."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from agent.tools import WorkspaceTools


ROMA_UUID = "67835f9f-16a1-4151-a938-4bf84fb34a38"
IGNAS_UUID = "18d2ac9d-69d3-431d-8e8c-0bff1586a387"


def _setup_workspace(
    tmpdir: str,
    *,
    policies: list[dict] | None = None,
) -> tuple[Path, WorkspaceTools]:
    root = Path(tmpdir)
    op_dir = root / ".openplanter"
    op_dir.mkdir()
    wikis = root / "dashboard" / "public" / "wikis"
    wikis.mkdir(parents=True)
    settings: dict = {
        "workspace_name": "test",
        "tools_dir": ".openplanter/tools",
    }
    if policies is not None:
        settings["write_policies"] = policies
    (op_dir / "settings.json").write_text(
        json.dumps(settings), encoding="utf-8",
    )
    return root, WorkspaceTools(root=root)


VALID_WIKI = (
    f"---\nmp_id: {ROMA_UUID}\ndisplay_name: Roma Janušonienė\n---\n"
    "## Summary\nHigh risk.\n"
)


class TestWritePolicyLoading(unittest.TestCase):
    def test_no_settings_file(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            tools = WorkspaceTools(root=Path(d))
            self.assertEqual(tools._write_policies, [])

    def test_no_policies_key(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            _, tools = _setup_workspace(d)
            self.assertEqual(tools._write_policies, [])

    def test_loads_valid_policies(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            self.assertEqual(len(tools._write_policies), 1)
            self.assertEqual(tools._write_policies[0]["validator"], "uuid_frontmatter")

    def test_rejects_malformed_policies(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            _, tools = _setup_workspace(d, policies=[
                {"path_glob": "*.md"},  # missing validator
                {"validator": "uuid_frontmatter"},  # missing path_glob
                "not a dict",
                42,
            ])
            self.assertEqual(tools._write_policies, [])


class TestUuidFrontmatterValidator(unittest.TestCase):
    def test_allows_correct_frontmatter(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            result = tools.write_file(path, VALID_WIKI)
            self.assertIn("Wrote", result)
            self.assertNotIn("BLOCKED", result)

    def test_blocks_missing_frontmatter(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            result = tools.write_file(path, "## Summary\nNo frontmatter.\n")
            self.assertIn("BLOCKED", result)
            self.assertIn("frontmatter", result.lower())

    def test_blocks_missing_mp_id_field(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            content = "---\ndisplay_name: Roma Janušonienė\n---\n## Summary\n"
            result = tools.write_file(path, content)
            self.assertIn("BLOCKED", result)
            self.assertIn("mp_id", result)

    def test_blocks_uuid_mismatch(self) -> None:
        """The March 27 bug: writing Simonas Gentvilas content to Roma's UUID file."""
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            wrong_content = (
                f"---\nmp_id: {IGNAS_UUID}\n"
                "display_name: Ignas Vėgėlė\n---\n## Summary\n"
            )
            result = tools.write_file(path, wrong_content)
            self.assertIn("BLOCKED", result)
            self.assertIn("UUID mismatch", result)
            self.assertIn(ROMA_UUID, result)
            self.assertIn(IGNAS_UUID, result)

    def test_blocks_malformed_frontmatter(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            content = "---\nmp_id: some-uuid\nno closing delimiter"
            result = tools.write_file(path, content)
            self.assertIn("BLOCKED", result)
            self.assertIn("Malformed", result)

    def test_skips_non_uuid_filenames(self) -> None:
        """index.json or template.md should not be affected."""
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            result = tools.write_file(
                "dashboard/public/wikis/template.md", "# Template\n",
            )
            self.assertIn("Wrote", result)

    def test_skips_paths_outside_glob(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            result = tools.write_file("README.md", "# Readme\n")
            self.assertIn("Wrote", result)

    def test_edit_file_validates_final_content(self) -> None:
        """edit_file must also enforce the policy on the resulting content."""
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            root, tools = _setup_workspace(d, policies=[policy])
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            (root / path).write_text(VALID_WIKI, encoding="utf-8")
            tools.read_file(path)
            result = tools.edit_file(
                path,
                f"mp_id: {ROMA_UUID}",
                f"mp_id: {IGNAS_UUID}",
            )
            self.assertIn("BLOCKED", result)
            self.assertIn("UUID mismatch", result)

    def test_case_insensitive_uuid_match(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            policy = {
                "path_glob": "dashboard/public/wikis/*.md",
                "validator": "uuid_frontmatter",
            }
            _, tools = _setup_workspace(d, policies=[policy])
            upper_uuid = ROMA_UUID.upper()
            content = (
                f"---\nmp_id: {upper_uuid}\n"
                "display_name: Roma Janušonienė\n---\n## Summary\n"
            )
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            result = tools.write_file(path, content)
            self.assertIn("Wrote", result)

    def test_no_policies_allows_everything(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            _, tools = _setup_workspace(d)
            path = f"dashboard/public/wikis/{ROMA_UUID}.md"
            result = tools.write_file(path, "No frontmatter at all\n")
            self.assertIn("Wrote", result)


if __name__ == "__main__":
    unittest.main()
