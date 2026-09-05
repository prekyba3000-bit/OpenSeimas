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
from contextlib import contextmanager
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


# `votes` marks exactly these NOT NULL. Every other column a vote page reads —
# sitting_date, title, description, url, result_type — is nullable, and four of
# the five are null on all 5,286 rows in production today.
VOTE_NOT_NULL = {
    "id": 1,
    "seimas_vote_id": 1,
    # The per-member rows joined onto the vote. politicians.display_name is NOT
    # NULL; current_party and mp_votes.vote_choice are not, and both are null in
    # production — the faction for the 9 members who sit in none, the choice on
    # 408,827 of 744,495 rows. Together they produce the `{"null": {"null": 1}}`
    # shape the live endpoint really serves, which is why this row exists rather
    # than an empty list.
    "mp_id": MP_ID,
    "display_name": "Testinis Narys",
}

# One member with everything absent that is allowed to be absent. `politicians`
# marks only id, full_name_normalized and display_name NOT NULL; `vote_count` is
# `COALESCE(s.total_votes_cast, 0)`, which the query itself makes non-null.
# Everything else — faction, photo, is_active, attendance, vote mode, both
# mandate dates — is nullable, and this is the row that says so.
MP_ROW = {
    "id": MP_ID,
    "display_name": "Testinis Narys",
    "full_name_normalized": "testinis narys",
    "vote_count": 0,
}


class _FakeRequest:
    """Enough of a Request for the rate limiter, which reads headers and a peer.

    /api/stats is the only one of the three that takes a Request at all, and it
    takes it solely to bucket the caller. Handing it a real Request would mean
    standing up Starlette's scope machinery to exercise five COUNT queries.
    """

    def __init__(self):
        self.headers = {}
        self.client = type("C", (), {"host": "127.0.0.1"})()


def _route(name: str, tables_present: bool, present: dict | None = None,
           rows_for: str | None = None):
    import backend.routes_public as rp
    from tests.degraded import empty_cursor

    @contextmanager
    def db():
        conn = mock.MagicMock()
        conn.cursor.return_value = empty_cursor(tables_present, present, rows_for)
        yield conn

    with mock.patch.object(rp, "get_db_conn", db), \
            mock.patch.object(rp, "check_rate_limit", lambda ip: True):
        return {
            "activity": lambda: rp.get_mp_activity(MP_ID),
            "diary": lambda: rp.get_mp_diary(MP_ID),
            "faction-alignment": lambda: rp.get_mp_faction_alignment(MP_ID),
            "stats": lambda: rp.get_stats(_FakeRequest()),
            "mps": lambda: rp.get_mps(),
            "vote": lambda: rp.get_vote("1"),
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
    # The three v1 endpoints, unvalidated until 2026-09-05. /api/stats is all
    # aggregates, so its degraded payload is zeroes rather than nulls — an
    # honest count of an empty table, not an invented figure.
    ("degraded-stats", "dashboardStatsSchema", lambda: _route("stats", True)),
    # `rows_for` because an empty list parses against every array schema and so
    # checks nothing. The payload worth committing is one member with no
    # faction, no photo, no attendance and no vote mode — 9 of 148 members have
    # the first of those in production today.
    ("degraded-mps", "mpSummaryListSchema",
     lambda: _route("mps", True, present=MP_ROW, rows_for="FROM politicians p")),
    ("degraded-vote", "voteDetailSchema",
     lambda: _route("vote", True, present=VOTE_NOT_NULL, rows_for="FROM mp_votes mv")),
)


def golden(stem: str) -> Path:
    return FIXTURE_DIR / f"{stem}.json"


@pytest.mark.parametrize("stem,schema,build", CASES)
def test_an_empty_database_does_not_raise(stem, schema, build):
    """Every one of these tables has been empty at some point in this project's
    life. A route that raises instead of degrading is a 500 on a public page."""
    assert build() is not None


def on_the_wire(payload):
    """What the client receives, not what the route returned.

    JSON is not a superset of Python, and the difference has already shipped a
    defect: a dict keyed by `None` serialises to the key `"null"`, because a
    JSON object key cannot be null. `/api/votes/{id}` keys `party_stats` by
    faction and `stats` by vote choice, both of which are nullable, and the vote
    page grew a row labelled „null" the moment the Speaker's faction became
    NULL.

    Comparing Python objects would have compared `{None: 1}` with `{None: 1}`
    and seen nothing wrong. The contract is the bytes, so the fixtures record
    the bytes and the comparison round-trips.
    """
    return json.loads(json.dumps(payload))


@pytest.mark.parametrize("stem,schema,build", CASES)
def test_golden_file_matches_a_fresh_build(stem, schema, build):
    path = golden(stem)
    assert path.exists(), f"missing golden file: {path.name} — run tests.regen_degraded"
    committed = json.loads(path.read_text(encoding="utf-8"))
    assert committed["payload"] == on_the_wire(build()), (
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
    # Attendance was 0.0 here from the day this fixture was committed, and the
    # fixture was read as a shape rather than as evidence. `resolve_attendance`
    # ended `float(v1_value or 0)`, and the SELECT above it coalesced the column
    # to 0, so a member the summary view had not covered was published as having
    # attended nothing. Of every figure this project prints beside a name, that
    # is the one that accuses.
    assert "metrics.attendance_percentage" in nulls, (
        "attendance_percentage produced 0.0 from an empty database — that reads "
        "as 'never showed up', not as 'not enough data'"
    )

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
