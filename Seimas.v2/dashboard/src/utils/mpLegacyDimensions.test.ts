import { describe, expect, it } from "vitest";
import {
  CIVIC_DIMENSION_ORDER,
  CIVIC_DIMENSION_LABELS_LT,
  readMpDimension,
} from "./mpLegacyDimensions";
import { DIMENSION_EXPLAINERS } from "./dimensionExplainers";
import type { MpProfile } from "../services/api";

/**
 * Ported from the ScoreTooltip component test, which went with the component
 * when DimensionDial replaced it. The rules being asserted were never about
 * that component — they are about which numbers are publishable at all.
 */
const profile = (over: Partial<MpProfile> = {}): MpProfile =>
  ({
    mp: { id: "x", name: "Test", party: "P", photo: null, active: true, seimas_id: 1 },
    // Deliberately contradicts metrics: a chamber-relative dimension must not win.
    dimensions: { legislative_activity: 0, experience: 12.36, visibility: 0 },
    metrics: { attendance_percentage: 70.97, party_loyalty: 77.27 },
    metrics_provenance: {
      legislative_activity: "unavailable",
      experience: "direct",
      visibility: "unavailable",
    },
    ...over,
  }) as unknown as MpProfile;

describe("which dimensions exist", () => {
  it("is five, and none of them is a verdict", () => {
    expect(CIVIC_DIMENSION_ORDER).toEqual([
      "attendance",
      "partyLoyalty",
      "experience",
      "legislativeActivity",
      "visibility",
    ]);
    expect(CIVIC_DIMENSION_ORDER).not.toContain("integrity");
    expect(Object.keys(CIVIC_DIMENSION_LABELS_LT)).not.toContain("integrity");
  });

  it("gives every dimension an explainer that says what it does not measure", () => {
    // The half that stops a dial becoming a small verdict.
    for (const dim of CIVIC_DIMENSION_ORDER) {
      const e = DIMENSION_EXPLAINERS[dim];
      expect(e.formula.length).toBeGreaterThan(20);
      expect(e.denominator.length).toBeGreaterThan(5);
      expect(e.notMeasuring.length).toBeGreaterThan(20);
    }
  });

  it("says plainly that party loyalty is not a virtue", () => {
    expect(DIMENSION_EXPLAINERS.partyLoyalty.notMeasuring).toMatch(/nėra ištikimybės/i);
  });
});

describe("readMpDimension", () => {
  it("reads attendance and loyalty from metrics, not from a chamber-relative dimension", () => {
    const p = profile();
    expect(readMpDimension(p, "attendance")).toBe(70.97);
    expect(readMpDimension(p, "partyLoyalty")).toBe(77.27);
  });

  it("hides a dimension whose source is not populated", () => {
    const p = profile();
    expect(readMpDimension(p, "legislativeActivity")).toBeNull();
    expect(readMpDimension(p, "visibility")).toBeNull();
  });

  it("resurrects a dimension once the backend reports a source for it", () => {
    // What a backfill looks like: provenance flips off "unavailable" and the
    // dial reappears with no code change.
    const p = profile({
      dimensions: { legislative_activity: 73.33, experience: 22.9, visibility: 4.58 },
      metrics_provenance: {
        legislative_activity: "direct",
        experience: "direct",
        visibility: "direct",
      },
    } as Partial<MpProfile>);
    expect(readMpDimension(p, "legislativeActivity")).toBe(73.33);
    expect(readMpDimension(p, "visibility")).toBe(4.58);
  });

  it("returns null rather than zero when the metrics block is absent", () => {
    const p = profile({ metrics: undefined } as Partial<MpProfile>);
    expect(readMpDimension(p, "attendance")).toBeNull();
    expect(readMpDimension(p, "attendance")).not.toBe(0);
  });
});
