"""SECA-05: the batch summary job can draft but has no approval call."""
from scripts import publish_summaries


def test_batch_summary_job_posts_only_a_draft(monkeypatch):
    monkeypatch.setattr(publish_summaries, "SUMMARY_DRAFT_SECRET", "draft-only")
    calls = []

    def post(url, payload, headers):
        calls.append((url, payload, headers))

    monkeypatch.setattr(publish_summaries, "post_with_retry", post)
    publish_summaries.draft_summary("vote", "123", "Santrauka")

    assert len(calls) == 1
    url, payload, headers = calls[0]
    assert url.endswith("/admin/summaries")
    assert not url.endswith("/approve")
    assert headers == {"Authorization": "Bearer draft-only"}
    assert payload["entity_id"] == "123"
    assert "approved_by" not in payload
