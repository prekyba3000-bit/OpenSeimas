import { describe, expect, it } from "vitest";
import { activityLine } from "./activityLine";

const ctx = "Atmintinų dienų įstatymo Nr. VIII-397 1 straipsnio pakeitimo…";

describe("activityLine", () => {
  it("composes the sentence in Lithuanian from the structured choice", () => {
    expect(activityLine({ vote_choice: "Susilaikė", action: "", context: ctx }))
      .toBe(`Susilaikė dėl „${ctx}“`);
  });

  it("never emits the English verb the API used to send", () => {
    const line = activityLine({ vote_choice: "Prieš", action: "Voted Prieš", context: ctx });
    expect(line).not.toMatch(/voted/i);
    expect(line).toBe(`Prieš dėl „${ctx}“`);
  });

  it("strips the English verb from a legacy payload", () => {
    // A client running against an older API must not print "Voted Susilaikė".
    const line = activityLine({ action: "Voted Susilaikė", context: ctx } as never);
    expect(line).not.toMatch(/voted/i);
    expect(line).toBe(`Susilaikė dėl „${ctx}“`);
  });

  it("degrades to the context alone rather than an empty line", () => {
    expect(activityLine({ action: "", context: ctx } as never)).toBe(ctx);
  });
});
