"""Unit tests for the interest-declaration parser, against real page fragments."""
from pipeline.ingest_interests import parse_declaration

# Trimmed from the live page for rkndId-2436740 (Vilma Aasrum), 2026-09-06.
_SELF_EMPLOYER = """
<h4 class="h4apgKom pid-table-title">Deklaruojančio darbovietės</h4>
<table class="partydata defaultSize tableKand shrink1">
  <tr><td>Darbovietė</td></tr>
  <tr><td>Darbdavys</td><td>Juridinis asmuo</td></tr>
  <tr><td>Registracijos šalis</td><td>Lietuvos Respublika</td></tr>
  <tr><td>Pavadinimas</td><td>Lietuvos Respublikos Seimo kanceliarija</td></tr>
  <tr><td>Juridinio asmens kodas</td><td>188605295</td></tr>
  <tr><td>Ryšio pradžios data</td><td>2023-10-16</td></tr>
  <tr><td>Pareigos</td><td>Seimo narės viešosios konsultantė</td></tr>
</table>
"""

_SPOUSE_EMPLOYER_NO_CODE = """
<h4 class="h4apgKom pid-table-title">Sutuoktinio darbovietės</h4>
<table class="partydata defaultSize tableKand shrink1">
  <tr><td>Darbovietė</td></tr>
  <tr><td>Registracijos šalis</td><td>Užsienio valstybė</td></tr>
  <tr><td>Pavadinimas</td><td>Eramet AS</td></tr>
  <tr><td>Pareigos</td><td>Vyresnysis vadybininkas</td></tr>
</table>
"""


def _html(s: str) -> bytes:
    return s.encode("utf-8")


def test_self_employer_is_parsed_with_org_code():
    rows = parse_declaration(_html(_SELF_EMPLOYER))
    assert len(rows) == 1
    r = rows[0]
    assert r["type"] == "Darbovietė"
    assert r["declarant_relation"] == "self"
    assert r["org_name"] == "Lietuvos Respublikos Seimo kanceliarija"
    assert r["org_code"] == "188605295"
    assert r["role"].startswith("Seimo narė")


def test_spouse_heading_is_attributed_correctly():
    rows = parse_declaration(_html(_SPOUSE_EMPLOYER_NO_CODE))
    assert rows[0]["declarant_relation"] == "spouse"


def test_a_foreign_employer_with_no_lithuanian_code_is_null_not_invented():
    # No "Juridinio asmens kodas" row exists on this table at all — a foreign
    # entity has no Lithuanian legal-entity code. NULL is the honest value;
    # inventing a placeholder would be a fact this project didn't observe.
    rows = parse_declaration(_html(_SPOUSE_EMPLOYER_NO_CODE))
    assert rows[0]["org_code"] is None


def test_relation_reverts_to_self_after_a_spouse_section_ends():
    combined = _SPOUSE_EMPLOYER_NO_CODE + """
    <h4 class="h4apgKom pid-table-title">Ryšiai su juridiniais asmenimis</h4>
    <table class="partydata defaultSize tableKand shrink1">
      <tr><td>Ryšys</td></tr>
      <tr><td>Juridinio asmens pavadinimas</td><td>Demokratų sąjunga</td></tr>
      <tr><td>Juridinio asmens kodas</td><td>306028696</td></tr>
      <tr><td>Ryšio pobūdis</td><td>Pirmininkas</td></tr>
    </table>
    """
    rows = parse_declaration(_html(combined))
    assert rows[0]["declarant_relation"] == "spouse"
    assert rows[1]["type"] == "Ryšys"
    assert rows[1]["declarant_relation"] == "self"
    assert rows[1]["org_name"] == "Demokratų sąjunga"
    assert rows[1]["role"] == "Pirmininkas"


def test_a_page_with_no_declared_relationships_yields_an_empty_list():
    assert parse_declaration(b"<html><body>No tables here</body></html>") == []
