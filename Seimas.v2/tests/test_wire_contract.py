"""The nullable wire contract, checked against real captured payloads.

Why this exists: the same defect shipped twice in one session. The backend
widened a value to null, the client's zod schema still required a number, the
parse failed, and the profile page went blank for 9 members. Both suites were
green the whole time — every fixture in them was written by hand, and nobody
hand-writes the awkward case.

Two layers:

  1. This file checks that every null appearing in a REAL payload is declared in
     contracts/wire-nullability.json. Derived from captured evidence, not from
     anyone's memory, so forgetting to declare a newly-nullable field fails here.
  2. dashboard/src/services/wireContract.test.ts then takes each declared path,
     sets it to null, and requires the zod schema to accept it. That is the
     check that would have caught both bugs at edit time.

Refresh the fixtures with `scripts/refresh_wire_fixtures.py` (needs DB_DSN and
network). These tests need neither.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "wire-nullability.json"
FIXTURE_DIR = ROOT / "contracts" / "fixtures"


def _contract() -> dict:
    return json.loads(CONTRACT.read_text(encoding="utf-8"))


def _declared_paths() -> set[str]:
    return set(_contract()["endpoints"]["heroes_profile"]["nullable_paths"])


def _fixtures() -> list[tuple[str, dict]]:
    return [
        (p.name, json.loads(p.read_text(encoding="utf-8")))
        for p in sorted(FIXTURE_DIR.glob("heroes-*.json"))
    ]


def _null_paths(obj, prefix: str = ""):
    """Every dotted path in the payload whose value is null."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _null_paths(v, f"{prefix}.{k}" if prefix else k)
    elif obj is None:
        yield prefix


def test_fixtures_exist():
    """A deleted fixture set would make every check below vacuously pass."""
    assert _fixtures(), "no captured payloads — run scripts/refresh_wire_fixtures.py"


def test_the_fixture_set_covers_more_than_the_happy_path():
    """A set of four ordinary members proves nothing. At least one fixture must
    carry a null the ordinary member does not."""
    by_name = dict(_fixtures())
    ordinary = set(_null_paths(by_name["heroes-ordinary.json"]["payload"]))
    awkward = {
        name: set(_null_paths(f["payload"]))
        for name, f in by_name.items()
        if name != "heroes-ordinary.json"
    }
    assert any(paths - ordinary for paths in awkward.values()), (
        "every fixture has the same nulls as the ordinary member — the edge "
        "cases are not being captured"
    )


@pytest.mark.parametrize("name,fixture", _fixtures())
def test_every_observed_null_is_declared(name, fixture):
    """The check that catches a widening someone forgot to declare.

    If this fails the fix is one line in contracts/wire-nullability.json — and
    adding it makes the dashboard test verify the zod schema accepts it.
    """
    observed = set(_null_paths(fixture["payload"]))
    undeclared = observed - _declared_paths()
    assert not undeclared, (
        f"{name} ({fixture.get('_captured_mp')}) carries nulls that the wire "
        f"contract does not declare: {sorted(undeclared)}. Declare them in "
        f"contracts/wire-nullability.json — and check the zod schema accepts "
        f"null there, which is the step that has been missed twice."
    )


def test_declared_paths_are_real():
    """The contract must not name fields that no longer exist. A stale entry is
    a check that silently stops checking anything."""
    seen: set[str] = set()

    def walk(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f"{prefix}.{k}" if prefix else k
                seen.add(path)
                walk(v, path)

    for _, fixture in _fixtures():
        walk(fixture["payload"])

    stale = _declared_paths() - seen
    assert not stale, (
        f"contract declares paths absent from every captured payload: "
        f"{sorted(stale)}. Either the field was removed, or the fixtures are "
        f"stale — refresh them before deleting the declaration."
    )


def test_every_declaration_carries_a_reason():
    """„nullable" without a why is a line nobody can safely delete later."""
    for path, reason in _contract()["endpoints"]["heroes_profile"]["nullable_paths"].items():
        assert isinstance(reason, str) and len(reason.strip()) > 20, (
            f"{path} is declared nullable with no usable reason"
        )
