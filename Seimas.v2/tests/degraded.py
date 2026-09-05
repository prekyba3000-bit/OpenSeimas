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

import re
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
    """One row in which every column is NULL, bar the NOT NULL and the counted.

    `zeros` names the columns holding a COUNT. Over an empty set a count is 0
    and never NULL, so modelling it as NULL invents arithmetic that real
    Postgres cannot produce — see `_count_aliases`.
    """

    def __init__(self, present: dict | None = None, zeros: set | None = None):
        super().__init__()
        self._present = present or {}
        self._zeros = zeros or set()

    def _value(self, key):
        if key in self._present:
            return self._present[key]
        return 0 if key in self._zeros else None

    def __getitem__(self, key):
        return self._value(key)

    def get(self, key, default=None):
        return self._value(key)

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


def _split_top_level(select_list: str):
    """Split a SELECT list on commas that are not inside parentheses."""
    depth, current = 0, []
    for ch in select_list:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            yield "".join(current)
            current = []
        else:
            current.append(ch)
    if current:
        yield "".join(current)


def _count_aliases(sql: str) -> set:
    """The output columns of this query that hold a COUNT.

    `count(*)` over an empty set is 0; `sum`, `max`, `min` and `avg` over an
    empty set are NULL. Postgres draws that line per column, so a stub that
    returns NULL for every aggregate models a database that cannot exist.

    It mattered: /api/stats is five COUNTs and a subtraction, and a NULL count
    made it look like an empty database crashed the endpoint. Chasing that would
    have been an hour spent on a bug real Postgres cannot produce — the second
    time this file has invented one, which is why the rule now lives in code
    instead of in the warning above it.

    Aliases only. An unaliased `count(*)` is read back by whatever name the
    driver assigns and is not worth guessing at; callers that need one can name
    it through `present`.
    """
    head = re.split(r"(?i)\bfrom\b", " ".join(sql.split()))[0]
    head = re.sub(r"(?i)^\s*select\s+(distinct\s+)?", "", head)

    aliases = set()
    for item in _split_top_level(head):
        item = item.strip()
        if not item.lower().startswith("count("):
            continue
        match = re.search(r"(?i)\bas\s+([a-z_][a-z0-9_]*)\s*$", item)
        if match:
            aliases.add(match.group(1))
    return aliases


def empty_cursor(tables_present: bool = True, present: dict | None = None,
                 rows_for: str | None = None):
    """Every query succeeds and finds nothing.

    `present` names columns the database marks NOT NULL, which therefore cannot
    be absent however degraded the data is. Modelling a member with no name
    would be a fantasy, and declaring `mp.name` nullable to satisfy it would
    weaken a real contract to make a test pass. It also carries columns a query
    makes non-null itself — `COALESCE(s.total_votes_cast, 0) AS vote_count`
    cannot arrive null however empty the table is — declared at the call site
    where a reader can check the claim against the SQL.

    `rows_for` is a SQL substring identifying the one query that should return a
    row rather than none: one row in which every nullable column is null. An
    endpoint returning a LIST needs it, because an empty list is shape-compatible
    with every schema and so tests nothing. `/api/mps` is the case that forced
    it — the payload worth checking is a member whose faction, photo, attendance
    and vote mode are all absent, and that member cannot appear in `[]`.
    """
    present = present or {}
    cur = MagicMock()
    state = {"row": None, "rows": []}

    def execute(sql, params=None):
        state["rows"] = (
            [_NullRow(present, _count_aliases(sql))]
            if rows_for and rows_for in sql
            else []
        )
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
            state["row"] = _NullRow(present, _count_aliases(sql))
        else:
            state["row"] = _NullRow(present) if present else None

    cur.execute.side_effect = execute
    cur.fetchone.side_effect = lambda: state["row"]
    cur.fetchall.side_effect = lambda: state["rows"]
    cur.__enter__ = lambda s=None: cur
    cur.__exit__ = lambda *a: False
    return cur


def empty_db(tables_present: bool = True, present: dict | None = None,
             rows_for: str | None = None):
    """Drop-in replacement for `get_db_conn`."""

    @contextmanager
    def fake():
        conn = MagicMock()
        conn.cursor.return_value = empty_cursor(tables_present, present, rows_for)
        yield conn

    return fake
