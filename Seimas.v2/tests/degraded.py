"""A database that finds nothing, for exploring what an endpoint can send.

Fixtures captured from real members SAMPLE the null-space: a field that only
goes null under conditions no current member is in stays invisible until
someone refreshes them. Handing a route a cursor that returns nothing explores
that space instead, and needs no database and no network — so it runs on every
pytest and cannot go stale.

Two degradation modes, because routes branch on them and they mean different
things:

    present=False  the table does not exist. A fresh database, a migration not
                   yet applied. Several routes return an explicit "we cannot
                   tell" shape here, which is different from an empty result.
    present=True   the table exists and is empty. A failed backfill, an
                   unrefreshed materialized view. More dangerous, because the
                   route takes its normal path and produces a real-shaped
                   payload full of holes.
"""
from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock


def null_paths(obj, prefix: str = ""):
    """Every dotted path in a payload whose value is null."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from null_paths(value, f"{prefix}.{key}" if prefix else key)
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from null_paths(value, f"{prefix}[]")
    elif obj is None:
        yield prefix


class _AnyKeyRow(dict):
    """A one-column row that answers to whatever the caller aliased it as."""

    def __init__(self, value):
        super().__init__()
        self._value = value

    def __getitem__(self, key):
        return self._value

    def get(self, key, default=None):
        return self._value

    def __bool__(self):
        return True


class _NullRow(dict):
    """One row in which every column is NULL, bar the NOT NULL ones."""

    def __init__(self, present: dict | None = None):
        super().__init__()
        self._present = present or {}

    def __getitem__(self, key):
        return self._present.get(key)

    def get(self, key, default=None):
        return self._present.get(key, None)

    def __bool__(self):
        return True


_AGGREGATES = ("count(", "sum(", "max(", "min(", "avg(")


def _is_aggregate_select(sql: str) -> bool:
    """Whether this query returns a row even when it matches nothing.

    A heuristic, and the reason one is needed: an aggregate with no GROUP BY
    returns exactly one row over an empty set — `count(*)` is 0, never zero
    rows — while a lookup that matches nothing returns none at all. Code is
    entitled to subscript the first without a guard and must guard the second,
    so a stub that returns None for both invents crashes that cannot happen.

    That mistake was made here once already: modelling COUNT as "no row" made
    the faction-alignment route look like it raised on an empty database when
    real Postgres would have handed it zeros. A first attempt to fix it also
    disqualified any query containing GROUP BY, which caught the GROUP BY in an
    unrelated SUBQUERY and reinstated the same false alarm.

    The heuristic only inspects the select list before the first FROM, so
    `SELECT x, count(*) ... GROUP BY x` is misread as always returning a row.
    That is the deliberate direction to be wrong in: a missed crash is a gap,
    while an invented one sends someone chasing a bug that cannot happen.
    """
    head = " ".join(sql.lower().split()).split(" from ")[0]
    return any(agg in head for agg in _AGGREGATES)


def empty_cursor(tables_present: bool = True, present: dict | None = None):
    """Every query succeeds and finds nothing.

    `present` names columns the database marks NOT NULL, which therefore cannot
    be absent however degraded the data is. Modelling a member with no name
    would be a fantasy, and declaring `mp.name` nullable to satisfy it would
    weaken a real contract to make a test pass.
    """
    present = present or {}
    cur = MagicMock()
    state = {"row": None}

    def execute(sql, params=None):
        # to_regclass is how these routes ask "does this table exist at all?"
        if "to_regclass" in sql:
            name = None
            if tables_present and params:
                name = str(params[0]).replace("public.", "")
            elif tables_present:
                name = "present"
            # Callers alias this column differently — "t", "table_name",
            # "to_regclass" — so the row answers to any key rather than to the
            # three someone happened to think of.
            state["row"] = _AnyKeyRow(name)
        elif _is_aggregate_select(sql):
            state["row"] = _NullRow(present)
        else:
            state["row"] = _NullRow(present) if present else None

    cur.execute.side_effect = execute
    cur.fetchone.side_effect = lambda: state["row"]
    cur.fetchall.side_effect = lambda: []
    cur.__enter__ = lambda s=None: cur
    cur.__exit__ = lambda *a: False
    return cur


def empty_db(tables_present: bool = True):
    """Drop-in replacement for `get_db_conn`."""

    @contextmanager
    def fake():
        conn = MagicMock()
        conn.cursor.return_value = empty_cursor(tables_present)
        yield conn

    return fake
