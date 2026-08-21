import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readMpDimension, DIMENSION_UNAVAILABLE_LT } from "../utils/mpLegacyDimensions";

/**
 * The leaderboard's own version of the trust floor.
 *
 * The three value cells read `(readMpDimension(row, dim) ?? 0).toFixed(1)`,
 * which printed „0.0“ for a member with no source data for that metric. In a
 * table sorted by that metric, 0.0 does not read as "unknown" — it reads as
 * "worst in parliament". Same disease as the „DEFERRED“ badge: a display
 * asserting what it did not know.
 */
describe("leaderboard dimension values", () => {
  it("readMpDimension returns null rather than a zero for a missing metric", () => {
    const bare = { id: "x", name: "X" } as never;
    expect(readMpDimension(bare, "legislativeActivity")).toBeNull();
  });

  it("the shared unavailable string is a sentence, not a number", () => {
    expect(DIMENSION_UNAVAILABLE_LT).toMatch(/šaltinio duomenys/);
    expect(DIMENSION_UNAVAILABLE_LT).not.toMatch(/^0/);
  });

  it("source has no `?? 0` fallback left on a dimension read", async () => {
    // Cheapest possible guard against the pattern coming back: it is a
    // one-character edit away and invisible in review.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "StebsenaView.tsx"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/readMpDimension\([^)]*\)\s*\?\?\s*0/);
  });
});

/**
 * §2.3: a dimension-sorted view ranks only the members it can rank.
 *
 * „Sort last as negative infinity" still placed them in the ranking, at the
 * bottom, which reads as worst — the same lie as a 0.0 cell, one layer up.
 */
describe("dimension-sorted leaderboard", () => {
  it("lifts NULL rows out of the ranking rather than sorting them last", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "StebsenaView.tsx"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    expect(code).not.toMatch(/Number\.NEGATIVE_INFINITY/);
    expect(code).toMatch(/unranked/);
    expect(code).toMatch(/Nepakanka duomenų/);
  });
});
