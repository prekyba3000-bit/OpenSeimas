import { readMpDimension, type MpCivicDimension } from "./mpLegacyDimensions";
import type { MpProfile } from "../services/api";

/**
 * Where a member sits relative to colleagues, without a podium.
 *
 * „Dalyvauja dažniau nei 80 % kolegų" situates a number without producing a
 * first place and a last place. A rank invites a screenshot of the top or the
 * bottom; a band does not, because nobody is the winner of a band.
 *
 * Members with no publishable figure are excluded from the population as well
 * as from the result — counting them as zero would inflate everyone else's
 * percentile using people nobody has data for.
 */
export interface ContextBand {
  /** Share of comparable colleagues this member is above, 0–100. */
  percentile: number;
  /** How many colleagues the comparison actually used. */
  population: number;
}

export function contextBand(
  value: number | null,
  peers: readonly (number | null)[],
): ContextBand | null {
  if (typeof value !== "number") return null;
  const comparable = peers.filter((v): v is number => typeof v === "number");
  // A band computed from a handful of colleagues says more about the gaps in
  // the data than about the member.
  if (comparable.length < 10) return null;
  const below = comparable.filter((v) => v < value).length;
  return {
    percentile: Math.round((100 * below) / comparable.length),
    population: comparable.length,
  };
}

/** The same denominators the dial uses — drift between them would be a lie. */
export function bandFromProfiles(
  dim: MpCivicDimension,
  profile: MpProfile,
  peers: readonly MpProfile[],
): ContextBand | null {
  return contextBand(
    readMpDimension(profile, dim),
    peers.map((p) => readMpDimension(p, dim)),
  );
}

// LT-COPY: needs native review
export function contextBandLabel(dim: MpCivicDimension, band: ContextBand): string {
  const verb: Record<MpCivicDimension, string> = {
    attendance: "Dalyvauja dažniau nei",
    partyLoyalty: "Sutampa su frakcija dažniau nei",
    experience: "Patyrusesnis nei",
    legislativeActivity: "Aktyvesnis teisėkūroje nei",
    visibility: "Kalba dažniau nei",
  };
  return `${verb[dim]} ${band.percentile} % kolegų (iš ${band.population})`;
}
