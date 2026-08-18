import { describe, expect, it } from "vitest";
import {
  SEIMAS_SEATS_TOTAL,
  isMandateActive,
  occupancyLabel,
  vacancyLabel,
  mandatePeriodLabel,
  servedNoDays,
} from "./mpCounts";

const SAME_DAY = "2024-11-14";
const today = new Date("2026-08-13T00:00:00Z");

const mp = (start: string | null, end: string | null, is_active = true) =>
  ({ mandate_start_date: start, mandate_end_date: end, is_active }) as never;

describe("isMandateActive", () => {
  it("counts a sitting member (no end date)", () => {
    expect(isMandateActive(mp(SAME_DAY, null), today)).toBe(true);
  });

  it("excludes the four who resigned the day they were sworn in", () => {
    // Veryga, Landsbergis, Blinkevičiūtė, Sinkevičius — real mandates, zero
    // days served. The sharpest case for "technically true, deeply misleading".
    expect(isMandateActive(mp(SAME_DAY, SAME_DAY), today)).toBe(false);
  });

  it("excludes a member replaced mid-term", () => {
    expect(isMandateActive(mp(SAME_DAY, "2026-05-28"), today)).toBe(false);
  });

  it("still counts a mandate ending today", () => {
    expect(isMandateActive(mp(SAME_DAY, "2026-08-13"), today)).toBe(true);
  });

  it("stops counting the day after the mandate ends", () => {
    expect(isMandateActive(mp(SAME_DAY, "2026-08-12"), today)).toBe(false);
  });

  it("excludes a mandate that has not started yet", () => {
    expect(isMandateActive(mp("2026-09-01", null), today)).toBe(false);
  });

  it("falls back to the is_active flag when dates are absent", () => {
    // Older cached payloads predate the mandate fields.
    expect(isMandateActive(mp(null, null, true), today)).toBe(true);
    expect(isMandateActive(mp(null, null, false), today)).toBe(false);
  });
});

describe("occupancyLabel", () => {
  it("states occupancy against the constitutional size", () => {
    expect(occupancyLabel({ mps_active: 140, seats_total: 141 })).toBe("140 iš 141 vietų");
  });
});

describe("vacancyLabel", () => {
  it("is silent when the chamber is full", () => {
    expect(vacancyLabel(0)).toBeNull();
    expect(vacancyLabel(-3)).toBeNull();
  });

  it("agrees in Lithuanian for 1, 2-9, 11-19 and multiples of ten", () => {
    expect(vacancyLabel(1)).toBe("1 laisva vieta");
    expect(vacancyLabel(2)).toBe("2 laisvos vietos");
    expect(vacancyLabel(9)).toBe("9 laisvos vietos");
    expect(vacancyLabel(11)).toBe("11 laisvų vietų");
    expect(vacancyLabel(19)).toBe("19 laisvų vietų");
    expect(vacancyLabel(10)).toBe("10 laisvų vietų");
    expect(vacancyLabel(21)).toBe("21 laisva vieta");
  });
});

describe("mandatePeriodLabel", () => {
  it("shows the served period for a former member", () => {
    expect(mandatePeriodLabel(mp(SAME_DAY, "2026-05-28"))).toBe(
      "Mandatas: 2024-11-14 – 2026-05-28",
    );
  });

  it("leaves the end open while still serving", () => {
    expect(mandatePeriodLabel(mp(SAME_DAY, null))).toBe("Mandatas: 2024-11-14 – …");
  });

  it("returns null when there is nothing to state", () => {
    expect(mandatePeriodLabel(mp(null, null))).toBeNull();
  });
});

describe("servedNoDays", () => {
  it("identifies a same-day mandate", () => {
    expect(servedNoDays(mp(SAME_DAY, SAME_DAY))).toBe(true);
  });

  it("is false for anyone who actually served", () => {
    expect(servedNoDays(mp(SAME_DAY, "2026-05-28"))).toBe(false);
    expect(servedNoDays(mp(SAME_DAY, null))).toBe(false);
  });
});

describe("SEIMAS_SEATS_TOTAL", () => {
  it("is the constitutional 141", () => {
    expect(SEIMAS_SEATS_TOTAL).toBe(141);
  });
});
