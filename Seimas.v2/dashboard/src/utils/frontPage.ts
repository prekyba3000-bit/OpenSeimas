import type { MpSummary, VoteSummary } from '../services/api';

/** A vote whose source published a count. All three are null together otherwise. */
export type CountedVote = VoteSummary & {
  votes_for: number;
  votes_against: number;
  votes_abstained: number;
};

export function hasCount(v: VoteSummary): v is CountedVote {
  return v.votes_for != null && v.votes_against != null && v.votes_abstained != null;
}

/**
 * The latest counted vote on each of the last `n` questions of the day.
 *
 * A fixed rule, so the front page never chooses which decisions to show. One
 * bill is often voted on several times in a row (articles, amendments, the
 * whole); without the grouping the three cards would be three votes on one
 * bill. Grouped by title, which is how the source names the question.
 */
export function latestQuestions(votes: VoteSummary[], n = 3): CountedVote[] {
  const counted = votes
    .filter(hasCount)
    .filter((v) => v.voted_at)
    .sort((a, b) => Date.parse(b.voted_at as string) - Date.parse(a.voted_at as string));
  const seen = new Set<string>();
  const out: CountedVote[] = [];
  for (const v of counted) {
    const key = (v.title ?? '').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length === n) break;
  }
  return out;
}

/** Lower-case and strip diacritics, so „Šimonytė" matches "simonyte". */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Members whose name or won constituency contains the query, accents ignored. */
export function searchMembers(mps: MpSummary[], query: string, n = 5): MpSummary[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  return mps
    .filter((m) => fold(m.name).includes(q) || (m.constituency_name && fold(m.constituency_name).includes(q)))
    .slice(0, n);
}

/**
 * `n` members with a photo, in random order, drawn fresh on every visit — so
 * the front page features nobody in particular.
 */
export function sampleFaces(mps: MpSummary[], n: number, random: () => number = Math.random): MpSummary[] {
  const pool = mps.filter((m) => m.photo_url);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

const TIME = new Intl.DateTimeFormat('lt-LT', {
  timeZone: 'Europe/Vilnius',
  hour: '2-digit',
  minute: '2-digit',
});

/** „18:47" in Vilnius time, or null. */
export function voteTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : TIME.format(t);
}
