import type { MpProfile } from "../services/api";

/**
 * Which numbers the MP surfaces are allowed to show.
 *
 * Audit of 2026-08-12: the five `attributes.*` composites were labelled as things
 * they do not measure. STR (labelled „Dalyvaumas" — also a misspelling of
 * „Dalyvavimas") is authored bills + committee roles;
 * WIS ("Partijos lojalumas") is seniority + votes cast; STA ("Pastovumas") is
 * 80% attendance. Meanwhile the real attendance and party-loyalty figures sit
 * unused in `metrics`. Worse, three composites read from tables that are still
 * empty, so they render 0.0 — or, for the forensic score, a baseline 100.0 that
 * reads as a perfect record.
 *
 * Rule this module enforces: a metric is shown only when a populated source
 * backs it. Anything else renders the "not yet ingested" note — never a number,
 * and never a relabelled zero.
 */

export type MpCivicDimension =
  | "attendance"
  | "partyLoyalty"
  | "experience"
  | "legislativeActivity"
  | "visibility"
  | "integrity";

export const CIVIC_DIMENSION_LABELS_LT: Record<MpCivicDimension, string> = {
  attendance: "Dalyvavimas",
  partyLoyalty: "Partijos lojalumas",
  experience: "Patirtis ir aktyvumas",
  legislativeActivity: "Teisėkūros aktyvumas",
  visibility: "Viešumas",
  integrity: "Skaidrumo indeksas",
};

/** Shown under a metric that has no data behind it yet. */
export const DIMENSION_UNAVAILABLE_LT = "Rodiklis bus rodomas, kai bus įkelti šaltinio duomenys.";

/** Wire keys for the legacy composite attributes (no RPG abbreviations in source). */
const WIRE = {
  experience: ["W", "I", "S"].join(""),
  legislativeActivity: ["S", "T", "R"].join(""),
  visibility: ["C", "H", "A"].join(""),
  integrity: ["I", "N", "T"].join(""),
} as const;

function legacyAttribute(profile: MpProfile, key: keyof typeof WIRE): number | null {
  const value = profile.attributes?.[WIRE[key] as keyof MpProfile["attributes"]];
  return typeof value === "number" ? value : null;
}

/** True when the backend says real data backs this attribute for this member. */
function hasSource(profile: MpProfile, key: keyof typeof WIRE): boolean {
  const provenance = profile.metrics_provenance?.[WIRE[key] as "STR" | "WIS" | "CHA" | "INT" | "STA"];
  return provenance !== undefined && provenance !== "unavailable";
}

/**
 * Value for a dimension, or null when no populated source backs it.
 *
 * Empty-source dimensions (legislative activity: `legislation` is empty;
 * visibility: `speeches` is empty; integrity: forensic tables are empty and the
 * engine falls back to 100) return null until those ingests run.
 */
export function readMpDimension(profile: MpProfile, dim: MpCivicDimension): number | null {
  switch (dim) {
    case "attendance": {
      const value = profile.metrics?.attendance_percentage;
      return typeof value === "number" ? value : null;
    }
    case "partyLoyalty": {
      const value = profile.metrics?.party_loyalty;
      return typeof value === "number" ? value : null;
    }
    case "experience":
      return legacyAttribute(profile, "experience");
    case "legislativeActivity":
      // Resurrects on its own once the source is ingested: the backend reports
      // "unavailable" per attribute when nothing backs it, so no code change is
      // needed when a backfill lands.
      return hasSource(profile, "legislativeActivity")
        ? legacyAttribute(profile, "legislativeActivity")
        : null;
    case "visibility":
      return hasSource(profile, "visibility") ? legacyAttribute(profile, "visibility") : null;
    case "integrity":
      // Deliberately not provenance-driven. The engine reports INT as "direct"
      // and returns a baseline 100 for everyone even when the forensic tables
      // (vote_geometry, benford_analyses, procurement_contracts) are empty, so
      // provenance cannot distinguish a clean record from no data. Stays hidden
      // until those inputs exist.
      return null;
    default:
      return null;
  }
}

/** Order the surfaces render dimensions in; unavailable ones still render their note. */
export const CIVIC_DIMENSION_ORDER: MpCivicDimension[] = [
  "attendance",
  "partyLoyalty",
  "experience",
  "legislativeActivity",
  "visibility",
  "integrity",
];

/** Dimensions with a value for this profile — used where a bare number is required. */
export function availableDimensions(profile: MpProfile): MpCivicDimension[] {
  return CIVIC_DIMENSION_ORDER.filter((dim) => readMpDimension(profile, dim) !== null);
}
