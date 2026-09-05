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

/**
 * Values that all mean "this member sits in no faction".
 *
 * `'null'` is not paranoia. `/api/votes/{id}` returns `party_stats` as an
 * object keyed by faction name, and a JSON object key cannot BE null — Python
 * stringifies the None key on the way out, so the wire carries the four
 * characters n-u-l-l. The vote page rendered that verbatim as a faction row
 * labelled „null" the moment current_party became NULL for the Speaker.
 *
 * `'Unknown'` is the old English placeholder, kept here so any surface still
 * receiving it lands on the same label.
 */
const ABSENT = new Set(['', 'null', 'undefined', 'Unknown']);

export function factionLabel(party?: string | null): string {
  const trimmed = (party ?? '').trim();
  return ABSENT.has(trimmed) ? NO_FACTION_LT : trimmed;
}

export function hasFaction(party?: string | null): boolean {
  return !ABSENT.has((party ?? '').trim());
}
