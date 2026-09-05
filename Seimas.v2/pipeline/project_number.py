"""The registration number of the legal-act project a vote is about.

One rule, in one place, because the alternative has already cost this project a
column. `votes.project_id` was filled by:

    project_id = q.get('registracijos_nr')
    if not project_id:
        match = re.search(r'Nr\\.\\s*([A-Za-z0-9-]+)', title)   # <- the defect
        if match: project_id = match.group(1)

The fallback takes the FIRST „Nr." in the title. For an amendment — which is
most of them — that is the law *being amended*, not the project doing the
amending. The project's own number sits later in the same title, in brackets:

    Pranešėjų apsaugos įstatymo Nr. XIII-804 3 straipsnio ... projektas (Nr. XVP-247)
                                 ^^^^^^^^^ stored                        ^^^^^^^^ the project

Measured over production on 2026-09-05: **3,464 of 4,392** votes carrying a
`project_id` held the wrong entity, and 331 stored values each collapsed several
distinct projects onto one key. `I-399` — the Statute, which every amendment
cites — stood for 44 different projects at once.

## Base number and revision are different facts

A project is re-registered when it is revised, and the source writes the
revision in a second bracket: `XVP-851(2)` is the second version of project 851.
Both are true and they answer different questions — *which document was voted
on* and *which project is this*. They are returned separately and stored in
separate columns, because putting two facts in one column is the mistake this
module exists to undo.

## What counts as a project number

`XVP-1234`, `XIVP-3452(2)`, `XIIIP-99`. The Roman numeral is the Seimas term, so
the set is open-ended and matching it as `X[IVX]*P-` is deliberate rather than
enumerating terms. Numbers WITHOUT the trailing `P` — `XIII-804`, `I-1489`,
`VIII-2043` — are enacted laws and are never project numbers; that distinction
is the whole point.
"""
from __future__ import annotations

import re
from typing import NamedTuple, Optional

# A project registration number: term in Roman numerals, then P, then the
# number, optionally followed by a revision in brackets.
_PROJECT = r"X[IVX]*P-\d+"
_REVISION = r"(?:\(\d+\))?"

# The number as the agenda title parenthesises it: „... projektas (Nr. XVP-247)".
# Anchored on the opening bracket, which is what separates it from the „Nr."
# naming the amended law earlier in the same sentence.
#
# The CLOSING bracket is required, and that is not tidiness. LRS clips titles at
# exactly 200 characters, and the number is the last thing in a title — so a
# clipped title ends mid-number:
#
#   "Seimo nutarimo „... NATO Parlamentinėje Asamblėjoje" pakeitimo" projektas (Nr. XVP-111
#                                                                              ^^^^^^^ cut
#
# The real number might be XVP-1112 or XVP-1119. Worse, the fragment „XVP-111"
# is itself a real and unrelated project, so accepting it would file a decision
# about NATO delegates under a VAT amendment — the exact collapse this module
# exists to undo, re-created one level down. An unclosed bracket yields nothing.
_IN_TITLE = re.compile(
    rf"\(\s*Nr\.\s*({_PROJECT}{_REVISION})\s*\)", re.IGNORECASE
)

# A bare attribute value, which the feed gives already clean.
_BARE = re.compile(rf"^\s*({_PROJECT}{_REVISION})\s*$", re.IGNORECASE)

_REVISION_SUFFIX = re.compile(r"\(\d+\)$")


class ProjectNumber(NamedTuple):
    """`registration` is the document voted on; `base` is the project."""

    registration: str
    base: str


def _normalise(value: str) -> str:
    # The feed is inconsistent about case and internal spacing.
    return re.sub(r"\s+", "", value).upper()


def base_of(registration: str) -> str:
    """`XVP-851(2)` -> `XVP-851`. A project, minus which revision was voted on."""
    return _REVISION_SUFFIX.sub("", registration)


def from_attribute(value: Optional[str]) -> Optional[ProjectNumber]:
    """The agenda item's `registracijos_nr`, when it really is a project number.

    The attribute is not always one. Where it holds an enacted-law number or an
    agenda item's ordinal (`250-I-1`), it is rejected here rather than stored as
    though it identified a project — that silent acceptance is how the column
    came to hold three different kinds of identifier.
    """
    if not value:
        return None
    match = _BARE.match(value)
    if not match:
        return None
    reg = _normalise(match.group(1))
    return ProjectNumber(reg, base_of(reg))


def from_title(title: Optional[str]) -> Optional[ProjectNumber]:
    """The parenthesised project number in an agenda title, if there is one.

    Deliberately never matches a bare „Nr. X" outside brackets. A title that
    carries no bracketed project number yields None: the vote may genuinely not
    be about a project (a procedural question, a group of questions), and
    guessing is what produced the defect.
    """
    if not title:
        return None
    match = _IN_TITLE.search(title)
    if not match:
        return None
    reg = _normalise(match.group(1))
    return ProjectNumber(reg, base_of(reg))


# A vote bundling several agenda items. LRS composes one title out of the
# children, so it names several project numbers at once.
_QUESTION_GROUP = re.compile(r"^\s*Klausim[uų]\s+grup", re.IGNORECASE)


def is_question_group(title: Optional[str]) -> bool:
    """Whether this vote covers several projects rather than one."""
    return bool(title and _QUESTION_GROUP.match(title))


def resolve(registracijos_nr: Optional[str], title: Optional[str]) -> Optional[ProjectNumber]:
    """The project a vote is about, from the two places the source states it.

    **The title wins**, which is the opposite of what looks natural — the
    attribute is the source naming the project directly, so it seems the more
    authoritative. Measured over all 5,286 production votes on 2026-09-05, it is
    simply less precise:

        votes where both give a project number   866
          agree on the base project              866
          disagree                                 0
          attribute carries a revision suffix      0
          title carries a revision suffix        415

    They never conflict. The title just says more: it names the document
    actually voted on, `XVP-1119(2)`, where the attribute names only the project,
    `XVP-1119`. Preferring the attribute would silently discard which version of
    a bill the chamber was looking at, and the revisions are not cosmetic —
    123 base projects carry more than one distinct title because a later
    revision amends a different set of articles.

    A question-group vote returns None. Its title is composed from several
    children and names several project numbers, so "the first bracketed number"
    would be an arbitrary pick among real candidates — the same class of guess
    that put the amended law in this column to begin with.
    """
    if is_question_group(title):
        return None
    return from_title(title) or from_attribute(registracijos_nr)


def project_title(title: Optional[str]) -> Optional[str]:
    """The agenda title with its trailing „(Nr. XVP-…)" removed.

    What is left is the project's name as LRS publishes it, which is what a
    `legislation` row should be called. Only a TRAILING bracket is stripped:
    titles that mention a project number mid-sentence are left alone, because
    removing it there would damage the sentence.
    """
    if not title:
        return None
    cleaned = re.sub(
        rf"\s*\(\s*Nr\.\s*{_PROJECT}{_REVISION}\s*\)\s*$", "", title.strip(),
        flags=re.IGNORECASE,
    )
    # Internal whitespace is collapsed. The feed spells the same title with one
    # space and with two, and two rows differing only by that would look like
    # two different projects — the same trap the faction names hit.
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or None
