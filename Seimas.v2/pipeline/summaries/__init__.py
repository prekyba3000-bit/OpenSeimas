"""Plain-language summaries (charter P5), template-first."""
from .vote_template import Segment, VoteSummary, render_vote_summary
from .bill_template import render_bill_summary
from .render import render_summary, fetch_vote, fetch_bill
from .verify import Violation, verify, verify_rendered, verify_segments

__all__ = [
    "Segment",
    "VoteSummary",
    "render_vote_summary",
    "render_bill_summary",
    "render_summary",
    "fetch_vote",
    "fetch_bill",
    "Violation",
    "verify",
    "verify_rendered",
    "verify_segments",
]
