"""The public API ships evidence and descriptive dimensions. Verdicts ship nowhere.

Three things travelled that should not have:

  * an RPG morality layer — `alignment: "Lawful Good"`, `level`, `xp`,
    `artifacts` — attached to named members of parliament. Nothing rendered
    them, but the media kit invites external API use, so they were public.
  * the composite itself: `final_integrity_score`, `base_risk_score` and its
    penalty, demoted to the methodology page.
  * `/api/accountability/heroes-villains`, which sorted real people into
    „heroes" and a „watchlist" by `100 - risk_score + attendance * 0.15`.

The sin is aggregation, not measurement. The dimensions stay; the verdict does
not.
"""
import pathlib

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.hero_engine import public_breakdown

BACKEND = pathlib.Path(__file__).resolve().parent.parent / "backend"

RPG_KEYS = ("alignment", "level", "xp", "xp_current_level", "xp_next_level", "artifacts", "attributes")
COMPOSITE_KEYS = ("final_integrity_score", "base_risk_score", "base_risk_penalty", "integrity_score", "risk_score")


def test_response_model_declares_no_rpg_or_composite_fields():
    """`extra="ignore"` means the model is the wire contract: a field absent
    here is silently dropped, which is exactly the mechanism relied on."""
    from backend.models import HeroProfileResponse

    declared = set(HeroProfileResponse.model_fields)
    assert declared & set(RPG_KEYS) == set()
    assert "dimensions" in declared


def test_dimensions_are_named_for_what_they_measure():
    from backend.models import HeroDimensionsResponse

    assert set(HeroDimensionsResponse.model_fields) == {
        "legislative_activity",
        "experience",
        "visibility",
    }


def test_the_payload_carries_no_verdict_one_level_down():
    """The hole the model-fields check could not see.

    `test_response_model_declares_no_rpg_or_composite_fields` reads
    `HeroProfileResponse.model_fields` and finds `metrics` and
    `forensic_breakdown` — both `Dict[str, Any]`. It stops there, so it asserted
    the top level was clean while the payload carried `risk_score`,
    `high_risk_alerts`, `forensic_penalties`, `social_bonus`,
    `raw_forensic_penalty_sum` and `capped_forensic_penalty` about every named
    member, live, for however long they had been there.

    Written against the built payload rather than the model, and recursively,
    because the failure was precisely that a verdict does not need a top-level
    field to reach a reader.
    """
    from tests.degraded import empty_cursor
    from backend.hero_engine import calculate_hero_profile

    NOT_NULL = {
        "id": "00000000-0000-0000-0000-000000000000",
        "mp_id": "00000000-0000-0000-0000-000000000000",
        "display_name": "Testinis Narys",
        "full_name_normalized": "testinis narys",
    }
    payload = calculate_hero_profile(NOT_NULL["id"], empty_cursor(present=NOT_NULL))

    banned = set(COMPOSITE_KEYS) | {
        "high_risk_alerts", "forensic_penalties", "social_bonus",
        "raw_forensic_penalty_sum", "capped_forensic_penalty",
    }

    def paths(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                yield f"{prefix}.{k}" if prefix else k
                yield from paths(v, f"{prefix}.{k}" if prefix else k)
        elif isinstance(obj, list):
            for v in obj:
                yield from paths(v, f"{prefix}[]")

    found = [p for p in paths(payload) if p.rsplit(".", 1)[-1] in banned]
    assert found == [], (
        f"verdict-shaped keys on the public payload: {found}. The public API "
        f"ships evidence and descriptive dimensions; a score about a named "
        f"person ships nowhere, however deeply nested and whatever its value."
    )


def test_public_breakdown_drops_the_composite_but_keeps_the_evidence():
    raw = {
        "_composite_base_risk_score": 0.22,
        "_composite_base_risk_penalty": -11,
        "_composite_final_integrity_score": 72,
        "total_forensic_adjustment": -3,
        "benford": {"status": "clean"},
        "chrono": {"status": "warning"},
    }
    out = public_breakdown(raw)
    assert "benford" in out and "chrono" in out
    assert not any(k.startswith("_composite_") for k in out)
    for key in ("final_integrity_score", "base_risk_score", "base_risk_penalty"):
        assert key not in out
    # Dropped by name, not by prefix: these two are the same aggregation and
    # were written without the `_composite_` that would have caught them.
    for key in ("raw_forensic_penalty_sum", "capped_forensic_penalty"):
        assert key not in public_breakdown({key: 0, "benford": {"status": "clean"}})


@pytest.mark.asyncio
async def test_heroes_villains_is_gone():
    """Retired, not demoted. A number a reader can inspect is one thing; a
    league table of named people is another, and this was the league table."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/api/accountability/heroes-villains")
    assert resp.status_code == 404


def test_no_route_file_still_computes_the_heroes_composite():
    """A route is a decorator argument, not a substring.

    The first version matched the text "heroes-villains" anywhere outside a `#`
    comment. That is the right intent expressed the wrong way: the tombstone
    explaining the retirement, and any docstring describing what a replacement
    endpoint no longer does, both name it as documentation. Prose about a
    retired verdict is how a project remembers why it retired it, and a guard
    that forbids writing it down pushes toward silence.

    So the path is read from the route decorators themselves, and the formula
    check runs against source with comments *and* docstrings stripped.
    """
    import ast
    import re

    def registered_paths(tree):
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if not isinstance(dec, ast.Call):
                    continue
                for arg in dec.args:
                    if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                        yield arg.value

    def strip_docstrings(tree):
        for node in ast.walk(tree):
            if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                if (node.body and isinstance(node.body[0], ast.Expr)
                        and isinstance(node.body[0].value, ast.Constant)
                        and isinstance(node.body[0].value.value, str)):
                    node.body[0].value.value = ""
        return ast.unparse(tree)

    for path in BACKEND.glob("routes_*.py"):
        source = path.read_text()
        tree = ast.parse(source)

        for route in registered_paths(tree):
            assert "heroes-villains" not in route, f"{path.name} still routes {route}"

        code = re.sub(r"^\s*#.*$", "", strip_docstrings(ast.parse(source)), flags=re.M)
        assert "100 - risk_score" not in code, f"{path.name} still computes the verdict"


def test_the_leaderboard_is_not_ranked_by_an_aggregate():
    """Sorting by level and xp made this a league table: whoever the
    aggregation happened to favour appeared first, and a screenshot of the top
    of it is a partisan artefact."""
    text = (BACKEND / "hero_engine.py").read_text()
    assert 'key=lambda p: (p["level"], p["xp"])' not in text
    assert 'profiles.sort(key=lambda p: (p["mp"]["name"] or "").lower())' in text
