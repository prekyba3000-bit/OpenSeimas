"""
Compute vote-geometry signals end-to-end.

Step 1: run the per-vote statistical model (skaidrumas/analysis/vote_geometry.py),
which writes flagged votes (sigma > 3.0) into vote_geometry.

Step 2: roll the per-vote rows up into mp_vote_geometry — one row per MP with
their worst sigma and how many anomalous votes they participated in. The hero
engine reads this rollup; without it the engine can't answer "what's this MP's
geometry signal" because vote_geometry has no mp_id.
"""

import os
import sys

import psycopg2

# Make skaidrumas package importable when running from repo root.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from skaidrumas.analysis.vote_geometry import run_vote_geometry


DB_DSN = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")


# Per-MP signal = party defections on anomalous votes.
#
# The per-vote model flags votes whose total result deviated from faction-rate
# expectations. Plain MAX(deviation_sigma) across all votes an MP participated
# in is degenerate: every MP who attends regularly hits the same ceiling sigma
# (the worst single anomalous vote of their term), which carries no
# differentiation between MPs.
#
# What is MP-specific: did this MP vote *against* their own party's majority
# choice on anomalous votes? Those are defections. Counting them, plus the
# max sigma among them, gives a signal that varies per-MP and aligns with
# the engine's interpretation ("participated in geometry outlier event").
#
# Party-history caveat: politicians.current_party is the present-day party,
# not the party at the time of the vote. Within the current term (vote_geometry
# data spans 2024-11 → present, single Seimas) intra-term switching is
# uncommon, so the proxy is acceptable. Cross-term analysis would need a
# frakcija-history ingest from LRS. MPs with current_party IN (NULL, 'Unknown')
# are excluded from the defection computation — they aren't a real bloc and
# bunching them together produces a meaningless "majority" choice.
ROLLUP_SQL = """
WITH party_majority AS (
    SELECT vg.vote_id,
           p.current_party,
           mode() WITHIN GROUP (ORDER BY mv.vote_choice) AS majority_choice
    FROM vote_geometry vg
    JOIN mp_votes mv ON mv.vote_id = vg.vote_id
    JOIN politicians p ON p.id = mv.politician_id
    WHERE p.current_party IS NOT NULL
      AND p.current_party <> 'Unknown'
      AND mv.vote_choice IS NOT NULL
      AND mv.vote_choice <> 'Nedalyvavo'
    GROUP BY vg.vote_id, p.current_party
),
defections AS (
    SELECT mv.politician_id,
           vg.vote_id,
           vg.deviation_sigma,
           vg.computed_at
    FROM vote_geometry vg
    JOIN mp_votes mv ON mv.vote_id = vg.vote_id
    JOIN politicians p ON p.id = mv.politician_id
    JOIN party_majority pm
      ON pm.vote_id = vg.vote_id
     AND pm.current_party = p.current_party
    WHERE p.current_party IS NOT NULL
      AND p.current_party <> 'Unknown'
      AND mv.vote_choice IS NOT NULL
      AND mv.vote_choice <> 'Nedalyvavo'
      AND mv.vote_choice <> pm.majority_choice
)
INSERT INTO mp_vote_geometry (
    mp_id, max_deviation_sigma, anomalous_vote_count, last_anomalous_vote_id, computed_at
)
SELECT
    politician_id,
    MAX(deviation_sigma),
    COUNT(*),
    (ARRAY_AGG(vote_id ORDER BY computed_at DESC))[1],
    NOW()
FROM defections
GROUP BY politician_id
ON CONFLICT (mp_id) DO UPDATE SET
    max_deviation_sigma = EXCLUDED.max_deviation_sigma,
    anomalous_vote_count = EXCLUDED.anomalous_vote_count,
    last_anomalous_vote_id = EXCLUDED.last_anomalous_vote_id,
    computed_at = EXCLUDED.computed_at;
"""


def main():
    if not DB_DSN:
        print("ERROR: DB_DSN not set")
        sys.exit(1)

    print("Step 1: per-vote geometry analysis…")
    result = run_vote_geometry()
    print(
        f"  analyzed={result['total_analyzed']} flagged={len(result['flagged'])}"
    )

    print("Step 2: rolling up to mp_vote_geometry…")
    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE mp_vote_geometry")
            cur.execute(ROLLUP_SQL)
            cur.execute("SELECT COUNT(*) FROM mp_vote_geometry")
            mp_count = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM mp_vote_geometry WHERE max_deviation_sigma > 3.0"
            )
            flagged = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM mp_vote_geometry "
                "WHERE max_deviation_sigma > 2.0 AND max_deviation_sigma <= 3.0"
            )
            warning = cur.fetchone()[0]
        conn.commit()
    finally:
        conn.close()

    print(f"  mp_vote_geometry rows: {mp_count}")
    print(f"  flagged (sigma > 3.0): {flagged}")
    print(f"  warning (2.0 < sigma <= 3.0): {warning}")


if __name__ == "__main__":
    main()
