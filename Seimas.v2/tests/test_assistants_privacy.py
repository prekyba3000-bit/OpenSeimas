"""The assistants feed carries contact details. Nothing here may keep them.

This is a privacy boundary, not a preference, so it is asserted in three
places: the parser drops the fields, the schema has no column to hold them,
and no stored value looks like a phone number or an address. Any one of those
alone could be undone by a well-meaning change.
"""
import os
import re
from unittest.mock import patch

import psycopg2
import pytest

from pipeline import ingest_assistants as ia

DSN = os.environ.get("DB_DSN")

# One assistant, exactly as the feed sends them: twice, once per contact method.
FEED = b"""<?xml version="1.0" encoding="UTF-8"?>
<SeimoInformacija>
  <SeimoNarys asmens_id="7193">
    <SeimoNarioPad\xc4\x97j\xc4\x97jas vardas="Arvydas" pavard\xc4\x97="Domanskis"
      ar_apygardoje="Ne" kontakto_r\xc5\xab\xc5\xa1is="Telefonas" kontakto_reik\xc5\xa1m\xc4\x97="2096005"/>
    <SeimoNarioPad\xc4\x97j\xc4\x97jas vardas="Arvydas" pavard\xc4\x97="Domanskis"
      ar_apygardoje="Ne" kontakto_r\xc5\xab\xc5\xa1is="El. pa\xc5\xa1tas" kontakto_reik\xc5\xa1m\xc4\x97="arvydas.domanskis@lrs.lt"/>
    <SeimoNarioPad\xc4\x97j\xc4\x97jas vardas="Gintar\xc4\x97" pavard\xc4\x97="Ka\xc4\x8dinskien\xc4\x97"
      ar_apygardoje="Taip" kontakto_r\xc5\xab\xc5\xa1is="Telefonas" kontakto_reik\xc5\xa1m\xc4\x97="2096440"/>
  </SeimoNarys>
</SeimoInformacija>"""


class _Response:
    content = FEED


def _parse():
    with patch.object(ia, "fetch_with_retry", return_value=_Response()):
        return ia.fetch_assistants(7193)


def test_the_parser_returns_no_contact_value():
    rows = _parse()
    flat = " ".join(str(v) for row in rows for v in row)
    assert "2096005" not in flat, "a phone number survived parsing"
    assert "@lrs.lt" not in flat, "an email address survived parsing"
    assert "arvydas.domanskis" not in flat


def test_one_row_per_person_not_per_contact_method():
    """The feed repeats each assistant once per contact method. Two rows for
    Domanskis must not become two assistants."""
    rows = _parse()
    assert len(rows) == 2, f"expected 2 people, got {len(rows)}: {rows}"
    names = {(r[0], r[1]) for r in rows}
    assert ("Arvydas", "Domanskis") in names
    assert ("Gintarė", "Kačinskienė") in names


def test_constituency_flag_is_read_not_guessed():
    rows = {(r[0], r[1]): r[2] for r in _parse()}
    assert rows[("Arvydas", "Domanskis")] is False
    assert rows[("Gintarė", "Kačinskienė")] is True


def test_each_row_carries_exactly_the_three_public_fields():
    for row in _parse():
        assert len(row) == 3, f"row shape changed: {row}"


@pytest.mark.skipif(not DSN, reason="DB_DSN not set")
def test_the_schema_has_nowhere_to_put_a_contact():
    """Structural, not conventional. A parser can be changed back; a column
    that does not exist cannot quietly start being filled."""
    conn = psycopg2.connect(DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.mp_assistants')")
            if cur.fetchone()[0] is None:
                pytest.skip("mp_assistants not present (migration 032 not applied here)")
            cur.execute(
                """SELECT a.attname FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
                   WHERE c.relname = 'mp_assistants' AND a.attnum > 0 AND NOT a.attisdropped"""
            )
            columns = {r[0] for r in cur.fetchall()}
    finally:
        conn.close()

    forbidden = re.compile(r"contact|kontakt|phone|telefon|email|paštas|pastas|mobile", re.I)
    offenders = {c for c in columns if forbidden.search(c)}
    assert not offenders, f"mp_assistants grew a contact column: {offenders}"
    assert columns == {"id", "mp_id", "first_name", "last_name", "in_constituency", "created_at"}


@pytest.mark.skipif(not DSN, reason="DB_DSN not set")
def test_no_stored_name_looks_like_a_contact():
    """Belt and braces: even if a contact were smuggled into a name field, it
    would have digits or an @ in it."""
    conn = psycopg2.connect(DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.mp_assistants')")
            if cur.fetchone()[0] is None:
                pytest.skip("mp_assistants not present")
            cur.execute(
                "SELECT count(*) FROM mp_assistants "
                "WHERE first_name ~ '[0-9@]' OR last_name ~ '[0-9@]'"
            )
            assert cur.fetchone()[0] == 0
    finally:
        conn.close()
