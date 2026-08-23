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
  | "visibility";

export const CIVIC_DIMENSION_LABELS_LT: Record<MpCivicDimension, string> = {
  attendance: "Dalyvavimas",
  partyLoyalty: "Partijos lojalumas",
  experience: "Patirtis ir aktyvumas",
  // LT-COPY: needs native review
  legislativeActivity: "Inicijuoti ar prisidėta prie projektų",
  visibility: "Viešumas",
};

/** Shown under a metric that has no data behind it yet. */
export const DIMENSION_UNAVAILABLE_LT = "Rodiklis bus rodomas, kai bus įkelti šaltinio duomenys.";

/**
 * Wire keys for the three chamber-relative dimensions.
 *
 * These were RPG stat abbreviations — STR, WIS, CHA, plus INT holding the
 * composite and STA a second aggregation nothing rendered. The API now names
 * them for what they measure, so the indirection that used to hide the
 * abbreviations from source is no longer needed.
 */
const WIRE = {
  experience: "experience",
  legislativeActivity: "legislative_activity",
  visibility: "visibility",
} as const;

function dimensionValue(profile: MpProfile, key: keyof typeof WIRE): number | null {
  const value = profile.dimensions?.[WIRE[key]];
  return typeof value === "number" ? value : null;
}

/** True when the backend says real data backs this attribute for this member. */
function hasSource(profile: MpProfile, key: keyof typeof WIRE): boolean {
  const provenance = profile.metrics_provenance?.[WIRE[key]];
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
      return dimensionValue(profile, "experience");
    case "legislativeActivity":
      // Resurrects on its own once the source is ingested: the backend reports
      // "unavailable" per attribute when nothing backs it, so no code change is
      // needed when a backfill lands.
      return hasSource(profile, "legislativeActivity")
        ? dimensionValue(profile, "legislativeActivity")
        : null;
    case "visibility":
      return hasSource(profile, "visibility") ? dimensionValue(profile, "visibility") : null;
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
];

/** Dimensions with a value for this profile — used where a bare number is required. */
export function availableDimensions(profile: MpProfile): MpCivicDimension[] {
  return CIVIC_DIMENSION_ORDER.filter((dim) => readMpDimension(profile, dim) !== null);
}
