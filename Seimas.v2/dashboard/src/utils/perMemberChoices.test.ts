import { describe, expect, it } from "vitest";
import {
  perMemberChoiceState,
  hasAggregateTallies,
  NO_PER_MEMBER_DATA_LT,
  NO_CHOICE_RECORDED_LT,
} from "./perMemberChoices";

describe("perMemberChoiceState", () => {
  it("distinguishes a missing array from a present-but-empty one", () => {
    // The distinction that carries the weight. `unpublished` is a fact about
    // the source that we can state; `missing` means we do not have the data
    // and know nothing about whether the source does.
    expect(perMemberChoiceState(null)).toBe("missing");
    expect(perMemberChoiceState(undefined)).toBe("missing");
    expect(perMemberChoiceState([])).toBe("unpublished");
  });

  it("calls a full array of null choices unpublished, not present", () => {
    // The real shape: the API returns one row per member, every choice null.
    const rows = Array.from({ length: 140 }, () => ({ choice: null }));
    expect(perMemberChoiceState(rows)).toBe("unpublished");
  });

  it("treats an empty-string choice as no choice", () => {
    expect(perMemberChoiceState([{ choice: "" }, { choice: "" }])).toBe("unpublished");
  });

  it("is present as soon as one member has a choice", () => {
    const rows = [...Array.from({ length: 139 }, () => ({ choice: null })), { choice: "Už" }];
    expect(perMemberChoiceState(rows)).toBe("present");
  });
});

describe("hasAggregateTallies", () => {
  it("is false for the all-zero tallies of an unpublished vote", () => {
    expect(hasAggregateTallies({ Už: 0, Prieš: 0, Susilaikė: 0 })).toBe(false);
    expect(hasAggregateTallies({ null: 140 } as Record<string, number>)).toBe(false);
    expect(hasAggregateTallies(null)).toBe(false);
  });

  it("is true when any tally is populated", () => {
    expect(hasAggregateTallies({ Už: 89, Prieš: 0, Susilaikė: 0 })).toBe(true);
  });

  it("is independent of the per-member state", () => {
    // They are separate fields from separate parts of the source. Today they
    // always agree; the UI must not assume they always will.
    const rows = Array.from({ length: 140 }, () => ({ choice: null }));
    expect(perMemberChoiceState(rows)).toBe("unpublished");
    expect(hasAggregateTallies({ Už: 73, Prieš: 1, Susilaikė: 7 })).toBe(true);
  });
});

describe("the strings a citizen reads", () => {
  it("do not claim absence when the source simply said nothing", () => {
    // „Nedalyvavo" would assert the member was absent — a different claim, and
    // one nobody made.
    expect(NO_CHOICE_RECORDED_LT).not.toMatch(/Nedalyvavo/);
    expect(NO_PER_MEMBER_DATA_LT).toBe("Nėra duomenų apie pavienius balsus");
  });
});
