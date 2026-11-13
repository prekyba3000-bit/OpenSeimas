"""lrp.lt decree register: parsing and the title rule that names a decree's kind.

The markup below is cut from the live page as it was on 2026-11-13, and every
title is a real one from the register. The rule is deterministic and reads the
title only; these cases are the ones that would be wrong if it guessed.
"""
import datetime

from pipeline.ingest_presidential_decrees import (
    classify,
    decree_no_from_href,
    months_from,
    parse_lt_date,
    parse_month_page,
    read_month,
)

ROW = """
<tr class="dekretai__item no-attachments">
  <td><div class="calendar">
    <span class='year'>
      {year} m.
    </span>
    <span class="month">
      {month}
    </span>
    <span class="day">
      {day} d.
    </span>
  </div></td>
  <td>
    <a class="title-link" href="{href}" target="_blank">
      <span class="icon icon-file">
      </span>
      <span class="title">
        {title}
      </span>
    </a>
  </td>
</tr>
"""


def page(*rows):
    return "<table class=\"dekretai__list\">" + "".join(ROW.format(**r) for r in rows) + "</table>"


COMPOSITION = dict(year=2026, month="liepos", day="07",
                   href="/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf",
                   title="DĖL LIETUVOS RESPUBLIKOS VYRIAUSYBĖS SUDĖTIES")
VETO = dict(year=2025, month="spalio", day="03",
            href="/data/public/uploads/2025/10/2025-10-03-nr.-1k-455.pdf",
            title="DĖL LIETUVOS RESPUBLIKOS BAUDŽIAMOJO KODEKSO 228 STRAIPSNIO PAKEITIMO ĮSTATYMO NR. XV-438 "
                  "GRĄŽINIMO LIETUVOS RESPUBLIKOS SEIMUI PAKARTOTINAI SVARSTYTI")
NO_FILE = dict(year=2026, month="kovo", day="31", href="", title="DĖL APYLINKĖS TEISMO TEISĖJO ATLEIDIMO")


def test_parses_number_date_title_and_link():
    rows = parse_month_page(page(COMPOSITION))
    assert rows == [(
        "1K-737", datetime.date(2026, 7, 7), "DĖL LIETUVOS RESPUBLIKOS VYRIAUSYBĖS SUDĖTIES",
        "https://www.lrp.lt/data/public/uploads/2026/07/2026-07-07-nr.-1k-737.pdf", "cabinet",
    )]


def test_a_decree_with_no_file_keeps_its_row_without_a_number():
    """lrp.lt lists it, so the register does too; it just cannot cite a PDF."""
    (row,) = parse_month_page(page(NO_FILE))
    assert row[0] is None and row[3] is None
    assert row[1] == datetime.date(2026, 3, 31)


def test_number_is_read_from_the_file_name_in_its_variants():
    assert decree_no_from_href("/x/2026-07-07-nr.-1k-737.pdf") == "1K-737"
    assert decree_no_from_href("/x/d1_2026-03-24-nr.-1k-603.pdf") == "1K-603"
    assert decree_no_from_href("/x/2026-06-22-nr-1k-726.pdf") == "1K-726"
    assert decree_no_from_href("") is None


def test_unreadable_date_drops_the_row_rather_than_inventing_one():
    assert parse_lt_date("2026 m.", "liepos", "07 d.") == datetime.date(2026, 7, 7)
    assert parse_lt_date("2026 m.", "julio", "07 d.") is None
    assert parse_lt_date("2026 m.", "vasario", "31 d.") is None
    assert parse_month_page(page({**COMPOSITION, "month": "julio"})) == []


