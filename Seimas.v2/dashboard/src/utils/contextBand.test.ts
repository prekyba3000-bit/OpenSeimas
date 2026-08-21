import { describe, expect, it } from "vitest";
import { contextBand, contextBandLabel } from "./contextBand";

const peers = (n: number, from = 0) => Array.from({ length: n }, (_, i) => from + i);

describe("context bands, not ranks", () => {
  it("situates a member without producing a first or last place", () => {
    const band = contextBand(50, peers(100));
    expect(band).toEqual({ percentile: 50, population: 100 });
    expect(contextBandLabel("attendance", band!)).toBe(
      "Dalyvauja dažniau nei 50 % kolegų (iš 100)",
    );
  });

  it("excludes members with no figure from the population, not just the result", () => {
    // Counting them as zero would inflate everyone else's percentile using
    // people nobody has data for.
    const withNulls = [...peers(20), null, null, null];
    expect(contextBand(10, withNulls)!.population).toBe(20);
  });

  it("returns null for a member with no figure", () => {
    expect(contextBand(null, peers(100))).toBeNull();
  });

  it("refuses to band against a handful of colleagues", () => {
    // A band from nine people says more about the gaps in the data than about
    // the member.
    expect(contextBand(5, peers(9))).toBeNull();
    expect(contextBand(5, peers(10))).not.toBeNull();
  });
});
