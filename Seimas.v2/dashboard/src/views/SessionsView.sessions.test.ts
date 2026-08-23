import { describe, it, expect } from "vitest";
import { sessionIdForDate, periodLabel, UNKNOWN_SESSION_ID } from "./SessionsView";
import type { SeimasSession } from "../services/api";

// The real term-10 boundaries, as p2b.ad_seimo_sesijos returned them on
// 2026-08-23. Two sessions carry no end date.
const S: SeimasSession[] = [
  { id: 145, number: 62, name: "5 eilinė", date_from: "2026-09-10", date_to: null, status: "upcoming" },
  { id: 146, number: 61, name: "neeilinė", date_from: "2026-08-25", date_to: null, status: "upcoming" },
  { id: 144, number: 60, name: "4 eilinė", date_from: "2026-03-10", date_to: "2026-07-14", status: "ended" },
  { id: 141, number: 59, name: "3 eilinė", date_from: "2025-09-10", date_to: "2025-12-23", status: "ended" },
];

describe("which session a sitting date belongs to", () => {
  it("places a date inside a closed session", () => {
    expect(sessionIdForDate(S, "2026-07-14")).toBe(144);
    expect(sessionIdForDate(S, "2025-10-14")).toBe(141);
  });

  it("does not extend a closed session past its end date", () => {
    // The defect this replaces: session 144 was given an end date of
    // 2099-12-31, so 128 votes after 2026-06-30 were shown under a spring
    // session that LRS had already closed on 2026-07-14.
    expect(sessionIdForDate(S, "2026-07-15")).toBe(UNKNOWN_SESSION_ID);
    expect(sessionIdForDate(S, "2026-08-20")).toBe(UNKNOWN_SESSION_ID);
  });

  it("does not place a date in a session that has not opened yet", () => {
    expect(sessionIdForDate(S, "2026-08-24")).toBe(UNKNOWN_SESSION_ID);
    expect(sessionIdForDate(S, "2026-08-25")).toBe(146);
  });

  it("prefers the latest session that has begun when open sessions overlap", () => {
    // 146 has no end date, so a naive match would keep claiming dates well
    // past the opening of 145. The later start wins.
    expect(sessionIdForDate(S, "2026-09-01")).toBe(146);
    expect(sessionIdForDate(S, "2026-09-10")).toBe(145);
    expect(sessionIdForDate(S, "2026-11-01")).toBe(145);
  });

  it("returns unknown rather than the nearest guess for a gap date", () => {
    expect(sessionIdForDate(S, "2026-01-15")).toBe(UNKNOWN_SESSION_ID);
    expect(sessionIdForDate([], "2026-07-14")).toBe(UNKNOWN_SESSION_ID);
  });
});

describe("period label", () => {
  it("never prints a far-future end date", () => {
    for (const s of S) expect(periodLabel(s)).not.toMatch(/2099|9999/);
  });

  it("says a closed session is closed", () => {
    expect(periodLabel(S[2])).toBe("2026-03-10 → 2026-07-14");
  });

  it("marks an open session as ongoing rather than inventing an end", () => {
    const open = { ...S[1], status: "sitting" as const };
    expect(periodLabel(open)).toBe("2026-08-25 → vyksta");
  });

  it("shows an upcoming session as starting, not running", () => {
    expect(periodLabel(S[0])).toBe("nuo 2026-09-10");
  });
});
