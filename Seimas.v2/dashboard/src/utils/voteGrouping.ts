import type { VoteSummary } from "../services/api";

/**
 * Turning a flat vote list into something a person can scan.
 *
 * The list is one row per vote, and on a busy sitting day most of those rows
 * open with the same words. Seven consecutive „Klausimų grupė (Nr. …)“ rows
 * differ only in the identifier at the end — the part a truncating row is most
 * likely to cut off. So the shared opening becomes a header stated once, and
 * each child shows the identifier that actually distinguishes it, in full.
 *
 * Everything here is derived from the titles themselves. No vote is ever
 * hidden, reordered, or merged: `flattenVotes` returns every input row exactly
 * once, which is the property the tests hold it to.
 */

export type VoteListItem =
  | { kind: "date"; key: string; date: string; count: number }
  | { kind: "cluster"; key: string; base: string; count: number }
  | {
      kind: "vote";
      key: string;
      vote: VoteSummary;
      /** The wordy part. Safe to clamp — it is not what tells two rows apart. */
      base: string;
      /** The identifier. Never clamped, and never dropped. */
      suffix: string | null;
      clustered: boolean;
    };

/** Titles are clustered only once this many share an opening. */
const MIN_CLUSTER = 2;

/**
 * Split „… projektas (Nr. XVP-395(3))“ into its opening and its identifier.
 *
 * Scans backwards from a closing bracket counting depth, so a nested
 * „XVP-395(3)“ does not fool it into splitting at the inner bracket — which a
 * regex on the first „ (Nr.“ does, and which matters because these identifiers
 * are how a reader tells two otherwise identical rows apart.
 */
export function splitTitle(title: string): { base: string; suffix: string | null } {
  const trimmed = title.trim();
  if (!trimmed.endsWith(")")) return { base: trimmed, suffix: null };

  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i];
    if (ch === ")") depth++;
    else if (ch === "(") {
      depth--;
      if (depth === 0) {
        const base = trimmed.slice(0, i).trim();
        const suffix = trimmed.slice(i).trim();
        // A title that is nothing but a bracketed identifier has no opening to
        // share, so there is nothing to cluster on.
        return base ? { base, suffix } : { base: trimmed, suffix: null };
      }
    }
  }
  return { base: trimmed, suffix: null };
}

export function flattenVotes(votes: VoteSummary[]): VoteListItem[] {
  const byDate = new Map<string, VoteSummary[]>();
  for (const v of votes) {
    const list = byDate.get(v.date);
    if (list) list.push(v);
    else byDate.set(v.date, [v]);
  }

  const items: VoteListItem[] = [];

  // Insertion order preserves whatever order the API returned — the list is
  // already sorted by date descending and must not be re-sorted here.
  for (const [date, dayVotes] of byDate) {
    items.push({ kind: "date", key: `date-${date}`, date, count: dayVotes.length });

    const baseCounts = new Map<string, number>();
    for (const v of dayVotes) {
      const { base } = splitTitle(v.title);
      baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
    }

    const openedClusters = new Set<string>();
    for (const v of dayVotes) {
      const { base, suffix } = splitTitle(v.title);
      const clustered = (baseCounts.get(base) ?? 0) >= MIN_CLUSTER && suffix !== null;

      if (clustered && !openedClusters.has(base)) {
        openedClusters.add(base);
        items.push({
          kind: "cluster",
          key: `cluster-${date}-${base}`,
          base,
          count: baseCounts.get(base) ?? 0,
        });
      }

      items.push({
        kind: "vote",
        key: `vote-${v.id}`,
        vote: v,
        // A clustered row drops the opening entirely — it is stated once in
        // the header above. An unclustered row keeps its opening but hands the
        // identifier over separately, so a two-line clamp on a long title can
        // never eat the one part that distinguishes it.
        base: clustered ? "" : base,
        suffix,
        clustered,
      });
    }
  }

  return items;
}

/**
 * Whether outcome badges are worth drawing at all.
 *
 * A badge that reads the same on every row is decoration: it costs a glance
 * and discriminates nothing. Right now every vote has a null result, so this
 * returns false everywhere and the list draws no badges — which is also the
 * honest rendering, since no outcome is known.
 */
export function outcomesVary(votes: VoteSummary[]): boolean {
  const seen = new Set<string>();
  for (const v of votes) {
    seen.add(v.result ?? "");
    if (seen.size > 1) return true;
  }
  return false;
}
