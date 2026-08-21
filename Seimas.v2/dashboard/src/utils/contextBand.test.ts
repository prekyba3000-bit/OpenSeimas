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

/** §3.5: the band must use the same denominators as the dial beside it. */
describe("band and dial cannot drift apart", () => {
  it("bandFromProfiles reads through readMpDimension, not a parallel path", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "contextBand.ts"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    // If the band ever computed its own value the two could disagree about the
    // same member on the same screen.
    expect(code).toMatch(/readMpDimension\(profile, dim\)/);
    expect(code).toMatch(/readMpDimension\(p, dim\)/);
    expect(code).not.toMatch(/attributes\.|dimensions\./);
  });

  it("uses identical inputs for the member and the population", async () => {
    const { bandFromProfiles } = await import("./contextBand");
    const mk = (v: number | null) =>
      ({ metrics: { attendance_percentage: v } }) as never;
    const peers = Array.from({ length: 20 }, (_, i) => mk(i * 5));
    const band = bandFromProfiles("attendance", mk(50), peers);
    // 10 peers are strictly below 50 (0,5,…,45) out of 20 comparable.
    expect(band).toEqual({ percentile: 50, population: 20 });
  });
});
