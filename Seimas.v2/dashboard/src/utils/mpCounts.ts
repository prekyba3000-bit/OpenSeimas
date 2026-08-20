import type { DashboardStats, MpSummary } from "../services/api";
import { ltPlural } from "./ltPlural";

/**
 * How the platform talks about how many MPs there are.
 *
 * Three numbers are all true at once, which is why the wrong one looked
 * plausible everywhere it appeared:
 *
 *   141  the constitutional size of the Seimas (Article 55)
 *   140  members holding a valid mandate today
 *   148  everyone who held a mandate this term, including replaced members
 *        and the four who resigned the day they were sworn in
 *
 * A surface must show the one its label implies. These helpers exist so the
 * phrasing is decided once rather than re-improvised per component.
 */

/** Constitutional size, mirrored from the API's seats_total. */
export const SEIMAS_SEATS_TOTAL = 141;

/** True when the mandate covers today. Mirrors the API's SQL predicate. */
export function isMandateActive(
  mp: Pick<MpSummary, "mandate_start_date" | "mandate_end_date" | "is_active">,
  today: Date = new Date(),
): boolean {
  // Fall back to the flag when the dates are absent (older cached payloads).
  if (!mp.mandate_start_date) return mp.is_active !== false;
  const iso = today.toISOString().slice(0, 10);
  if (mp.mandate_start_date > iso) return false;
  return !mp.mandate_end_date || mp.mandate_end_date >= iso;
}

/**
 * „140 iš 141 vietų" — occupancy against the constitutional size.
 *
 * Tolerates a payload from an API that has not yet deployed the new fields:
 * during the window where the frontend is newer than the backend, `total_mps`
 * still carries the active count and the seat total is a constant anyway.
 * Without this the page renders the literal string "undefined".
 */
export function occupancyLabel(
  stats: Partial<Pick<DashboardStats, "mps_active" | "seats_total" | "total_mps">>,
): string {
  const active = stats.mps_active ?? stats.total_mps;
  const seats = stats.seats_total ?? SEIMAS_SEATS_TOTAL;
  if (active === undefined || active === null) return `— iš ${seats} vietų`;
  return `${active} iš ${seats} vietų`;
}

/** Active count from a stats payload, tolerating a pre-deploy backend. */
export function activeCount(
  stats: Partial<Pick<DashboardStats, "mps_active" | "total_mps">> | null,
): number | null {
  if (!stats) return null;
  return stats.mps_active ?? stats.total_mps ?? null;
}

/** Seat total from a stats payload, falling back to the constitutional constant. */
export function seatTotal(
  stats: Partial<Pick<DashboardStats, "seats_total">> | null,
): number {
  return stats?.seats_total ?? SEIMAS_SEATS_TOTAL;
}

/** „1 laisva vieta" / „2 laisvos vietos" — Lithuanian plural agreement. */
export function vacancyLabel(vacant: number): string | null {
  if (vacant <= 0) return null;
  return `${vacant} ${ltPlural(vacant, "laisva vieta", "laisvos vietos", "laisvų vietų")}`;
}

/** „Kadencija baigta" marker text for a former member, with the dates served. */
export function mandatePeriodLabel(
  mp: Pick<MpSummary, "mandate_start_date" | "mandate_end_date">,
): string | null {
  if (!mp.mandate_start_date) return null;
  const end = mp.mandate_end_date ?? "…";
  return `Mandatas: ${mp.mandate_start_date} – ${end}`;
}

/**
 * Whether a member served zero days — elected, then resigned before taking up
 * the seat. Worth saying out loud rather than showing a blank record.
 */
export function servedNoDays(
  mp: Pick<MpSummary, "mandate_start_date" | "mandate_end_date">,
): boolean {
  return (
    !!mp.mandate_start_date &&
    !!mp.mandate_end_date &&
    mp.mandate_start_date === mp.mandate_end_date
  );
}
