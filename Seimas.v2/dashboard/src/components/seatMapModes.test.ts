import { describe, expect, it } from "vitest";
import {
  factionEncoding,
  voteEncoding,
  presenceEncoding,
  hasRecordedChoices,
} from "./seatMapModes";
import type { MpSummary, VoteDetail } from "../services/api";

const mp = (id: string, party: string): MpSummary =>
  ({ id, name: id, party, vote_count: 0, attendance: 0 }) as unknown as MpSummary;

const mps = [
  mp("a", "Lietuvos socialdemokratų partijos frakcija"),
  mp("b", "Lietuvos socialdemokratų partijos frakcija"),
  mp("c", "Tėvynės sąjungos-Lietuvos krikščionių demokratų frakcija"),
];
const seated = mps.map((m) => m.id);

const vote = (choices: Record<string, string | null>): VoteDetail =>
  ({
    id: "1",
    title: "Testinis balsavimas",
    votes: Object.entries(choices).map(([mp_id, choice]) => ({
      mp_id,
      name: mp_id,
      party: "",
      choice,
    })),
  }) as unknown as VoteDetail;

describe("seat map encodings", () => {
  it("every mode states what its colours mean", () => {
    // The rule: no naked colour without a text label. A caption is the panel's
    // half of that; the legend is the other half.
    for (const enc of [
      factionEncoding(mps),
      voteEncoding(vote({ a: "Už" }), seated),
      presenceEncoding(["a"], seated),
    ]) {
      expect(enc.caption.length).toBeGreaterThan(0);
      expect(enc.legend.length).toBeGreaterThan(0);
      for (const entry of enc.legend) expect(entry.label).toBeTruthy();
    }
  });

  it("counts factions", () => {
    const legend = factionEncoding(mps).legend;
    expect(legend[0]).toMatchObject({ label: "LSDP", count: 2 });
    expect(legend[1]).toMatchObject({ label: "TS-LKD", count: 1 });
  });

  it("treats a missing choice as absence, never as a vote against", () => {
    // The source records choices, not absences. A member with no row did not
    // vote „Prieš“ — inferring one would fabricate a position.
    const enc = voteEncoding(vote({ a: "Už", b: "Prieš" }), seated);
    const absent = enc.legend.find((e) => e.key === "nedalyvavo");
    expect(absent).toMatchObject({ label: "Nedalyvavo", count: 1 });
    expect(enc.colorFor(mps[2])).toBe("transparent");
  });

  it("a null choice counts as absence too", () => {
    const enc = voteEncoding(vote({ a: "Už", b: null, c: null }), seated);
    expect(enc.legend.find((e) => e.key === "nedalyvavo")?.count).toBe(2);
  });

  it("omits vote categories nobody chose rather than showing them at zero", () => {
    const enc = voteEncoding(vote({ a: "Už", b: "Už", c: "Už" }), seated);
    expect(enc.legend.map((e) => e.key)).toEqual(["Už"]);
  });

  it("the vote legend doubles as the tally", () => {
    const enc = voteEncoding(vote({ a: "Už", b: "Prieš", c: "Susilaikė" }), seated);
    expect(enc.legend.map((e) => `${e.label} ${e.count}`)).toEqual([
      "Už 1",
      "Prieš 1",
      "Susilaikė 1",
    ]);
  });

  it("derives absence from presence, never the other way round", () => {
    const enc = presenceEncoding(["a", "b"], seated);
    expect(enc.legend).toEqual([
      expect.objectContaining({ label: "Dalyvavo", count: 2 }),
      expect.objectContaining({ label: "Nedalyvavo", count: 1 }),
    ]);
  });

  it("survives a vote payload with no mp_id at all", () => {
    // Older cached responses predate the field; the map must degrade to
    // "nobody matched" rather than throw.
    const legacy = {
      id: "1",
      title: "x",
      votes: [{ name: "a", party: "", choice: "Už" }],
    } as unknown as VoteDetail;
    const enc = voteEncoding(legacy, seated);
    expect(enc.legend.find((e) => e.key === "nedalyvavo")?.count).toBe(3);
  });

  it("recognises a vote the source published no results for", () => {
    // 1,656 of 5,286 votes are like this: the source publishes no per-member
    // results and gives no reason. Colouring the chamber from one would paint
    // 140 seats „Nedalyvavo“ — asserting the whole Seimas skipped a vote.
    expect(hasRecordedChoices(vote({ a: null, b: null, c: null }))).toBe(false);
    expect(hasRecordedChoices(null)).toBe(false);
    expect(hasRecordedChoices({ id: "1", title: "x", votes: [] } as never)).toBe(false);
    expect(hasRecordedChoices(vote({ a: "Už", b: null }))).toBe(true);
  });

  it("never colours the chamber from a missing choices array", () => {
    // `missing` is not `unpublished`: no array means we do not have the data
    // and know nothing about whether the source does. Either way the seat map
    // must not paint from it — but only one of the two lets us say why.
    const noArray = { id: "1", title: "x" } as never;
    expect(hasRecordedChoices(noArray)).toBe(false);
    expect(hasRecordedChoices(null)).toBe(false);

    const enc = voteEncoding(noArray, seated);
    expect(enc.legend.find((e) => e.key === "nedalyvavo")?.count).toBe(seated.length);
    for (const id of seated) {
      expect(enc.colorFor(mps.find((m) => m.id === id)!)).toBe("transparent");
    }
  });
});
