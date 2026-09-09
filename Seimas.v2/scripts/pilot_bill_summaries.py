"""Render the P5 pilot for bills: ten summaries for human review.

Charter P5: "Plain-language summaries for votes and bills". The vote half
shipped on 2026-09-02; the bill half was left because `legislation` had 0 rows.
It has 1,683 now, and all of them join to votes on the registration number.

Nothing here writes to the database or to any public surface. It reads, renders
the deterministic template, runs the figure gate, and writes markdown.

Samples are chosen by shape, not at random: a bill's passage is where the
template can most easily overclaim — the one that looks decided, the one with
no published results at all, the one whose stages the source never named.

Usage:
    DB_DSN=... .venv/bin/python -m scripts.pilot_bill_summaries
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

from pipeline.summaries import render_bill_summary, verify, fetch_bill

OUT = Path(__file__).resolve().parent.parent.parent / "docs" / "reviews" / "p5-bill-summary-pilot.md"

# Selecting a bill that exhibits a given shape. The row the template actually
# reads is built by the canonical fetch_bill (pipeline/summaries/render.py) —
# the passage aggregate has one home, and this only decides WHICH bill to hand
# it. The predicate columns below (unnamed_stage_count, title length) exist for
# selection, not for the summary.
SELECT_SQL = """
WITH passage AS (
    SELECT l.project_id,
           l.title,
           count(*)                                         AS vote_count,
           count(*) FILTER (WHERE v.votes_participated > 0) AS tallied_count,
           min(v.sitting_date)                              AS first_date,
           max(v.sitting_date)                              AS last_date,
           count(*) FILTER (WHERE v.vote_type IS NULL)      AS unnamed_stage_count
    FROM legislation l
    JOIN votes v ON v.project_registration_nr = l.project_id
    GROUP BY l.project_id, l.title
)
SELECT project_id FROM passage WHERE {predicate} LIMIT 1
"""

SHAPES: tuple[tuple[str, str, str], ...] = (
    ("Įprastas projektas",
     "The ordinary case: a few votes, named stages, results published.",
     "vote_count BETWEEN 2 AND 5 AND tallied_count = vote_count AND unnamed_stage_count = 0"
     " ORDER BY last_date DESC"),
    ("Vienas balsavimas",
     "One vote. The template must not say „nuo … iki …“ about a single day.",
     "vote_count = 1 AND tallied_count = 1 ORDER BY last_date DESC"),
    ("Ilga eiga",
     "The longest passage in the database. A count this large is where a"
     " rephrasing would be tempted to round.",
     "TRUE ORDER BY vote_count DESC"),
    ("Atrodo priimtas",
     "Ends on a lopsided priėmimas. This is the sample the outcome refusal"
     " exists for: the reader will supply „priimta“ unaided.",
     "tallied_count = vote_count AND vote_count >= 2"
     " AND project_id IN (SELECT project_registration_nr FROM votes"
     "                    WHERE vote_type = 'Priėmimas' AND votes_for > 90"
     "                      AND votes_against = 0)"
     " ORDER BY last_date DESC"),
    ("Nė vieno paskelbto rezultato",
     "Every vote in the passage is one of the 1,656 with nothing published."
     " Must state the absence, never zeros.",
     "tallied_count = 0 ORDER BY vote_count DESC"),
    ("Dalis rezultatų nepaskelbta",
     "A mixed passage. The summary must say how much of it is visible.",
     "tallied_count > 0 AND tallied_count < vote_count ORDER BY vote_count DESC"),
    ("Nenurodyta stadija",
     "Some votes carry no stage. Naming the gap beats implying the stage list"
     " is the whole passage.",
     "unnamed_stage_count > 0 ORDER BY unnamed_stage_count DESC"),
    ("Sutrumpintas pavadinimas",
     "LRS caps titles at 200 characters. Quoting a cut-off legal title as the"
     " whole name states something the record does not.",
     "length(title) = 200 AND right(btrim(title), 1) <> ')' ORDER BY last_date DESC"),
    ("Vienuolika balsavimų",
     "Lithuanian numeral agreement: the teens take the genitive plural, and a"
     " rule written on the last digit alone gets „11 balsavimas“.",
     "vote_count = 11 ORDER BY last_date DESC"),
    ("Trumpiausias pavadinimas",
     "The shortest title in the set — the case where the quoted span is small"
     " enough that a rephrasing could absorb it without looking wrong.",
     "TRUE ORDER BY length(title) ASC"),
)


def fetch(cur, predicate: str):
    """Pick a bill matching the shape, then build its row the canonical way."""
    cur.execute(SELECT_SQL.format(predicate=predicate))
    picked = cur.fetchone()
    if picked is None:
        return None
    return fetch_bill(cur, picked["project_id"])


def main() -> int:
    dsn = os.environ.get("DB_DSN")
    if not dsn:
        print("DB_DSN not set", file=sys.stderr)
        return 2
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    lines = [
        "# P5 pilot — bill summaries for human review",
        "",
        "Generated by `scripts/pilot_bill_summaries.py`. **Nothing here has been",
        "published.** No route serves these, no `summary_revisions` row was written,",
        "no surface renders them. This is a document for a person to read.",
        "",
        "Every sentence is produced by a deterministic template from database",
        "columns. No LLM was involved, and none is required — the charter's",
        "sequencing is templates first, rephrasing only after this is approved.",
        "",
        "**What to check.** The Lithuanian throughout is working copy. The stage",
        "names are claims about Seimas procedure rather than about our data, so",
        "they need checking against the Statute. And the last sentence of every",
        "summary is load-bearing: our data has no outcome field at all, so a",
        "passage that ends 103–0 still must not read as a law that passed.",
        "",
        "**The figure gate.** Each sample is checked back against the aggregate it",
        "was built from: every digit must trace to a named column, or sit inside a",
        "span quoted verbatim from the source. `pažeidimų: 0` means it passed.",
        "",
    ]

    total_violations = 0
    for i, (heading, why, predicate) in enumerate(SHAPES, start=1):
        row = fetch(cur, predicate)
        lines += [f"## {i}. {heading}", "", f"*{why}*", ""]
        if row is None:
            lines += ["No bill in the database has this shape.", ""]
            continue

        summary = render_bill_summary(row)
        violations = verify(summary, row)
        total_violations += len(violations)

        lines += ["> " + summary.text.replace("\n", " "), ""]
        stages = ", ".join(f"{s or '—'}×{n}" for s, n in row["stage_counts"])
        lines += [
            f"`{row['project_id']}` · {row['vote_count']} balsavimai "
            f"({row['tallied_count']} su rezultatais) · {row['first_date']} → {row['last_date']} · {stages}",
            "",
        ]
        figures = ", ".join(f"`{f}`={v}" for f, v in summary.figures())
        lines += [f"Figures checked: {figures}", ""]
        if violations:
            lines.append("**PAŽEIDIMAI:**")
            lines += [f"- `{v.kind}` — {v.detail}" for v in violations]
        else:
            lines.append("pažeidimų: 0")
        lines.append("")

    lines += ["---", "", f"Total gate violations across the pilot: **{total_violations}**.", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT} ({total_violations} violations)")
    conn.close()
    return 1 if total_violations else 0


if __name__ == "__main__":
    sys.exit(main())
