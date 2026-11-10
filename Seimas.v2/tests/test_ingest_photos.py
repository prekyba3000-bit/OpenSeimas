"""Unit tests for pipeline.ingest_photos.build_photo_map."""
from pipeline.ingest_photos import build_photo_map, name_key


def b(qid, label, img=None):
    row = {"p": {"value": f"http://www.wikidata.org/entity/{qid}"}, "pLabel": {"value": label}}
    if img:
        row["img"] = {"value": f"http://commons.wikimedia.org/wiki/Special:FilePath/{img}"}
    return row


def test_matches_hyphenated_lithuanian_name():
    assert name_key("Agnė Jakavičiutė-Miliauskienė") == name_key("Agne Jakaviciute Miliauskiene")


def test_builds_https_commons_url():
    m = build_photo_map([b("Q1", "Jonas Jonaitis", "Jonas%20J.jpg")])
    assert m[name_key("Jonas Jonaitis")] == "https://commons.wikimedia.org/wiki/Special:FilePath/Jonas%20J.jpg?width=300"


def test_person_without_image_is_absent():
    assert build_photo_map([b("Q1", "Jonas Jonaitis")]) == {}


def test_ambiguous_name_is_skipped_not_guessed():
    rows = [b("Q1", "Jonas Jonaitis", "a.jpg"), b("Q2", "Jonas Jonaitis", "b.jpg")]
    assert build_photo_map(rows) == {}


def test_duplicate_rows_for_same_person_still_match():
    rows = [b("Q1", "Jonas Jonaitis", "a.jpg"), b("Q1", "Jonas Jonaitis", "b.jpg")]
    assert name_key("Jonas Jonaitis") in build_photo_map(rows)
