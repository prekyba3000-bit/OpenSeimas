import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Evaluation CORA-03 (2026-11-22). The seat map's tooltip wrote
 * `{attendance?.toFixed(0) ?? '—'}% dalyvavimas`, so an unknown figure read
 * „—% dalyvavimas": the placeholder dressed as a measurement. The shape is the
 * defect, not this instance — any fallback literal followed by a percent sign
 * in markup. Unknown goes through `formatAttendance`, which owns both halves.
 */
const SRC = join(__dirname, "..");

function sourceFiles(dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!["ui", "stories", "figma"].includes(entry)) walk(full);
      } else if (/\.tsx$/.test(entry) && !/\.test\./.test(entry)) {
        out.push(full);
      }
    }
  };
  dirs.forEach((d) => walk(join(SRC, d)));
  return out;
}

const FALLBACK_THEN_PERCENT = /\?\?\s*(['"`])[^'"`]*\1\s*\}\s*%/;

describe("an unknown figure is not written as a percentage", () => {
  const files = sourceFiles(["views", "components"]);

  it("finds the surfaces to check", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("puts no percent sign after a fallback placeholder", () => {
    const offenders = files
      .filter((f) => FALLBACK_THEN_PERCENT.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it("recognises the shape it guards against", () => {
    expect(FALLBACK_THEN_PERCENT.test("{mp.attendance?.toFixed(0) ?? '—'}% dalyvavimas")).toBe(true);
    expect(FALLBACK_THEN_PERCENT.test("{formatAttendance(mp.attendance)} dalyvavimas")).toBe(false);
  });
});
