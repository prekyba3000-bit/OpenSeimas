"""What every validated endpoint sends when the database finds nothing.

Fixtures captured from real members SAMPLE the null-space: a field that only
goes null under conditions no current member is in stays invisible until
someone refreshes them. These payloads are built by handing the real route
functions a cursor that returns nothing, which explores that space instead.

No database and no network, so this runs on every `pytest` and cannot go stale.
That is the whole point — it is the layer the captured fixtures could not be.

Each payload is committed as a golden file under contracts/fixtures/ and
compared against a fresh build, so a change in shape fails here rather than
reaching the client as a surprise. `wireContract.test.ts` then parses the same
files with the matching zod schema: if a schema cannot read a maximally
degraded payload, one empty table blanks that surface for everyone.

Regenerate after an intended shape change:

    .venv/bin/python -m tests.regen_degraded

Two things this has already caught, neither visible to any hand-written or
member-captured fixture:

  - `mp.active` and `mp.photo` come from nullable columns and the schema
    demanded a boolean and a string. No row has them null today.
  - `/api/mps/{id}/activity` queried `speeches` unguarded while guarding the
    two lists beside it, so an absent table meant a 500 there and a clean
    degradation everywhere else — and `press_releases: []` could not be told
    apart from "we cannot see the table".
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest import mock

import pytest

from tests.degraded import empty_db, null_paths

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "contracts" / "fixtures"
MP_ID = "00000000-0000-0000-0000-000000000000"


# politicians marks exactly these NOT NULL, so they survive any degradation.
NOT_NULL = {
    "id": MP_ID,
    "mp_id": MP_ID,
    "display_name": "Testinis Narys",
    "full_name_normalized": "testinis narys",
}


def _profile() -> dict:
    from backend.hero_engine import calculate_hero_profile
    from tests.degraded import empty_cursor

    return calculate_hero_profile(MP_ID, empty_cursor(present=NOT_NULL))


def _route(name: str, tables_present: bool):
    import backend.routes_public as rp

    with mock.patch.object(rp, "get_db_conn", empty_db(tables_present)):
        return {
            "activity": lambda: rp.get_mp_activity(MP_ID),
            "diary": lambda: rp.get_mp_diary(MP_ID),
            "faction-alignment": lambda: rp.get_mp_faction_alignment(MP_ID),
        }[name]()


# (fixture stem, client zod schema, builder)
CASES: tuple[tuple[str, str, object], ...] = (
    ("heroes-degraded", "mpProfileSchema", _profile),
    ("degraded-activity-empty", "mpActivitySchema", lambda: _route("activity", True)),
    ("degraded-activity-absent", "mpActivitySchema", lambda: _route("activity", False)),
    ("degraded-diary-empty", "mpDiarySchema", lambda: _route("diary", True)),
    ("degraded-diary-absent", "mpDiarySchema", lambda: _route("diary", False)),
    ("degraded-alignment-empty", "factionAlignmentSchema",
     lambda: _route("faction-alignment", True)),
    ("degraded-alignment-absent", "factionAlignmentSchema",
     lambda: _route("faction-alignment", False)),
)


def golden(stem: str) -> Path:
    return FIXTURE_DIR / f"{stem}.json"


@pytest.mark.parametrize("stem,schema,build", CASES)
def test_an_empty_database_does_not_raise(stem, schema, build):
    """Every one of these tables has been empty at some point in this project's
    life. A route that raises instead of degrading is a 500 on a public page."""
    assert build() is not None


@pytest.mark.parametrize("stem,schema,build", CASES)
def test_golden_file_matches_a_fresh_build(stem, schema, build):
    path = golden(stem)
    assert path.exists(), f"missing golden file: {path.name} — run tests.regen_degraded"
    committed = json.loads(path.read_text(encoding="utf-8"))
    assert committed["payload"] == build(), (
        f"{stem}: the degraded payload shape changed. Regenerate with "
        f"`python -m tests.regen_degraded` and check the client schema still "
        f"parses it — that is the step that has been missed twice."
    )
    assert committed["schema"] == schema, f"{stem}: golden file names the wrong schema"


def test_no_metric_is_invented_from_an_empty_database():
    """The trust floor at its widest setting: with no data at all, no metric may
    arrive as a number. A 0.0 here is a fabricated figure about a named person
    on every degraded surface."""
    nulls = set(null_paths(_profile()))
    assert "metrics.party_loyalty" in nulls, "party_loyalty produced a value from nothing"

    alignment = _route("faction-alignment", True)
    assert alignment["alignment_pct"] is None, "alignment_pct produced a value from nothing"


def test_absent_and_empty_are_different_payloads():
    """`missing` vs `unpublished` (charter §1.2), at the endpoint level.

    A table we cannot see and a table with no rows for this member are different
    facts. If these two payloads were identical the distinction would exist only
    in the comments.
    """
    for name in ("activity", "diary"):
        absent = _route(name, tables_present=False)
        empty = _route(name, tables_present=True)
        assert absent != empty, (
            f"/{name} returns the same payload whether the table is absent or "
            f"merely empty — 'we cannot tell' is being rendered as 'there are none'"
        )


def test_every_list_that_can_be_unknown_is_null_when_absent():
    """The specific asymmetry that shipped: travel and staff were guarded by
    to_regclass while press releases were not."""
    absent = _route("activity", tables_present=False)
    for key in ("travel", "press_releases", "staff"):
        assert absent[key] is None, (
            f"activity.{key} is {absent[key]!r} when its table is absent; it "
            f"should be null, because [] asserts we looked and found none"
        )


def test_the_payloads_are_actually_degraded():
    """Guards the guard: if the stub ever starts returning real-looking data
    these tests would pass while checking nothing."""
    assert len(set(null_paths(_profile()))) >= 10, "profile is no longer degraded"
    absent = _route("activity", tables_present=False)
    assert all(absent[k] is None for k in ("travel", "press_releases", "staff"))
