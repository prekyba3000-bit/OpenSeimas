import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LastSittingDayStrip } from "./LastSittingDayStrip";
import type { LastSittingDay } from "../services/api";

const base: LastSittingDay = {
  sitting_date: "2026-07-14",
  vote_count: 61,
  mps_present: 127,
  mps_present_ids: [],
  days_since: 3,
  is_recess: false,
  outcomes: null,
};

describe("LastSittingDayStrip", () => {
  it("states the facts it has, in Lithuanian", () => {
    render(<LastSittingDayStrip data={base} />);
    expect(screen.getByText("2026 m. liepos 14 d.")).toBeInTheDocument();
    expect(screen.getByText(/61 balsavimas · 127 dalyvavo/)).toBeInTheDocument();
  });

  it("says nothing about outcomes when the source publishes none", () => {
    // The whole reason the endpoint returns null instead of zeroes: „0
    // priimta“ asserts that nothing passed, which no source said.
    render(<LastSittingDayStrip data={base} />);
    for (const word of ["priimta", "atmesta", "Nepriimta", "0 "]) {
      expect(screen.queryByText(new RegExp(word))).not.toBeInTheDocument();
    }
  });

  it("reports outcomes once the source provides them", () => {
    render(<LastSittingDayStrip data={{ ...base, outcomes: { decided: 7 } }} />);
    expect(screen.getByText(/7 su paskelbtu rezultatu/)).toBeInTheDocument();
  });

  it("shows a recess note that does not predict the return date", () => {
    render(<LastSittingDayStrip data={{ ...base, is_recess: true, days_since: 37 }} />);
    expect(screen.getByText(/prieš 37 dienas/)).toBeInTheDocument();
    // No claim about when sittings resume — that is a fact about the future
    // that no source in this project carries.
    expect(screen.queryByText(/rugsėj/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/grįš/i)).not.toBeInTheDocument();
  });

  it("renders nothing rather than an empty strip when there is no sitting day", () => {
    const { container } = render(
      <LastSittingDayStrip data={{ ...base, sitting_date: null, days_since: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("agrees with Lithuanian numerals", () => {
    const cases: Array<[number, string]> = [
      [1, "1 balsavimas"],
      [3, "3 balsavimai"],
      [10, "10 balsavimų"],
      [11, "11 balsavimų"],
      [21, "21 balsavimas"],
      [25, "25 balsavimai"],
    ];
    for (const [n, expected] of cases) {
      const { unmount } = render(<LastSittingDayStrip data={{ ...base, vote_count: n }} />);
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
      unmount();
    }
  });
});
