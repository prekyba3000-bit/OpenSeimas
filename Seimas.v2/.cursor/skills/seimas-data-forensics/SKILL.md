---
name: seimas-data-forensics
description: Documents Seimas forensic engines, methods, and storage tables. Use when calibrating risk logic, validating forensic output quality, or mapping explainability payloads to underlying analyses.
---

# Seimas Data Forensics

## Engine Overview

1. Benford's Law
   - Purpose: detect suspicious distribution patterns in financial declaration digits.
   - Method: compares observed leading-digit distribution to Benford expectation.
   - Table: `benford_analyses` (typically includes `p_value` and timestamps).

2. Chrono-Forensics
   - Purpose: detect suspiciously fast amendment authoring behavior.
   - Method: z-score anomaly on drafting speed / amendment timing.
   - Table: `amendment_profiles` (z-score and amendment behavior fields).

3. Vote Geometry
   - Purpose: detect improbable voting coordination/outlier sessions.
   - Method: sigma/deviation score from expected vote-space positioning.
   - Table: `vote_geometry` (deviation/anomaly metrics).

4. Phantom Network
   - Purpose: surface corporate-procurement and debtor proximity links.
   - Method: graph traversal from MP-linked entities to procurement/debtor nodes.
   - Tables: `phantom_network` or compatible variants (`phantom_network_hits`, `phantom_links`).

5. Loyalty Graph
   - Purpose: measure party-line divergence over voting days.
   - Method: day-level independent voting ratio vs. party consensus baseline.
   - Source tables: computed from `mp_votes`, `votes`, `politicians` (derived signal in hero engine).

## Explainability Notes

- Each engine should produce `status`, score signal, and interpretable explanation.
- Missing tables are represented as `unavailable`, not silent failures.
