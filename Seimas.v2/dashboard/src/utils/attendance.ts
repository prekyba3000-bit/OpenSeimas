import type { MpSummary } from "../services/api";

/**
 * Attendance that may not exist, handled the same way everywhere.
 *
 * `MpSummary.attendance` is null for a member whose mandate covers fewer than
 * three sitting days — four members today. It used to arrive as 0.0 from the
 * API, and nine call sites then coerced it again with `?? 0`, so fixing the
 * server alone would have moved the lie rather than removed it: a suppressed
 * member would still have sorted last, coloured red, and counted as
 * low-attendance.
 *
 * Rule: a member with no publishable figure is excluded from every
 * calculation, and rendered as unknown rather than as a number.
 */

/** Short display for a cell. Not „0 %", and not blank. */
export const ATTENDANCE_UNKNOWN_LT = "—";

/** The reason, for a tooltip or a caption. */
// LT-COPY: needs native review
export const ATTENDANCE_UNKNOWN_REASON_LT =
  "Nepakanka duomenų — nario mandatas apima mažiau nei tris posėdžių dienas.";

export function hasAttendance(mp: Pick<MpSummary, "attendance">): boolean {
  return typeof mp.attendance === "number";
}

export function formatAttendance(value: number | null | undefined, digits = 0): string {
  return typeof value === "number" ? `${value.toFixed(digits)} %` : ATTENDANCE_UNKNOWN_LT;
}

/**
 * Mean attendance across members who have one.
 *
 * Suppressed members leave the denominator as well as the numerator — counting
 * them as 0 dragged a faction's average down by members nobody has a figure
 * for. Returns null when nobody in the group has a publishable figure, because
 * an average of nothing is not 0.
 */
export function averageAttendance(members: readonly Pick<MpSummary, "attendance">[]): number | null {
  const known = members.filter(hasAttendance).map((m) => m.attendance as number);
  if (known.length === 0) return null;
  return known.reduce((sum, v) => sum + v, 0) / known.length;
}

/**
 * Sort comparator putting members without a figure last, in either direction.
 *
 * `(b.attendance ?? 0) - (a.attendance ?? 0)` sorted them as the worst
 * attenders in parliament on the strength of no data at all.
 */
export function byAttendance(
  direction: "asc" | "desc" = "desc",
): (a: Pick<MpSummary, "attendance">, b: Pick<MpSummary, "attendance">) => number {
  return (a, b) => {
    const av = a.attendance;
    const bv = b.attendance;
    if (typeof av !== "number" && typeof bv !== "number") return 0;
    if (typeof av !== "number") return 1;
    if (typeof bv !== "number") return -1;
    return direction === "desc" ? bv - av : av - bv;
  };
}

/** Members with a publishable figure, for any list that ranks or counts. */
export function withAttendance<T extends Pick<MpSummary, "attendance">>(members: readonly T[]): T[] {
  return members.filter(hasAttendance);
}
