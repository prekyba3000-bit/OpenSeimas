"""An ingest that nothing invokes is a table that stays empty.

This project's most repeated defect, four times now:

  * `pipeline/ingest_legislation.py` — written, never wired. `legislation` has
    held 0 rows for the life of the project while `backend/graph.py` and
    `pipeline/tag_topics.py` read it.
  * `pipeline/ingest_authored_bills.py` — wired only in a skills script no timer
    called, so `legislative_activity` was displayed beside figures that
    refreshed daily while its own input refreshed by hand.
  * `mp_attendance_v2` — materialised, refreshed by nothing.
  * `faction_alignment` — materialised before its input existed, refreshed by
    nothing, and a live recompute returns 11,809 rows.

Each was found by someone eventually asking "what runs this?". The question is
mechanical, so a test can ask it every time instead.

The rule: every `pipeline/ingest_*.py` is either invoked by an ops script, or
named below with the reason it is not. Emptiness by decision is fine; emptiness
by oversight is what this catches. The list is the review surface — adding an
entry costs a sentence, which is the point.
"""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
PIPELINE = ROOT / "Seimas.v2" / "pipeline"
OPS = ROOT / "scripts" / "local-ops"


# Not on any schedule, on purpose. Each entry is why.
UNWIRED_BY_DECISION = {
    "ingest_legislation": (
        "Source is dead and the join key is wrong. Its endpoint "
        "e-seimas.lrs.lt/rs/legalactproject/search/find returns 404 on every "
        "variant tried on 2026-09-05, so the script has never successfully run. "
        "It also joins on votes.project_id, which holds the number of the law "
        "BEING AMENDED for 3,464 of 4,392 votes — the extraction takes the first "
        "'Nr.' in the title, and for an amendment that is the existing law, not "
        "the project. 331 stored ids collapse several real projects onto one key; "
        "'I-399' alone covers 44. Wiring a runner would fill a canonical-looking "
        "table with wrongly-keyed rows. See docs/reviews/p4-legislation-runner.md."
    ),
    "ingest_assets": (
        "No source. Asset declarations are not published in any feed this "
        "project has access to; the table exists from a migration and has never "
        "had a writer. Declared-interest data also most invites verdict-shaped "
        "presentation, so per the W3 rule it needs a feasibility note before "
        "ingest code, not a timer."
    ),
    "ingest_amendments": (
        "Superseded. amendment_profiles is empty and the amendments dimension "
        "runs off amendments_proposed_count from mp_stats_summary instead."
    ),
    "ingest_opensanctions": (
        "Third-party PEP dataset, refreshed rarely and by hand. Nothing on a "
        "public surface reads it; it is context for the graph."
    ),
    "ingest_vrk_results": (
        "Election results are fixed for the term. Re-running it daily would "
        "re-fetch a file that cannot change until the next election."
    ),
    "ingest_cvp_is_procurement": (
        "Procurement feed, used by the phantom-network engine only, and that "
        "engine reports unavailable rather than inventing a figure when the "
        "table is stale. Manual until the engine is on a surface."
    ),
}


def ops_script_text() -> str:
    return "\n".join(
        p.read_text(encoding="utf-8") for p in sorted(OPS.glob("*.sh"))
    )


def ingest_modules() -> list[str]:
    return sorted(p.stem for p in PIPELINE.glob("ingest_*.py"))


def test_every_ingest_is_either_scheduled_or_explained():
    scheduled = ops_script_text()
    unexplained = [
        name
        for name in ingest_modules()
        if not re.search(rf"pipeline\.{re.escape(name)}\b", scheduled)
        and name not in UNWIRED_BY_DECISION
    ]
    assert unexplained == [], (
        "these ingests are invoked by no ops script and carry no stated reason. "
        "An ingest nothing runs is a table that stays empty while its readers "
        "compute from nothing — this project has shipped that four times. Wire "
        "it into scripts/local-ops/, or add it to UNWIRED_BY_DECISION with the "
        "reason:\n  " + "\n  ".join(unexplained)
    )


def test_the_exemption_list_names_only_real_modules():
    """A stale exemption silently re-opens the hole it was written to document."""
    modules = set(ingest_modules())
    ghosts = sorted(set(UNWIRED_BY_DECISION) - modules)
    assert ghosts == [], (
        f"UNWIRED_BY_DECISION names modules that no longer exist: {ghosts}. "
        f"Remove the entry — an exemption for a deleted file would also exempt "
        f"a new file that happened to reuse the name."
    )


def test_every_exemption_gives_a_reason():
    thin = [k for k, v in UNWIRED_BY_DECISION.items() if len(v.strip()) < 60]
    assert thin == [], (
        f"these exemptions do not say why: {thin}. 'Not wired' is the defect, "
        f"not the explanation."
    )


def test_the_wire_fixture_check_is_scheduled():
    """The fixtures are the only test evidence captured from the live API, and
    the one layer that rots without anything noticing: both suites read the
    committed files and pass on a payload the backend stopped sending."""
    assert "scripts.refresh_wire_fixtures --check" in ops_script_text(), (
        "no ops script runs the wire-fixture drift check, so a captured payload "
        "can diverge from the API indefinitely with every test green"
    )