def test_kinds_on_real_titles():
    cases = {
        VETO["title"]: "veto",
        "DĖL LIETUVOS RESPUBLIKOS KELIŲ ĮSTATYMO NR. I-891 4 STRAIPSNIO PAKEITIMO ĮSTATYMO PROJEKTO PATEIKIMO "
        "SVARSTYTI LIETUVOS RESPUBLIKOS SEIMUI": "bill",
        "DĖL TEIKIMO LIETUVOS RESPUBLIKOS SEIMUI RATIFIKUOTI TARPTAUTINĖS HIDROGRAFIJOS ORGANIZACIJOS KONVENCIJĄ": "treaty",
        "DĖL TEIKIMO LIETUVOS RESPUBLIKOS SEIMUI DENONSUOTI ENERGETIKOS CHARTIJOS SUTARTĮ": "treaty",
        "DĖL TEIKIMO LIETUVOS RESPUBLIKOS SEIMUI SKIRTI LIETUVOS AUKŠČIAUSIOJO TEISMO TEISĖJĄ": "nomination",
        "DĖL TEIKIMO LIETUVOS RESPUBLIKOS SEIMUI PRITARTI LIETUVOS APELIACINIO TEISMO TEISĖJO ATLEIDIMUI": "nomination",
        "DĖL LIETUVOS RESPUBLIKOS VYRIAUSYBĖS SUDĖTIES": "cabinet",
        "DĖL MINDAUGO SINKEVIČIAUS SKYRIMO LIETUVOS RESPUBLIKOS MINISTRU PIRMININKU": "cabinet",
        "DĖL INGOS RUGINIENĖS SKYRIMO LIETUVOS RESPUBLIKOS MINISTRE PIRMININKE": "cabinet",
        "DĖL LIETUVOS RESPUBLIKOS KULTŪROS IR LIETUVOS RESPUBLIKOS KRAŠTO APSAUGOS MINISTRŲ SKYRIMO": "cabinet",
        "DĖL LIETUVOS RESPUBLIKOS VYRIAUSYBĖS ATSISTATYDINIMO PRIĖMIMO IR PAVEDIMO JAI LAIKINAI EITI PAREIGAS": "cabinet",
    }
    for title, kind in cases.items():
        assert classify(title) == kind, title


def test_titles_that_only_look_like_cabinet_decrees_are_not():
    """A diplomatic rank contains „MINISTRO"; a court name contains „ADMINISTRACINIO"."""
    for title in (
        "DĖL LIETUVOS RESPUBLIKOS NEPAPRASTOJO PASIUNTINIO IR ĮGALIOTOJO MINISTRO DIPLOMATINIO RANGO SUTEIKIMO",
        "DĖL REGIONŲ ADMINISTRACINIO TEISMO TEISĖJO SKYRIMO",
        "DĖL LIETUVOS RESPUBLIKOS MINISTRO PIRMININKO PAVADAVIMO",
        "DĖL LIETUVOS RESPUBLIKOS PILIETYBĖS GRĄŽINIMO",
        "DĖL PULKININKO LAIPSNIO SUTEIKIMO",
    ):
        assert classify(title) == "other", title


def test_months_run_to_the_current_month_across_a_year_boundary():
    got = list(months_from((2024, 11), datetime.date(2025, 2, 3)))
    assert got == [(2024, 11), (2024, 12), (2025, 1), (2025, 2)]


def test_pagination_stops_when_a_page_brings_nothing_new():
    """lrp.lt answers a page past the end with the last rows again, not a 404."""
    calls = []

    class _Resp:
        def __init__(self, text):
            self.text = text

    def fake_fetch(url, **_):
        calls.append(url)
        return _Resp(page(COMPOSITION) if url.endswith("2026-07") else page(COMPOSITION, VETO) if url.endswith("/p8") else page(VETO))

    rows = read_month(2026, 7, fetch=fake_fetch, pause=0)
    assert [r[0] for r in rows] == ["1K-737", "1K-455"]
    assert calls == [
        "https://www.lrp.lt/lt/dekretai/2026-07",
        "https://www.lrp.lt/lt/dekretai/2026-07/p8",
        "https://www.lrp.lt/lt/dekretai/2026-07/p16",
    ]
