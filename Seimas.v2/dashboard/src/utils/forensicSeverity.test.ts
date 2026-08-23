import { describe, it, expect } from "vitest";
import { forensicSeverityFromStatus } from "../services/api";
import { forensicBreakdownToFlags } from "./forensicBreakdownToFlags";
import type { ForensicBreakdown } from "../services/api";

/**
 * Three of the five forensic engines return `unavailable` in production, with
 * the explanation „table is unavailable". They were rendering as „Žemas" — a
 * low-severity finding — beside a named member of parliament. Not-measured and
 * measured-and-fine are different facts.
 */
describe("engine status to severity", () => {
  it("maps unavailable to unknown, never to a grade", () => {
    expect(forensicSeverityFromStatus("unavailable")).toBe("unknown");
  });

  it("still grades the statuses that are real findings", () => {
    expect(forensicSeverityFromStatus("flagged")).toBe("high");
    expect(forensicSeverityFromStatus("critical")).toBe("high");
    expect(forensicSeverityFromStatus("warning")).toBe("medium");
    expect(forensicSeverityFromStatus("clean")).toBe("none");
  });

  it("treats an unrecognised status as ungradeable rather than low", () => {
    // The old fallback was `return "low"`, so any status the client did not
    // know about became a finding about a person.
    expect(forensicSeverityFromStatus("something_new" as never)).toBe("unknown");
  });

  it("never returns `low` for a status that means no data", () => {
    for (const s of ["unavailable", "" as never, undefined as never]) {
      expect(forensicSeverityFromStatus(s as never)).not.toBe("low");
    }
  });
});

// pickFlag() copies `engine` straight through from the entry, so the fixture
// must carry it exactly as mapRawForensicEntry() would.
function entry(engine: string, status: string, penalty = 0) {
  return {
    engine,
    status,
    title: engine,
    explanation: `explanation for ${status}`,
    description: `explanation for ${status}`,
    penalty,
    severity: forensicSeverityFromStatus(status as never),
  } as never;
}

describe("flags built from a production-shaped breakdown", () => {
  // Exactly what /api/v2/heroes/{id} returned on 2026-08-24.
  const bd = {
    benford: entry("benford", "clean"),
    chrono: entry("chrono", "unavailable"),
    voteGeometry: entry("vote_geometry", "unavailable"),
    phantomNetwork: entry("phantom", "unavailable"),
    loyaltyBonus: { status: "warning", explanation: "…", bonus: 10 },
    totalForensicAdjustment: 10,
  } as unknown as ForensicBreakdown;

  it("marks every unavailable engine unknown, not low", () => {
    const flags = forensicBreakdownToFlags(bd);
    const byEngine = Object.fromEntries(flags.map((f) => [f.engine, f.severity]));
    expect(byEngine.chrono).toBe("unknown");
    expect(byEngine.vote_geometry).toBe("unknown");
    expect(byEngine.phantom).toBe("unknown");
  });

  it("keeps the engines that did produce a finding", () => {
    const byEngine = Object.fromEntries(
      forensicBreakdownToFlags(bd).map((f) => [f.engine, f.severity]),
    );
    expect(byEngine.benford).toBe("none");
    expect(byEngine.loyalty).toBe("medium");
  });

  it("asserts nothing gradeable about a member with three unavailable engines", () => {
    const graded = forensicBreakdownToFlags(bd).filter((f) => f.severity === "low");
    expect(graded).toHaveLength(0);
  });

  it("uses one predicate — the duplicate copy is gone", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "forensicBreakdownToFlags.ts"), "utf8");
    // A second local copy is how the two drifted; it must import the shared one.
    expect(src).not.toMatch(/function\s+severityFromStatus/);
    expect(src).toMatch(/forensicSeverityFromStatus/);
  });
});
