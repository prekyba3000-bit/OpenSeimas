"""The figure gate.

Charter P5: "Every figure in the final text must match the database exactly or
the summary is rejected."

This module is the enforcement, and it is written to survive the step that has
not happened yet. Today the text is produced by a deterministic template, so
its numbers are correct by construction and checking them proves little. The
point is that tomorrow an LLM may be allowed to rephrase that text, and the
only defence against a rephrasing that renumbers - "103" becoming "apie 100",
a dropped digit, a helpfully computed total nobody asked for - is a check that
runs on the finished string without trusting how it was produced.

So `verify_rendered` takes text, not segments: it works on template output and
on rephrased output identically.

Three rules:

1. Every number must appear with its own source-bound label. "Už balsavo 98"
   and "prieš – 98" are different claims even though they contain the same
   digits. Date figures are bound to their month and position for the same
   reason.

2. Numbers may not be added, and figures may not be dropped. A rephrasing that
   silently loses "susilaike - 1" tells a different story than the record does,
   so a missing approved figure is a violation too.

3. Source and required-claim spans must survive intact. Titles and stage names
   are source text; the statement that no outcome is published is a claim the
   template stands behind. Additional outcome assertions are rejected when the
   source has no outcome. Requiring spans where they occur also means their
   digits cannot be borrowed for an unrelated claim.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Mapping

from .vote_template import VoteSummary

# A "number" for this purpose is a run of digits. Splitting on non-digits means
# "38-2" (an article reference) reads as 38 and 2, and "XVP-1777" as 1777 -
# deliberately over-eager: the check is that every digit run in the text is
# accounted for, and being generous about what counts as a number makes the
# gate stricter, not looser.
_DIGIT_RUN = re.compile(r"\d+")
_OUTCOME_CLAIM = re.compile(
    r"\b(?:(?:ne)?priimt\w*|atme\w*|(?:ne)?pritar\w*|patvirtin\w*|tapo\s+įstatym\w*)",
    re.IGNORECASE,
)
_LABEL_PUNCTUATION = " \t\r\n.,;:!?–—-"


@dataclass(frozen=True)
class Violation:
    kind: str
    detail: str


def _digit_runs(text: str) -> list[str]:
    return _DIGIT_RUN.findall(text)


def verify_segments(summary: VoteSummary, row: Mapping[str, Any]) -> list[Violation]:
    """Check the template's own construction against the database row.

    Catches template bugs: a figure wired to the wrong column, or literal
    wording that has grown a hardcoded number.
    """
    violations: list[Violation] = []

    for seg in summary.segments:
        if seg.kind == "literal":
            found = _digit_runs(seg.text)
            if found:
                violations.append(
                    Violation(
                        "digit_in_literal",
                        f"template wording contains {found}: {seg.text!r}. "
                        "Numbers must come from a figure segment so they can be checked.",
                    )
                )
            continue

        if seg.kind != "figure":
            continue

        field_ = seg.source_field or ""
        if field_.endswith(".year"):
            expected = str(row[field_[: -len(".year")]].year)
        elif field_.endswith(".day"):
            expected = str(row[field_[: -len(".day")]].day)
        elif field_ in row:
            expected = str(row[field_])
        else:
            violations.append(
                Violation("unknown_field", f"figure cites {field_!r}, absent from the row")
            )
            continue

        if seg.text != expected:
            violations.append(
                Violation(
                    "figure_mismatch",
                    f"{field_}: text says {seg.text!r}, database says {expected!r}",
                )
            )

    return violations


def approved_figures(summary: VoteSummary) -> list[str]:
    """Every digit run the finished text is allowed to contain, once the
    verbatim spans have been accounted for separately."""
    return [s.text for s in summary.segments if s.kind == "figure"]


def _labelled_figure_spans(summary: VoteSummary) -> list[tuple[str, str]]:
    """Bind every figure to its adjacent label, including a preceding stage name."""
    claims: list[tuple[str, str]] = []
    segments = summary.segments
    for index, segment in enumerate(segments):
        if segment.kind != "figure":
            continue
        before = ""
        if index and segments[index - 1].kind in ("literal", "verbatim"):
            before = segments[index - 1].text
            if (
                segments[index - 1].kind == "literal"
                and not before.strip(_LABEL_PUNCTUATION)
                and index > 1
                and segments[index - 2].kind == "verbatim"
            ):
                before = segments[index - 2].text + before
        after = ""
        if index + 1 < len(segments) and segments[index + 1].kind == "literal":
            after = segments[index + 1].text
        claims.append((segment.source_field or "", before + segment.text + after))
    return claims


def _consume_verbatim(text: str, summary: VoteSummary) -> tuple[str, list[Violation]]:
    """Remove each source or required-claim span once, where it occurs."""
    violations: list[Violation] = []
    remaining = text
    for seg in summary.segments:
        if seg.kind not in ("verbatim", "claim") or not seg.text:
            continue
        index = remaining.find(seg.text)
        if index < 0:
            kind = "verbatim_altered" if seg.kind == "verbatim" else "required_claim_altered"
            violations.append(
                Violation(
                    kind,
                    f"text no longer contains the required span {seg.source_field or seg.text!r} "
                    "unchanged; it must travel as the source and template wrote it",
                )
            )
            continue
        remaining = remaining[:index] + remaining[index + len(seg.text):]
    return remaining, violations


def verify_rendered(text: str, summary: VoteSummary) -> list[Violation]:
    """Check source-bound claims and figures in a finished string."""
    remaining, violations = _consume_verbatim(text, summary)

    for field, claim in _labelled_figure_spans(summary):
        if claim not in text:
            violations.append(
                Violation(
                    "figure_label_mismatch",
                    f"{field}: required labelled figure {claim!r} is absent or altered",
                )
            )

    allowed = list(approved_figures(summary))
    for run in _digit_runs(remaining):
        if run in allowed:
            allowed.remove(run)
        else:
            violations.append(
                Violation(
                    "unsupported_figure",
                    f"text contains {run!r}, which the source row does not support",
                )
            )

    for leftover in allowed:
        violations.append(
            Violation("dropped_figure", f"approved figure {leftover!r} is missing from the text")
        )

    if not summary.facts.get("outcome_published", False):
        outcome = _OUTCOME_CLAIM.search(remaining)
        if outcome:
            violations.append(
                Violation(
                    "unsupported_outcome",
                    f"text asserts an outcome the source does not publish: {outcome.group(0)!r}",
                )
            )

    return violations


def verify(summary: VoteSummary, row: Mapping[str, Any]) -> list[Violation]:
    """Both checks against the template's own output."""
    return verify_segments(summary, row) + verify_rendered(summary.text, summary)
