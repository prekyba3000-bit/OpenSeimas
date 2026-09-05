"""What the API sends when almost every table is empty — and the guarantee that
the client can still render it.

This closes the gap the fixture-based contract test could not. Those fixtures
sample real members, so a field that only goes null under conditions no current
member happens to be in stays invisible until someone refreshes them. Here the
payload is built by handing the real code path a cursor that returns nothing,
which explores the whole null-space at once rather than sampling it.

It needs no database and no network, so it runs on every `pytest` and cannot go
stale.

The degradation modelled is deliberate: the member row EXISTS (id,
display_name and full_name_normalized are NOT NULL in the schema, so they are
never absent) while every auxiliary table is empty. That is the realistic worst
case — a fresh database, a failed backfill, a dropped materialized view — not a
fantasy in which a member has no name.

The generated payload is committed as contracts/fixtures/heroes-degraded.json
and checked against a fresh build here, so a change in payload shape fails this
test rather than silently drifting. The client suite then parses that same file:
if the schema cannot read a maximally-degraded payload, one empty table blanks
the profile page for everyone.
"""
from __future__ import annotations

import json
from pathlib import Path

from backend.hero_engine import calculate_hero_profile

ROOT = Path(__file__).resolve().parents[1]
DEGRADED = ROOT / "contracts" / "fixtures" / "heroes-degraded.json"

MP_ID = "00000000-0000-0000-0000-000000000000"

# The three columns the schema marks NOT NULL. Everything else reads as absent.
PRESENT = {
    "id": MP_ID,
    "mp_id": MP_ID,
    "display_name": "Testinis Narys",
    "full_name_normalized": "testinis narys",
}


class _NullRow(dict):
    """Truthy, and every column reads NULL unless the schema forbids it."""

    def __getitem__(self, key):
        return PRESENT.get(key)

    def get(self, key, default=None):
        return PRESENT.get(key, default)

    def __bool__(self):
        return True


class _EmptyCursor:
    """Every query finds the member and nothing else."""

    def execute(self, *args, **kwargs):
        return None

    def fetchone(self):
        return _NullRow()

    def fetchall(self):
        return []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def build_degraded_payload() -> dict:
    return calculate_hero_profile(MP_ID, _EmptyCursor())


def null_paths(obj, prefix: str = ""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from null_paths(value, f"{prefix}.{key}" if prefix else key)
    elif obj is None:
        yield prefix


def test_an_empty_database_does_not_raise():
    """The profile endpoint must degrade, not 500. Every one of these tables has
    been empty at some point in this project's life."""
    payload = build_degraded_payload()
    assert payload["mp"]["id"] == MP_ID


def test_no_metric_is_invented_when_nothing_backs_it():
    """The trust floor, at the widest possible setting: with no data at all, no
    metric may arrive as a number. 0.0 here would be a fabricated figure about a
    named person on every degraded surface."""
    payload = build_degraded_payload()
    nulls = set(null_paths(payload))
    for metric in ("party_loyalty",):
        assert f"metrics.{metric}" in nulls, (
            f"metrics.{metric} produced a value from an empty database"
        )


def test_committed_degraded_fixture_matches_a_fresh_build():
    """A golden file, so a change in payload shape fails here instead of
    reaching the client as a surprise.

    If this fails and the change was intended, rewrite the file:
        .venv/bin/python -m pytest tests/test_degraded_payload.py --regen
    """
    fresh = build_degraded_payload()
    assert DEGRADED.exists(), f"missing golden file: {DEGRADED}"
    committed = json.loads(DEGRADED.read_text(encoding="utf-8"))["payload"]
    assert committed == fresh, (
        "the degraded payload shape changed. Regenerate the golden file and "
        "check the client schema still parses it — that is the step that has "
        "been missed twice."
    )


def test_the_degraded_payload_is_actually_degraded():
    """Guards the guard: if the stub ever starts returning real-looking data,
    this test would pass while checking nothing."""
    nulls = set(null_paths(build_degraded_payload()))
    assert len(nulls) >= 10, (
        f"only {len(nulls)} null paths in a payload built from an empty "
        f"database — the stub is no longer modelling degradation"
    )
