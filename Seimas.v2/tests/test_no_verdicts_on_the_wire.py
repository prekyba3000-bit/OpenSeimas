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


@pytest.mark.asyncio
async def test_heroes_villains_is_gone():
    """Retired, not demoted. A number a reader can inspect is one thing; a
    league table of named people is another, and this was the league table."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/api/accountability/heroes-villains")
    assert resp.status_code == 404


def test_no_route_file_still_computes_the_heroes_composite():
    """Comments are stripped first — the tombstone explaining the retirement
    names the endpoint, and that mention is documentation, not a route."""
    import re

    for path in BACKEND.glob("routes_*.py"):
        code = re.sub(r"^\s*#.*$", "", path.read_text(), flags=re.M)
        assert "100 - risk_score" not in code, f"{path.name} still computes the verdict"
        assert "heroes-villains" not in code, f"{path.name} still routes it"


def test_the_leaderboard_is_not_ranked_by_an_aggregate():
    """Sorting by level and xp made this a league table: whoever the
    aggregation happened to favour appeared first, and a screenshot of the top
    of it is a partisan artefact."""
    text = (BACKEND / "hero_engine.py").read_text()
    assert 'key=lambda p: (p["level"], p["xp"])' not in text
    assert 'profiles.sort(key=lambda p: (p["mp"]["name"] or "").lower())' in text
