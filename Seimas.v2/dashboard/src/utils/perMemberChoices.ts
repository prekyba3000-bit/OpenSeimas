/**
 * Whether a vote has individual per-member choices, and the three different
 * answers that question can have.
 *
 * 1,653 of 5,279 votes (31%) have none. The LRS results feed flags them
 * („Elektroninėmis priemonėmis gauti individualūs balsavimo rezultatai
 * neatitinka protokole įrašytų suminių rezultatų“) and publishes no per-member
 * data — but the API still returns one row per member with `choice: null`, so
 * the array is present and full-length while carrying nothing.
 *
 * Two surfaces crashed on this before the state was made explicit: the vote
 * detail page called `choice.toLowerCase()` and the MP profile's Balsavimai tab
 * called `choice.trim()`. Both threw on the first null and the error boundary
 * blanked the page.
 *
 * The three states are deliberately distinct, and the distinction that matters
 * most is `missing` vs `unpublished`:
 *
 *   missing      — no array at all. We do not have the data; we do not know
 *                  whether the source has it. Say nothing about the source.
 *   unpublished  — array present, but no member carries a choice. The source
 *                  recorded none. This is a fact we can state.
 *   present      — at least one member has a choice.
 *
 * Rendering `unpublished` as though it were `missing` would hide a fact we
 * have. Rendering `missing` as though it were `unpublished` would assert one we
 * do not.
 */
export type ChoiceDataState = "missing" | "unpublished" | "present";

export interface MemberChoice {
  choice?: string | null;
}

export function perMemberChoiceState(
  votes: readonly MemberChoice[] | null | undefined,
): ChoiceDataState {
  if (votes == null) return "missing";
  return votes.some((v) => v.choice != null && v.choice !== "") ? "present" : "unpublished";
}

/**
 * Whether the vote's own aggregate tallies exist.
 *
 * Deliberately independent of the per-member state: they are different fields
 * from different parts of the source, and a surface that has one should show
 * it whether or not it has the other. (In today's data the two always agree —
 * 3,626 votes have both, 1,653 have neither, none have only one — but coupling
 * them in the UI would hide a tally the moment that stops being true.)
 */
export function hasAggregateTallies(
  stats: Record<string, number> | null | undefined,
): boolean {
  if (!stats) return false;
  return ["Už", "Prieš", "Susilaikė"].some((k) => (stats[k] ?? 0) > 0);
}

export const NO_PER_MEMBER_DATA_LT = "Nėra duomenų apie pavienius balsus";

export const NO_PER_MEMBER_DATA_REASON_LT =
  "Šiam balsavimui šaltinis nepaskelbė, kaip balsavo kiekvienas narys — " +
  "elektroniniu būdu gauti rezultatai nesutapo su protokolo suvestine. " +
  "Rodome tik tai, kas užfiksuota.";

/**
 * A single member's non-choice, on a vote where the source published none.
 * Not „Nedalyvavo" — that would assert the member was absent, which is a
 * different claim and one nobody made.
 */
export const NO_CHOICE_RECORDED_LT = "Nėra duomenų";
