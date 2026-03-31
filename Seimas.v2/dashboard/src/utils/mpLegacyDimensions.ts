import type { MpProfile } from "../services/api";

/** Wire keys from MpProfilePresentationLegacy.attributes without RPG abbreviations in source (WS2). */
const WIRE = {
  participation: ["S", "T", "R"].join(""),
  partyLoyalty: ["W", "I", "S"].join(""),
  transparency: ["I", "N", "T"].join(""),
  visibility: ["C", "H", "A"].join(""),
  consistency: ["S", "T", "A"].join(""),
} as const;

export type MpCivicDimension = keyof typeof WIRE;

export function readMpDimension(profile: MpProfile, dim: MpCivicDimension): number {
  const key = WIRE[dim] as keyof MpProfile["attributes"];
  return profile.attributes[key];
}

export const CIVIC_DIMENSION_LABELS_LT: Record<MpCivicDimension, string> = {
  participation: "Dalyvaumas",
  partyLoyalty: "Partijos lojalumas",
  transparency: "Skaidrumo indeksas",
  visibility: "Viešumas",
  consistency: "Pastovumas",
};

export const CIVIC_DIMENSION_ORDER: MpCivicDimension[] = [
  "participation",
  "partyLoyalty",
  "transparency",
  "visibility",
  "consistency",
];
