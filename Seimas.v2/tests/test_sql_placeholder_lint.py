"""Query strings psycopg2 rejects before Postgres ever sees them.

A per-cent sign in a SQL *comment* returned 500 from every MP profile in
production on 2026-09-05, with 254 backend tests green. psycopg2 interpolates
the whole query string when parameters are passed — comments are not exempt —
so `0 % attendance` inside a `--` line is a malformed placeholder and raises
`IndexError: tuple index out of range` at `execute()`.

The degraded stub cannot catch this. It answers `execute()` without parsing SQL,
which is exactly what makes it fast and network-free, and no other suite here
holds a connection. Nothing short of a real database validates a query string,
so this check is static.

The rule psycopg2 actually applies, and the reason a blunter lint was wrong:

    cur.execute(sql)            # no parameters — no interpolation, `%` is fine
    cur.execute(sql, params)    # parameters — every `%` must be a placeholder

`routes_data_health.py` runs `LIKE 'matview:%'` with no parameters and is
correct. So the lint looks at call sites, not at strings: only the first
argument of an `execute`/`executemany` that is *given parameters* is checked.
That also keeps docstrings out of it, which is what a string-scanning version
tripped over.
"""
from __future__ import annotations

import ast
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEARCH_DIRS = (ROOT / "backend", ROOT / "pipeline")

# Everything psycopg2 understands: %s, %b, %(name)s, and an escaped literal %%.
PLACEHOLDER = re.compile(r"%(?:%|[sb]|\([A-Za-z_][A-Za-z0-9_]*\)[sbd])")


def stray_percents(sql: str) -> list[int]:
    """Offsets of per-cent signs that are not a placeholder psycopg2 knows."""
    out, i = [], 0
    while i < len(sql):
        if sql[i] != "%":
            i += 1
            continue
        match = PLACEHOLDER.match(sql, i)
        if match:
            i = match.end()
            continue
        out.append(i)
        i += 1
    return out


def _resolve(node: ast.AST, constants: dict[str, str]) -> str | None:
    """The literal text of a query argument, as far as it can be known statically.

    Only the literal parts of an f-string are returned: an interpolated value is
    not part of the query template psycopg2 scans for placeholders, and a
    module-level SQL constant referenced by name is (several routes build
    `f"SELECT * FROM ({_SOME_SQL}) t"` that way).
    """
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Name):
        return constants.get(node.id)
    if isinstance(node, ast.JoinedStr):
        parts = []
        for value in node.values:
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                parts.append(value.value)
            elif isinstance(value, ast.FormattedValue):
                resolved = _resolve(value.value, constants)
                if resolved:
                    parts.append(resolved)
        return "".join(parts)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left = _resolve(node.left, constants) or ""
        right = _resolve(node.right, constants) or ""
        return left + right
    return None


def parameterised_queries(path: pathlib.Path):
    """(lineno, sql) for every execute() call in this file that passes parameters."""
    tree = ast.parse(path.read_text(encoding="utf-8"))

    constants: dict[str, str] = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant):
            if isinstance(node.value.value, str):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        constants[target.id] = node.value.value

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        name = getattr(node.func, "attr", None)
        if name not in ("execute", "executemany"):
            continue
        # No parameters means no interpolation: a bare per-cent is legal there.
        if len(node.args) < 2 and not node.keywords:
            continue
        sql = _resolve(node.args[0], constants) if node.args else None
        if sql:
            yield node.lineno, sql


def test_no_parameterised_query_carries_a_stray_per_cent_sign():
    offenders = []
    for directory in SEARCH_DIRS:
        for path in sorted(directory.rglob("*.py")):
            for lineno, sql in parameterised_queries(path):
                for pos in stray_percents(sql):
                    line = sql.splitlines()[sql[:pos].count("\n")]
                    offenders.append(f"{path.name}:{lineno} -> {line.strip()[:88]}")

    assert offenders == [], (
        "psycopg2 interpolates the whole query string when parameters are "
        "passed, comments included, so each of these is read as a parameter "
        "placeholder and raises IndexError before Postgres sees the query. "
        "Write %% for a literal per-cent, or reword.\n  " + "\n  ".join(offenders)
    )


def test_the_lint_catches_the_string_that_shipped():
    """Guards the guard, with the comment that actually caused the outage."""
    shipped = """
        SELECT
            -- would be published as 0 % attendance, which states that they
            s.attendance_percentage
        FROM mp_stats_summary s WHERE s.mp_id = %(mp)s
    """
    assert stray_percents(shipped), "the lint does not catch the string that shipped"


def test_the_lint_accepts_what_psycopg2_accepts():
    ok = "SELECT 1 WHERE x = %s AND y = %(n)s AND z LIKE 'matview:%%' AND w = %b"
    assert stray_percents(ok) == [], "the lint rejects legal placeholders"


def test_an_unparameterised_like_pattern_is_not_flagged():
    """`LIKE 'matview:%'` with no parameters is correct and must stay allowed —
    flagging it was the first version's mistake."""
    import tempfile

    source = (
        "def f(cur):\n"
        "    cur.execute(\"SELECT 1 FROM t WHERE s NOT LIKE 'matview:%'\")\n"
        "    cur.execute(\"SELECT 1 FROM t WHERE s LIKE %s\", ('a',))\n"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as fh:
        fh.write(source)
        tmp = pathlib.Path(fh.name)
    try:
        found = list(parameterised_queries(tmp))
        assert len(found) == 1, f"expected only the parameterised call, got {found}"
        assert stray_percents(found[0][1]) == []
    finally:
        tmp.unlink()
