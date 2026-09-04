/**
 * A member's parliamentary faction, and the honest label when they have none.
 *
 * `current_party` is the faction (frakcija), and since migration 039 it is NULL
 * rather than a fallback when the member sits in none. Exactly one active
 * member is in that state today: the Seimo Pirmininkas, whose faction
 * membership the source records as ending when he took the chair.
 *
 * Before 039 the column silently fell back to the NOMINATING party, so a
 * reader could not tell whether „Lietuvos socialdemokratų partija" meant the
 * faction or the people who put that member on the ballot. Those are different
 * facts and now live in different columns.
 *
 * The label deliberately does not say „nepriklauso frakcijai" — that asserts
 * non-membership, and while it happens to be true of the Speaker, it would be
 * an over-claim the first time resolution fails for some other reason. Saying
 * the faction is not stated is true in both cases.
 *
 * LT-COPY: needs native review.
 */
export const NO_FACTION_LT = 'Frakcija nenurodyta';

export function factionLabel(party?: string | null): string {
  const trimmed = (party ?? '').trim();
  return trimmed === '' || trimmed === 'Unknown' ? NO_FACTION_LT : trimmed;
}

export function hasFaction(party?: string | null): boolean {
  const trimmed = (party ?? '').trim();
  return trimmed !== '' && trimmed !== 'Unknown';
}
