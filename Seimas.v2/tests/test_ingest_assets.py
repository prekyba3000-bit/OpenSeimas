"""Unit tests for the asset-declaration parser.

Written after the first version of this parser shipped a real bug: it assumed
label and value sat in separate `<td>` cells (the shape of the interests
page) when this page concatenates them into ONE cell —
"I. Privalomas registruoti turtas280100 EUR". That version produced
plausible-looking but wrong numbers (a 945 EUR cash figure read as 0.945,
a stray "3112023" appearing as a loans-received amount) rather than failing
loudly, which is why every fixture here is copied verbatim from a real page
rather than written by hand.
"""
from pipeline.ingest_assets import parse_declaration

# Trimmed from the live page for rkndId-2436740 (Vilma Aasrum), 2026-09-06.
_DECLARATION = """
<table>
<tr><td>METINĖS GYVENTOJO (ŠEIMOS) TURTO DEKLARACIJOS PAGRINDINIŲ DUOMENŲ IŠRAŠAS (2023 m.)</td></tr>
<tr><td>I. Privalomas registruoti turtas280100 EUR</td></tr>
<tr><td>II. Vertybiniai popieriai, meno kūriniai, juvelyriniai dirbiniai0 EUR</td></tr>
<tr><td>III. Piniginės lėšos945 EUR</td></tr>
<tr><td>IV. Suteiktos paskolos0 EUR</td></tr>
<tr><td>V. Gautos paskolos0 EUR</td></tr>
<tr><td>Deklaruota apmokestinamųjų ir neapmokestinamųjų pajamų suma19739,09 EUR</td></tr>
<tr><td>Deklaruota individualios veiklos pajamų suma12560 EUR</td></tr>
</table>
"""


def _html(s: str) -> bytes:
    return s.encode("utf-8")


def test_each_category_reads_its_own_figure_not_a_neighbour_cell():
    parsed = parse_declaration(_html(_DECLARATION))
    assert parsed["raw"] == {
        "mandatory_assets": 280100.0,
        "securities": 0.0,
        "cash": 945.0,
        "loans_granted": 0.0,
        "loans_received": 0.0,
        "declared_income_eur": 19739.09,
    }


def test_the_regression_this_file_exists_for():
    # The first, wrong parser read cash (945 EUR) as 0.945 under securities,
    # and produced a fabricated 3112023 for loans_received that appears
    # nowhere on the page.
    parsed = parse_declaration(_html(_DECLARATION))
    assert parsed["raw"]["cash"] == 945.0
    assert parsed["raw"]["securities"] == 0.0
    assert parsed["raw"]["loans_received"] == 0.0


def test_total_value_is_the_mandatory_assets_figure_alone():
    # Not a sum across categories — IV (an asset) and V (a liability) cannot
    # be netted into one number without inventing a concept the source
    # doesn't state.
    parsed = parse_declaration(_html(_DECLARATION))
    assert parsed["total_value"] == 280100.0


def test_the_declaration_year_is_read_from_the_section_title():
    parsed = parse_declaration(_html(_DECLARATION))
    assert parsed["year"] == 2023


def test_individual_activity_income_does_not_overwrite_total_income():
    # Two different income lines exist on the page; the parser must not let
    # the second overwrite the first under the same key.
    parsed = parse_declaration(_html(_DECLARATION))
    assert parsed["raw"]["declared_income_eur"] == 19739.09


def test_a_page_with_no_matching_categories_yields_none():
    assert parse_declaration(b"<html><body>Nothing here</body></html>") is None


def test_a_missing_category_is_absent_not_zero():
    # Charter §1.1: unknown must never render as a plausible-looking 0.
    sparse = """
    <table><tr><td>I. Privalomas registruoti turtas100 EUR</td></tr></table>
    """
    parsed = parse_declaration(_html(sparse))
    assert parsed["raw"] == {"mandatory_assets": 100.0}
    assert "cash" not in parsed["raw"]
