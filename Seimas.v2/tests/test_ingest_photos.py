"""Unit tests for pipeline.ingest_photos.build_photo_map."""
from pipeline.ingest_photos import build_photo_map, choose_photo, name_key, vrk_photo_url


def b(qid, label, img=None):
    row = {"p": {"value": f"http://www.wikidata.org/entity/{qid}"}, "pLabel": {"value": label}}
    if img:
        row["img"] = {"value": f"http://commons.wikimedia.org/wiki/Special:FilePath/{img}"}
    return row


def test_matches_hyphenated_lithuanian_name():
    assert name_key("Agnė Jakavičiutė-Miliauskienė") == name_key("Agne Jakaviciute Miliauskiene")


def test_builds_https_commons_url():
    m = build_photo_map([b("Q1", "Jonas Jonaitis", "Jonas%20J.jpg")])
    assert m[name_key("Jonas Jonaitis")] == "https://commons.wikimedia.org/wiki/Special:FilePath/Jonas%20J.jpg?width=600"


def test_person_without_image_is_absent():
    assert build_photo_map([b("Q1", "Jonas Jonaitis")]) == {}


def test_ambiguous_name_is_skipped_not_guessed():
    rows = [b("Q1", "Jonas Jonaitis", "a.jpg"), b("Q2", "Jonas Jonaitis", "b.jpg")]
    assert build_photo_map(rows) == {}


def test_duplicate_rows_for_same_person_still_match():
    rows = [b("Q1", "Jonas Jonaitis", "a.jpg"), b("Q1", "Jonas Jonaitis", "b.jpg")]
    assert name_key("Jonas Jonaitis") in build_photo_map(rows)


COMMONS = "https://commons.wikimedia.org/wiki/Special:FilePath/a.jpg?width=600"


def test_vrk_portrait_is_preferred_when_vrk_serves_it():
    assert choose_photo(2437189, "https://www.lrs.lt/x.jpg", COMMONS, exists=lambda u: True) == vrk_photo_url(2437189)


def test_vrk_address_is_not_stored_unless_it_answers_with_an_image():
    assert choose_photo(2437189, "https://www.lrs.lt/x.jpg", COMMONS, exists=lambda u: False) == COMMONS
    assert choose_photo(2437189, "https://www.lrs.lt/x.jpg", None, exists=lambda u: False) is None


def test_member_already_on_the_vrk_portrait_is_not_checked_again():
    def boom(url):
        raise AssertionError("no request expected")
    assert choose_photo(2437189, vrk_photo_url(2437189), COMMONS, exists=boom) is None


def test_member_without_a_vrk_id_gets_commons_or_nothing():
    assert choose_photo(None, "https://www.lrs.lt/x.jpg", COMMONS) == COMMONS
    assert choose_photo(None, COMMONS, COMMONS) is None
    assert choose_photo(None, "https://www.lrs.lt/x.jpg", None) is None
