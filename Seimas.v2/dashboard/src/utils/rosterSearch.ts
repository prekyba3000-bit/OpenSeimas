import type { MpSummary } from '../services/api';
import { fold } from './frontPage';

/**
 * Filter the already-loaded roster by name or faction, accents ignored.
 *
 * The list used to ask /api/v2/heroes/search and map each hit to a summary
 * with `attendance: 0` and `vote_count: 0`, so every searched member read
 * „0 %" (evaluation CORA-01). The roster rows already carry the resolved
 * figures, so filtering them keeps search and browse showing the same numbers.
 */
export function filterRoster(mps: MpSummary[], query: string): MpSummary[] {
  const q = fold(query.trim());
  if (!q) return mps;
  return mps.filter((mp) => fold(mp.name || '').includes(q) || fold(mp.party || '').includes(q));
}
