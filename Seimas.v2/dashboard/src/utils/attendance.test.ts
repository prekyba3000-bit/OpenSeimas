import { describe, expect, it } from "vitest";
import {
  averageAttendance,
  byAttendance,
  formatAttendance,
  hasAttendance,
  withAttendance,
  ATTENDANCE_UNKNOWN_LT,
} from "./attendance";
import type { MpSummary } from "../services/api";

const mp = (attendance: number | null): Pick<MpSummary, "attendance"> => ({ attendance });

describe("attendance that may not exist", () => {
  it("renders unknown rather than zero", () => {
    // 0 % is a claim about a person — „never showed up". Null is the absence
    // of a claim. Four members have no publishable figure.
    expect(formatAttendance(null)).toBe(ATTENDANCE_UNKNOWN_LT);
    expect(formatAttendance(null)).not.toBe("0 %");
    expect(formatAttendance(0)).toBe("0 %");
    expect(formatAttendance(72.04)).toBe("72 %");
  });

  it("leaves suppressed members out of an average, denominator included", () => {
    // Counting them as 0 dragged a faction's average down by members nobody
    // has a figure for.
    expect(averageAttendance([mp(80), mp(60), mp(null)])).toBe(70);
    expect(averageAttendance([mp(80), mp(60)])).toBe(70);
  });

  it("returns null for a group where nobody has a figure", () => {
    // An average of nothing is not 0.
    expect(averageAttendance([mp(null), mp(null)])).toBeNull();
    expect(averageAttendance([])).toBeNull();
  });

  it("sorts members without a figure last, in both directions", () => {
    // `(b.attendance ?? 0) - (a.attendance ?? 0)` ranked them as the worst
    // attenders in parliament on the strength of no data at all.
    const rows = [mp(50), mp(null), mp(90)];
    expect([...rows].sort(byAttendance("desc")).map((r) => r.attendance)).toEqual([90, 50, null]);
    expect([...rows].sort(byAttendance("asc")).map((r) => r.attendance)).toEqual([50, 90, null]);
  });

  it("excludes them from any list that ranks or counts", () => {
    expect(withAttendance([mp(50), mp(null), mp(90)])).toHaveLength(2);
    expect(hasAttendance(mp(0))).toBe(true);
    expect(hasAttendance(mp(null))).toBe(false);
  });
});

describe("no reachable surface coerces attendance to zero", () => {
  it("has no `attendance ?? 0` or `attendance || 0` left", async () => {
    // The server fix alone would have moved the lie rather than removed it:
    // nine call sites re-created the zero client-side.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const SRC = join(__dirname, "..");
    const DEAD = /AlignmentScore|MpSelector|Header\.tsx/;

    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) {
          if (!["ui", "stories", "figma"].includes(e)) walk(full);
        } else if (/\.tsx?$/.test(e) && !/\.test\./.test(e) && !DEAD.test(full)) {
          files.push(full);
        }
      }
    };
    walk(join(SRC, "views"));
    walk(join(SRC, "components"));
    walk(join(SRC, "utils"));

    const offenders = files.filter((f) => {
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      return /attendance\s*(\?\?|\|\|)\s*0\b/.test(code);
    });
    expect(offenders.map((f) => f.replace(SRC, "src"))).toEqual([]);
  });
});
