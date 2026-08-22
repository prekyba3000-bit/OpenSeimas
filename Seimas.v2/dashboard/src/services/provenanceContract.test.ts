import { describe, expect, it } from "vitest";
import { mpProfileSchema } from "./api";
import { readMpDimension } from "../utils/mpLegacyDimensions";

/**
 * The schema is part of the wire contract, and zod strips what it does not declare.
 *
 * The RPG rename moved four things: the backend payload, the backend response
 * model, the client's WIRE constant, and the client mapper. It missed a fifth —
 * this schema — which still declared STR/WIS/CHA/INT/STA. `z.object()` strips
 * unknown keys silently, so `metrics_provenance` arrived as `{}`, `hasSource()`
 * returned false, and the two provenance-gated dials rendered „no data" for
 * data the API had just sent.
 *
 * Exactly two of three failed, because `experience` is the one dimension not
 * gated on provenance. That asymmetry is what located the bug.
 *
 * These tests go through `mpProfileSchema.parse` deliberately. The existing
 * dimension tests build their fixture by hand and would have passed through
 * this defect unchanged — they were testing the layer below the broken one.
 */
const wire = {
  mp: { id: "x", name: "Test", party: "P", photo: "", active: true, seimas_id: 1 },
  dimensions: { legislative_activity: 10.21, experience: 12.37, visibility: 4.58 },
  metrics: { attendance_percentage: 71, party_loyalty: 77 },
  metrics_provenance: {
    legislative_activity: "direct",
    experience: "direct",
    visibility: "direct",
  },
  forensic_breakdown: {
    benford: { status: "clean", penalty: 0, explanation: "" },
    chrono: { status: "clean", penalty: 0, explanation: "" },
    vote_geometry: { status: "clean", penalty: 0, explanation: "" },
    phantom_network: { status: "clean", penalty: 0, explanation: "" },
    loyalty_bonus: { status: "clean", bonus: 0, explanation: "", independent_voting_days_pct: 0 },
    total_forensic_adjustment: 0,
  },
};

describe("metrics_provenance survives the schema", () => {
  it("keeps every key the API sends", () => {
    const parsed = mpProfileSchema.parse(wire);
    expect(parsed.metrics_provenance).toEqual({
      legislative_activity: "direct",
      experience: "direct",
      visibility: "direct",
    });
  });

  it("does not silently strip provenance to an empty object", () => {
    // The exact failure: `{}` reads as "no source for anything", which is
    // indistinguishable from a member whose ingests have genuinely not run.
    const parsed = mpProfileSchema.parse(wire);
    expect(Object.keys(parsed.metrics_provenance ?? {})).toHaveLength(3);
  });

  it("renders the two provenance-gated dials after a real parse", () => {
    const profile = mpProfileSchema.parse(wire) as never;
    expect(readMpDimension(profile, "legislativeActivity")).toBe(10.21);
    expect(readMpDimension(profile, "visibility")).toBe(4.58);
    // The ungated one worked throughout — which is why only two dials broke.
    expect(readMpDimension(profile, "experience")).toBe(12.37);
  });

  it("still hides a dimension the backend reports as unavailable", () => {
    // The fix must not turn the gate off, only let the keys through.
    const parsed = mpProfileSchema.parse({
      ...wire,
      metrics_provenance: { ...wire.metrics_provenance, visibility: "unavailable" },
    }) as never;
    expect(readMpDimension(parsed, "visibility")).toBeNull();
    expect(readMpDimension(parsed, "legislativeActivity")).toBe(10.21);
  });
});
