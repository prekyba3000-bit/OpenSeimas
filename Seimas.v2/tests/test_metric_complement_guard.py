"""Evaluation TST-01: detect every `100 - metric` formula, not one spelling."""
import ast
import pathlib

BACKEND = pathlib.Path(__file__).resolve().parent.parent / "backend"

INTERNAL_COMPLEMENT_ALLOWLIST = {
    ("hero_engine.py", "_build_forensic_breakdown"):
        "Stage 0 removed this from the wire; ARC-07 removes the retired engine internals.",
    ("hero_engine.py", "_build_forensic_breakdown_fast"):
        "Stage 0 removed this from the wire; ARC-07 removes the retired engine internals.",
}


def _metric_complements(path):
    class Visitor(ast.NodeVisitor):
        def __init__(self):
            self.function = None
            self.found = []

        def visit_FunctionDef(self, node):
            previous = self.function
            self.function = node.name
            self.generic_visit(node)
            self.function = previous

        visit_AsyncFunctionDef = visit_FunctionDef

        def visit_BinOp(self, node):
            left_is_100 = (
                isinstance(node.left, ast.Constant)
                and isinstance(node.left.value, (int, float))
                and not isinstance(node.left.value, bool)
                and node.left.value == 100
            )
            right_is_literal = (
                isinstance(node.right, ast.Constant)
                and isinstance(node.right.value, (int, float))
            )
            if isinstance(node.op, ast.Sub) and left_is_100 and not right_is_literal:
                self.found.append((path.name, self.function, node.lineno, ast.unparse(node)))
            self.generic_visit(node)

    visitor = Visitor()
    visitor.visit(ast.parse(path.read_text()))
    return visitor.found


def test_no_backend_file_computes_a_metric_complement():
    """The loyalty verdict lived in hero_engine.py, outside the old route-only
    literal guard. These two internal exceptions are temporary; populated
    payload tests prove public_breakdown removes their scores and statuses."""
    offenders = []
    for path in BACKEND.glob("*.py"):
        offenders.extend(
            item for item in _metric_complements(path)
            if item[:2] not in INTERNAL_COMPLEMENT_ALLOWLIST
        )
    assert offenders == [], f"metric complements about named people: {offenders}"


def test_the_guard_recognises_the_general_shape(tmp_path):
    sample = tmp_path / "sample.py"
    sample.write_text(
        '"""100 - documented_metric"""\n'
        '# 100 - commented_metric\n'
        'literal = 100 - 2\n'
        'def verdict(row):\n'
        '    attendance = 100 - row.attendance\n'
        '    loyalty = 100.0 - party_loyalty_pct\n'
        '    return attendance, loyalty\n'
    )
    found = _metric_complements(sample)
    assert [(item[1], item[3]) for item in found] == [
        ("verdict", "100 - row.attendance"),
        ("verdict", "100.0 - party_loyalty_pct"),
    ]
