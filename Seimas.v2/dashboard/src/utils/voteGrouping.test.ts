import { describe, expect, it } from "vitest";
import { flattenVotes, splitTitle, outcomesVary } from "./voteGrouping";
import type { VoteSummary } from "../services/api";

const v = (id: string, date: string, title: string, result: string | null = null): VoteSummary =>
  ({ id, date, title, result }) as VoteSummary;

describe("splitTitle", () => {
  it("splits off the trailing identifier", () => {
    expect(splitTitle("Klausimų grupė (Nr. 2 - 6. 1, 2 - 6. 2)")).toEqual({
      base: "Klausimų grupė",
      suffix: "(Nr. 2 - 6. 1, 2 - 6. 2)",
    });
  });

  it("is not fooled by a nested bracket inside the identifier", () => {
    // A regex on the first " (Nr." splits „XVP-395(3)“ in the wrong place, and
    // the identifier is exactly what distinguishes two otherwise equal rows.
    expect(splitTitle("Pieno įstatymo projektas (Nr. XVP-395(3))")).toEqual({
      base: "Pieno įstatymo projektas",
      suffix: "(Nr. XVP-395(3))",
    });
  });

  it("leaves a title with no trailing identifier alone", () => {
    expect(splitTitle("Sprendimas dėl darbotvarkės")).toEqual({
      base: "Sprendimas dėl darbotvarkės",
      suffix: null,
    });
  });

  it("does not split a title that is only an identifier", () => {
    expect(splitTitle("(Nr. XVP-1)").suffix).toBeNull();
  });
});

describe("flattenVotes", () => {
  it("emits every vote exactly once, in the order given", () => {
    // The property that matters most: grouping is a presentation change, and
    // a vote that disappears from the list is a vote the public cannot see.
    const votes = [
      v("1", "2026-07-14", "Klausimų grupė (Nr. 1)"),
      v("2", "2026-07-14", "Klausimų grupė (Nr. 2)"),
      v("3", "2026-07-14", "Kitas projektas (Nr. XVP-9)"),
      v("4", "2026-07-10", "Dar vienas (Nr. XVP-8)"),
    ];
    const ids = flattenVotes(votes)
      .filter((i) => i.kind === "vote")
      .map((i) => (i as { vote: VoteSummary }).vote.id);
    expect(ids).toEqual(["1", "2", "3", "4"]);
  });

  it("puts a header on each date", () => {
    const items = flattenVotes([
      v("1", "2026-07-14", "A (Nr. 1)"),
      v("2", "2026-07-10", "B (Nr. 2)"),
    ]);
    const dates = items.filter((i) => i.kind === "date");
    expect(dates).toHaveLength(2);
    expect(dates[0]).toMatchObject({ date: "2026-07-14", count: 1 });
  });

  it("collapses a shared opening into one cluster header", () => {
    const items = flattenVotes([
      v("1", "2026-07-14", "Klausimų grupė (Nr. 1)"),
      v("2", "2026-07-14", "Klausimų grupė (Nr. 2)"),
      v("3", "2026-07-14", "Klausimų grupė (Nr. 3)"),
    ]);
    const clusters = items.filter((i) => i.kind === "cluster");
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ base: "Klausimų grupė", count: 3 });
  });

  it("shows the discriminating identifier in full on clustered rows", () => {
    const items = flattenVotes([
      v("1", "2026-07-14", "Klausimų grupė (Nr. 2 - 6. 1, 2 - 6. 2)"),
      v("2", "2026-07-14", "Klausimų grupė (Nr. 2 - 12. 1, 2 - 12. 2, 2 - 12. 3)"),
    ]);
    const rows = items.filter((i) => i.kind === "vote") as Array<{ base: string; suffix: string | null }>;
    expect(rows.map((r) => r.suffix)).toEqual([
      "(Nr. 2 - 6. 1, 2 - 6. 2)",
      "(Nr. 2 - 12. 1, 2 - 12. 2, 2 - 12. 3)",
    ]);
    expect(rows.map((r) => r.base)).toEqual(["", ""]);
  });

  it("hands the identifier out separately even on unclustered rows", () => {
    // The 2-line clamp on a long title was eating the identifier — the exact
    // thing the row exists to show. The clamp now only ever applies to `base`.
    const long =
      "Seimo nutarimo „Dėl Lietuvos Respublikos Seimo 2024 m. lapkričio 21 d. " +
      "nutarimo Nr. XV-19 pakeitimo“ projektas (Nr. XVP-1762)";
    const row = flattenVotes([v("1", "2026-07-14", long)]).find(
      (i) => i.kind === "vote",
    ) as { base: string; suffix: string | null; clustered: boolean };
    expect(row.suffix).toBe("(Nr. XVP-1762)");
    expect(row.base.endsWith("projektas")).toBe(true);
    expect(row.clustered).toBe(false);
  });

  it("does not cluster the same opening across different days", () => {
    const items = flattenVotes([
      v("1", "2026-07-14", "Klausimų grupė (Nr. 1)"),
      v("2", "2026-07-10", "Klausimų grupė (Nr. 2)"),
    ]);
    expect(items.filter((i) => i.kind === "cluster")).toHaveLength(0);
  });
});

describe("outcomesVary", () => {
  it("is false when every result is the same", () => {
    // Currently every result is null, so the list draws no badges — which is
    // also the honest rendering, since no outcome is known.
    expect(outcomesVary([v("1", "d", "t"), v("2", "d", "t")])).toBe(false);
    expect(outcomesVary([v("1", "d", "t", "Priimta"), v("2", "d", "t", "Priimta")])).toBe(false);
  });

  it("is true as soon as they differ", () => {
    expect(outcomesVary([v("1", "d", "t", "Priimta"), v("2", "d", "t", "Nepriimta")])).toBe(true);
    expect(outcomesVary([v("1", "d", "t", "Priimta"), v("2", "d", "t", null)])).toBe(true);
  });
});
