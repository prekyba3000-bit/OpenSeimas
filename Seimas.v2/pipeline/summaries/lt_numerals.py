"""Lithuanian numeral agreement, for text the pipeline generates.

Mirrors dashboard/src/utils/ltPlural.ts exactly. The two exist separately
because the summary text is built server-side and the dashboard formats its
own counts client-side; if either changes, change both.

Three forms, chosen by the last one or two digits:
    ends in 1, except 11-19   -> nominative singular  (1 narys, 21 narys)
    ends in 2-9, except 11-19 -> nominative plural    (3 nariai, 25 nariai)
    ends in 0, or 11-19       -> genitive plural      (10 nariu, 15 nariu)

The teens are the trap: 11 takes the genitive plural even though it ends in a
1, so a rule written only on the last digit produces "11 narys" - wrong in a
way that reads as machine-generated text.
"""


def lt_plural(n: int, one: str, few: str, many: str) -> str:
    last_two = abs(n) % 100
    last = abs(n) % 10
    if 11 <= last_two <= 19:
        return many
    if last == 0:
        return many
    if last == 1:
        return one
    return few
