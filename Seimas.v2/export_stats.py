"""Retired 2026-08-31.

This produced dashboard/public/data/absenteeism.json — a „Gėdos siena", the
fifteen lowest-attendance members ranked #1 to #15 by name, each with a
`wage_unearned_eur` figure for the salary they had supposedly not earned, plus
a `top15_total_wage_unearned_eur` total. The daily sync regenerated it and
committed it to git every day.

It is the plainest case of what the accumulated law forbids: a rank, about
named people, under a moral label, carrying a derived accusation about money
they did not deserve. Every earlier cleanup — the heroes-villains retirement,
the integrity-index demotion, the loyalty de-ranking — passed over it, because
it was reached through a static JSON file rather than an API and no grep for
"score" or "rank" in the read paths ever touched it.

It was also wrong on its own terms. `present_if` counted a member present only
if they voted that day, which is attendance v1; v2 — registered OR voted — took
effect 2026-08-26. The same page therefore showed one member at 42.6% here and
44% in the panel above it.

Attendance is published per member with its denominator, its coverage note and
a „Kaip skaičiuojama?" drawer. Nothing is lost by deleting this except the
ranking, which was the part that should never have shipped.

Deliberately left as a stub rather than deleted, so that a future reader
looking for the export finds this instead of an absence.
"""
import sys

print(__doc__, file=sys.stderr)
sys.exit(0)
