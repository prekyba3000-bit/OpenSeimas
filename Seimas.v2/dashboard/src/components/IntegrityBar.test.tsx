import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntegrityBar } from "./IntegrityBar";
import { DIMENSION_UNAVAILABLE_LT } from "../utils/mpLegacyDimensions";

describe("IntegrityBar", () => {
  it("shows the unavailable note and no number when the metric is hidden (null)", () => {
    render(<IntegrityBar score={null} />);
    expect(screen.getByText("Skaidrumo indeksas")).toBeInTheDocument();
    expect(screen.getByText(DIMENSION_UNAVAILABLE_LT)).toBeInTheDocument();
    // The whole point of the fix: no baseline number leaks here.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\.\d/)).not.toBeInTheDocument();
  });

  it("never renders the baseline 100 that the grid suppresses", () => {
    // finalIntegrityScore is 100 for everyone while the forensic tables are
    // empty; passing null (as readMpDimension returns) must not show it.
    render(<IntegrityBar score={null} />);
    expect(screen.queryByText("100.0")).not.toBeInTheDocument();
    expect(screen.queryByText("100")).not.toBeInTheDocument();
  });

  it("renders the value and a progress bar when a real source backs it", () => {
    render(<IntegrityBar score={72.4} />);
    expect(screen.getByText("72.4")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "72");
  });

  it("clamps out-of-range values without inventing data", () => {
    render(<IntegrityBar score={140} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
