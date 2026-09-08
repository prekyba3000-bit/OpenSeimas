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

1. Every number in the text must be one the source row supports - the figures
   the template emitted, once the verbatim spans have been accounted for.

2. Numbers may not be added, and figures may not be dropped. A rephrasing that
   silently loses "susilaike - 1" tells a different story than the record does,
   so a missing approved figure is a violation too.

3. Spans copied verbatim from the source must survive intact. This closes a
   hole the first two rules leave open: a title like "Nr. IX-675 5, 17, 41
   straipsniu" puts 675, 5, 17 and 41 into the allowed multiset, and a
   rephrasing could spend one of them on a claim of its own - "susilaike 41" -
   while quietly dropping it from the title. Requiring the verbatim span to
   appear, and accounting for its digits where it appears, means those digits
   are spent on the title and cannot be borrowed. What is left to check
   against is exactly the figures the template stands behind.
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


def _consume_verbatim(text: str, summary: VoteSummary) -> tuple[str, list[Violation]]:
    """Remove each verbatim span from the text, once, where it occurs.

    A span that is not there is a violation in itself: the title is the one
    part of a summary that must reach the reader as the source wrote it, and a
    rephrasing that edits it is describing a different law.
    """
    violations: list[Violation] = []
    remaining = text
    for seg in summary.segments:
        if seg.kind != "verbatim" or not seg.text:
            continue
        index = remaining.find(seg.text)
        if index < 0:
            violations.append(
                Violation(
                    "verbatim_altered",
                    f"text no longer contains the source span {seg.source_field or seg.text!r} "
                    "unchanged; it must travel as the source wrote it",
                )
            )
            continue
        remaining = remaining[:index] + remaining[index + len(seg.text):]
    return remaining, violations


def verify_rendered(text: str, summary: VoteSummary) -> list[Violation]:
    """Check a finished string - template output or a rephrasing of it.

    Compares multisets, so a figure repeated twice in text that the row
    supports once is caught.
    """
    remaining, violations = _consume_verbatim(text, summary)
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

    return violations


def verify(summary: VoteSummary, row: Mapping[str, Any]) -> list[Violation]:
    """Both checks against the template's own output."""
    return verify_segments(summary, row) + verify_rendered(summary.text, summary)
