import { describe, expect, it } from "vitest";
import { formatLtDateLong, formatLtDateShort, formatLtDateTime, formatLtFreshness } from "./ltDate";

describe("formatLtDateLong", () => {
  it("renders the civic long form", () => {
    expect(formatLtDateLong("2026-07-14")).toBe("2026 m. liepos 14 d.");
  });

  it("uses the genitive month name, which is what a date takes in Lithuanian", () => {
    // Nominative would be "liepa"; a date says "liepos".
    expect(formatLtDateLong("2026-07-01")).toContain("liepos");
    expect(formatLtDateLong("2026-05-09")).toContain("gegužės");
    expect(formatLtDateLong("2026-12-31")).toBe("2026 m. gruodžio 31 d.");
    expect(formatLtDateLong("2026-01-01")).toBe("2026 m. sausio 1 d.");
  });

  it("returns null rather than printing Invalid Date", () => {
    expect(formatLtDateLong(null)).toBeNull();
    expect(formatLtDateLong("")).toBeNull();
    expect(formatLtDateLong("liepos 14")).toBeNull();
  });
});

describe("formatLtDateShort", () => {
  it("drops the year", () => {
    expect(formatLtDateShort("2026-07-14")).toBe("liepos 14 d.");
  });
});

describe("formatLtDateTime", () => {
  it("zero-pads for column alignment", () => {
    expect(formatLtDateTime("2026-07-04T03:07:00")).toBe("2026-07-04 03:07");
  });
});

describe("formatLtFreshness", () => {
  const now = new Date("2026-08-19T12:00:00");

  it("says šiandien for today", () => {
    expect(formatLtFreshness("2026-08-19T03:12:00", now)).toBe("šiandien, 03:12");
  });

  it("says vakar for yesterday", () => {
    expect(formatLtFreshness("2026-08-18T22:40:00", now)).toBe("vakar, 22:40");
  });

  it("falls back to the full date when older", () => {
    expect(formatLtFreshness("2026-07-14T14:23:00", now)).toBe("2026 m. liepos 14 d.");
  });

  it("handles a month boundary without claiming vakar", () => {
    const firstOfMonth = new Date("2026-09-01T09:00:00");
    expect(formatLtFreshness("2026-08-31T23:50:00", firstOfMonth)).toBe("vakar, 23:50");
    expect(formatLtFreshness("2026-08-30T23:50:00", firstOfMonth)).toBe("2026 m. rugpjūčio 30 d.");
  });
});
