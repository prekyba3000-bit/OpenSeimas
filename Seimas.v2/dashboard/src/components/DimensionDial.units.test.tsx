import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DimensionDial, POINTS_OF_100_LT } from "./DimensionDial";

/**
 * Evaluation CORF-03: every dial printed „%". Attendance and faction agreement
 * are shares; the other three are points against the chamber's highest value,
 * and „50.0 %" for the top speaker read as half a measure of something.
 */
describe("dimension dial units", () => {
  it.each(["attendance", "partyLoyalty"] as const)("prints %s as a percentage", (dim) => {
    render(<DimensionDial dimension={dim} value={72.04} />);
    expect(screen.getByText(/%/)).toBeInTheDocument();
    expect(screen.queryByText(POINTS_OF_100_LT)).toBeNull();
  });

  it.each(["experience", "legislativeActivity", "visibility"] as const)(
    "prints %s as points of 100, not a percentage",
    (dim) => {
      const { container } = render(<DimensionDial dimension={dim} value={50} />);
      const figure = container.querySelector("p.text-3xl")!;
      expect(figure.textContent).toContain(POINTS_OF_100_LT);
      expect(figure.textContent).not.toContain("%");
    },
  );
});
