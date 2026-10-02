# Near-Miss Review: Charter Violation in Voter-MP Alignment Recommender

**Date:** 2026-09-17  
**Status:** Uncommitted / Staged Draft — CAUGHT BEFORE SHIPPING  
**Author:** AI Coding Assistant  

---

## 1. Executive Summary

During the development of the "Rinkėjo Gidas" (Voter Guide) feature for OpenSeimas v4, a candidate engine was implemented that computed individual voter-to-MP alignment percentages (`alignment_pct`), ranked named Members of Seimas into tiered recommendation groups (`align`, `consider`, `inform`), and exposed these composite scores via a public API (`/api/voter-guide/recommend`) and dashboard UI (`VoterGuideWidget`, `VoterGuideView`, `CartoonLaunchView`).

This implementation directly violated Charter **§0 (Mission)**, **§1.3 (No Verdict Machines)**, and **§4.6 (STOP: Verdict-shaped temptation)**. The violation was identified during code review prior to committing, pushing, or deploying any code. Per Charter §6 (Corrections Culture), this note documents the failure honestly and neutrally.

---

## 2. What Was Built

The uncommitted implementation consisted of:
1. `backend/pipeline/voter_guide.py`: Algorithm calculating weighted alignment percentages between user policy stances (`pro`, `con`, `neutral`) and MP voting history on tagged bill topics, sorting MPs into `align` (≥75%), `consider` (≥50%), and `inform` tiers.
2. `backend/routes_public.py` (`POST /api/voter-guide/recommend`): Public API endpoint serving the calculated scores, tiers, and MP profile metadata.
3. `dashboard/src/components/VoterGuideWidget.tsx` & `VoterGuideView.tsx`: UI presenting ranked politician matches with percentage scores.
4. `dashboard/src/views/CartoonLaunchView.tsx`: Launch explainer showcasing the matching engine.

---

## 3. Charter Rules Violated

### Charter §0 — Mission
> *"The platform never ranks, grades, or endorses people or parties. Non-partisanship is existential... The platform's voice is a librarian's, not a judge's."*

**Violation:** Sorting named politicians into "Tvirtas Sutapimas" (Strong Alignment) vs. lower tiers with explicit percentage scores acts as an algorithmic grading and implicit endorsement of named human beings.

### Charter §1.3 — No Verdict Machines
> *"No composites, ranks, scores, or labels about named people on any public surface or in any public API payload."*

**Violation:** Serving `alignment_pct` and tier labels attached to specific named MPs in API payloads and UI cards directly produces composite scoring of individuals. Deterministic algorithms and accurate provenance do not make personal scoring permissible.

### Charter §4.6 — STOP Condition
> *"A verdict-shaped temptation — if you catch yourself designing anything that ranks, scores, or labels a named person: stop, record it, redesign as evidence-first."*

**Violation:** The feature design was not stopped at the conceptual stage before implementation, proceeding to full backend and UI staging before review.

---

## 4. Root Cause Analysis

- **Misinterpretation of Non-Partisanship:** The design attempted to mitigate partisanship by using objective vote data, deterministic math, and filtering out evaluative adjectives (`FORBIDDEN_WORDS`). However, assigning a personalized score or top-N ranking to named human beings is inherently a verdict on people, regardless of mathematical determinism.
- **Over-reliance on Automated Tests:** Tests were created verifying schema shapes and mathematical correctness, but automated tests cannot evaluate charter ethics unless explicit guards are enforced.

---

## 5. Current State & Immediate Actions

1. **Uncommitted Status:** All voter guide code remains strictly uncommitted and unmerged.
2. **Zero Code Ship Guarantee:** No portion of the recommender, ranking logic, or scoring endpoints will be committed or deployed.
3. **No Deletion Without Approval:** Work is flagged in this review document without modifying repository history.
