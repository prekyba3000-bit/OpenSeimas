import type { VoteOutcome } from "../components/DataStripVote";

/**
 * `votes.result_type` → a rendered outcome, or null.
 *
 * Two rules, and the order of them is the whole function:
 *
 * 1. "nepriimta" is tested *before* "priimta", because `"nepriimta".includes(
 *    "priimta")` is true. The original mapping tested "priimta" first, which
 *    would have labelled every rejected vote as passed the moment the column
 *    was populated. It never fired only because the column is empty.
 *
 * 2. Anything unrecognised — including null, which is currently every row —
 *    maps to null, never to a default outcome. The previous code fell back to
 *    'DEFERRED', which asserted that the Seimas had deferred a vote when the
 *    source had said nothing at all.
 */
export function toOutcome(result: string | null | undefined): VoteOutcome | null {
  const s = result?.toLowerCase();
  if (!s) return null;
  if (s.includes("nepriimta")) return "FAILED";
  if (s.includes("priimta")) return "PASSED";
  return null;
}
