import { describe, expect, it } from "vitest";
import { getPartyMeta, getPartyShort } from "./partyColors";

describe("party labels", () => {
  it("uses the known short code for a mapped faction", () => {
    expect(getPartyShort("Lietuvos socialdemokratų partijos frakcija")).toBe("LSDP");
    expect(getPartyShort("Mišri Seimo narių grupė")).toBe("Mišri");
  });

  it("labels an unmapped party by its own name, never '?'", () => {
    // The seat-map legend surfaced five entries reading „?“ — a colour with no
    // label, which is the one thing the legend exists to prevent.
    const meta = getPartyMeta("Išsikėlė pats");
    expect(meta.short).toBe("Išsikėlė pats");
    expect(meta.short).not.toBe("?");
  });

  it("does not silently fold a spelling variant into the faction it resembles", () => {
    // „Lietuvos socialdemokratų partija" is not „…partijos frakcija". Party
    // and faction membership are different things, and merging them in the UI
    // would assert a seat count the data does not support.
    expect(getPartyShort("Lietuvos socialdemokratų partija")).not.toBe("LSDP");
  });

  it("strips Lithuanian quotes and truncates long names for a legend row", () => {
    expect(getPartyShort("Politinė partija „Nemuno Aušra“")).toBe("Politinė partija Nemuno Auš…");
  });

  it("falls back for a missing party rather than throwing", () => {
    expect(getPartyShort(null)).toBe("Nenurodyta");
    expect(getPartyShort(undefined)).toBe("Nenurodyta");
    expect(getPartyShort("Unknown")).toBe("Nenurodyta");
  });
});
