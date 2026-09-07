import type { VoteOutcome } from "../components/DataStripVote";

/**
 * `votes.result_type` → a rendered outcome, or null.
 *
 * Two rules, and the order of them is the whole function:
 *
 * 1. Every negative is tested *before* its positive, because
 *    `"nepriimta".includes("priimta")` is true and so is
 *    `"nepritarta".includes("pritarta")`. A mapping that tests the positive
 *    first labels every rejected vote as passed the moment the column is
 *    populated. `votes.result_type` is NULL on all 5,286 rows today, which is
 *    the only reason this has never been visible.
 *
 * 2. Anything unrecognised — including null, which is currently every row —
 *    maps to null, never to a default outcome. The previous code fell back to
 *    'DEFERRED', which asserted that the Seimas had deferred a vote when the
 *    source had said nothing at all.
 *
 * Three views had each written their own version of rule 1 and three of them
 * had it backwards: VotesListView, VoteDetailView and SessionsView all tested
 * "priimta" first. They call this now. One rule, or it is not a rule.
 */
export function toOutcome(result: string | null | undefined): VoteOutcome | null {
  const s = result?.toLowerCase();
  if (!s) return null;
  if (s.includes("nepriimta") || s.includes("nepritarta") || s.includes("atmesta")) return "FAILED";
  if (s.includes("priimta") || s.includes("pritarta")) return "PASSED";
  return null;
}
