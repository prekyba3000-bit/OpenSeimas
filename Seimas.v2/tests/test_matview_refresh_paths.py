"""Every materialized view must have a registered refresh path.

`mp_attendance_v2` is the instance this generalises. Migration 020 created it,
`refresh_stats.sh` refreshed two of its neighbours and not it, and it went
unnoticed because a stale view and a fresh one are indistinguishable from the
outside — it agreed with a live recompute only because the chamber had not
voted since 2026-07-14. Three days before that view became the live attendance
methodology, it was still frozen.

A view with no refresher does not fail. It serves the day it was built, forever,
while every surface presents it as current. That is the trust floor inverted:
not an unknown rendered as a number, but a number that stopped being true.

So the assertion is the shape, not the instance: a matview may be created only
if something refreshes it, or if its absence from the refresh schedule is
written down here with a reason.

Static on purpose — this runs with no database, which is the point. A guard
that needs production to notice a production defect arrives too late.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
SEIMAS = ROOT / "Seimas.v2"

# Digits matter: an earlier grep for `[a-z_]+` read `mp_attendance_v2` as
# `mp_attendance_v` and quietly reported a view that does not exist.
CREATE = re.compile(r"CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z0-9_]+)", re.I)
REFRESH = re.compile(r"REFRESH\s+MATERIALIZED\s+VIEW\s+(?:CONCURRENTLY\s+)?([a-z0-9_]+)", re.I)

# A view here is knowingly unrefreshed. The reason is required, and the entry
# is expected to be deleted rather than to age in place.
UNREFRESHED_BY_DECISION = {
    "faction_alignment": (
        "0 rows stored, but a live recompute of its own definition returns "
        "11,809 (measured 2026-08-24). It is not empty for want of inputs — it "
        "was materialised before mp_votes was populated and nothing has "
        "refreshed it since, the same defect as mp_attendance_v2 caught one "
        "step earlier. It is deliberately NOT on the schedule yet: the panel "
        "that renders once it has rows grades each named member's loyalty "
        "red/amber/green, so refreshing would ship a verdict disguised as a "
        "data fix. Wire the refresh only after that panel is evidence-first. "
        "See docs/reviews/p4-legislative-recon.md."
    ),
}


def _strip_comments(text: str, marker: str) -> str:
    """`-- Migration: Create Materialized View for MP Stats` declares no view.
    Scanning prose for SQL finds a view named `for`, which is how a scanner
    starts reporting on a schema that does not exist."""
    return "\n".join(line.split(marker)[0] for line in text.splitlines())


def _sql_sources():
    for p in (SEIMAS / "migrations").glob("*.sql"):
        yield p, _strip_comments(p.read_text(), "--")


def _refresh_sources():
    for pattern, base in ((("*.py",), SEIMAS / "backend"),
                          (("*.py",), SEIMAS / "pipeline"),
                          (("*.sh",), ROOT / "scripts" / "local-ops")):
        if not base.exists():
            continue
        for glob in pattern:
            for p in base.rglob(glob):
                yield p, _strip_comments(p.read_text(), "#")


def declared_matviews():
    found = {}
    for path, text in _sql_sources():
        for name in CREATE.findall(text):
            found.setdefault(name.lower(), path.name)
    return found


def refreshed_matviews():
    found = {}
    for path, text in _refresh_sources():
        for name in REFRESH.findall(text):
            found.setdefault(name.lower(), []).append(path.name)
    return found


def test_every_materialized_view_has_a_refresh_path():
    declared = declared_matviews()
    refreshed = refreshed_matviews()
    assert declared, "no CREATE MATERIALIZED VIEW found — the scanner is broken, not the schema"

    orphans = {
        name: origin
        for name, origin in declared.items()
        if name not in refreshed and name not in UNREFRESHED_BY_DECISION
    }
    assert not orphans, (
        "materialized view created with nothing to refresh it: "
        + ", ".join(f"{n} ({o})" for n, o in sorted(orphans.items()))
        + ". Add it to scripts/local-ops/refresh_stats.sh, or record it in "
          "UNREFRESHED_BY_DECISION with the reason."
    )


def test_attendance_v2_is_refreshed_on_the_schedule():
    """The instance, asserted separately: this one backs a published metric."""
    schedule = (SEIMAS / "backend" / "publish.py").read_text()
    assert "mp_attendance_v2" in schedule
    assert "CONCURRENTLY mp_attendance_v2" in schedule, (
        "a non-concurrent refresh takes an AccessExclusiveLock and blocks reads "
        "of the attendance every surface asks for"
    )


def test_exemptions_carry_a_reason_and_still_exist():
    declared = declared_matviews()
    for name, reason in UNREFRESHED_BY_DECISION.items():
        assert len(reason) > 40, f"{name}: an exemption without a reason is an excuse"
        assert name in declared, (
            f"{name} is exempted from refresh but no longer exists. Stale allowlists "
            f"silently re-admit any future view of the same name — delete the entry."
        )


# Evaluation ARC-01. "Every view has a refresher" let six accumulate, and the
# data-quality gate guarded one. The shape asserted now: exactly one production
# file refreshes views, and that file runs the gate first.
PUBLISHER = SEIMAS / "backend" / "publish.py"


def _all_production_sources():
    roots = [
        (SEIMAS, ("*.py",), False),            # top-level scripts (export_stats.py, ...)
        (SEIMAS / "backend", ("*.py",), True),
        (SEIMAS / "pipeline", ("*.py",), True),
        (SEIMAS / "scripts", ("*.py", "*.sh"), True),
        (ROOT / "scripts", ("*.py", "*.sh"), True),
        (ROOT / ".github" / "workflows", ("*.yml", "*.yaml"), True),
        (SEIMAS / ".github" / "workflows", ("*.yml", "*.yaml"), True),
    ]
    for base, globs, recursive in roots:
        if not base.exists():
            continue
        for glob in globs:
            for p in (base.rglob(glob) if recursive else base.glob(glob)):
                if "node_modules" in p.parts or ".venv" in p.parts:
                    continue
                marker = "--" if p.suffix == ".sql" else "#"
                yield p, _strip_comments(p.read_text(errors="ignore"), marker)


def test_exactly_one_production_file_refreshes_views():
    refreshers = sorted(
        str(p.relative_to(ROOT)) for p, text in _all_production_sources() if REFRESH.search(text)
    )
    assert refreshers == [str(PUBLISHER.relative_to(ROOT))], (
        "views must be refreshed only by backend/publish.py, after the data-quality "
        f"gate; found REFRESH in: {refreshers}. Call backend.publish.publish() instead."
    )


def test_the_publisher_runs_the_gate_before_any_refresh():
    text = PUBLISHER.read_text()
    body = text[text.index("def publish("):]
    gate_at = body.index("dq_check_runner.held_units(")
    hold_at = body.index("if UNIT_OF[view] in held_by:")
    first_refresh_at = body.index("cur.execute(statement)")
    assert gate_at < hold_at < first_refresh_at


def test_every_published_view_belongs_to_one_unit():
    from backend.publish import PUBLISH_STEPS, UNIT_OF
    assert [v for v, _ in PUBLISH_STEPS] == list(UNIT_OF), (
        "a view refreshed without a publication unit could never be held"
    )
