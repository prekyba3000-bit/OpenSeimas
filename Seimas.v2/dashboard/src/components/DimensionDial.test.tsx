import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DimensionDial } from "./DimensionDial";
import { AttendanceTrajectoryStrip } from "./AttendanceTrajectory";
import type { AttendanceTrajectory } from "../services/api";

/** §3.2 and §3.4. */
describe("a dial states its own denominator", () => {
  it("renders the value with its coverage note", () => {
    render(
      <DimensionDial dimension="attendance" value={71.0} coverage="iš 93 posėdžių dienų" />,
    );
    expect(screen.getByText(/71\.0/)).toBeInTheDocument();
    expect(screen.getByText("iš 93 posėdžių dienų")).toBeInTheDocument();
  });

  it("renders the unknown state, never 0.0, for a suppressed dimension", () => {
    render(<DimensionDial dimension="legislativeActivity" value={null} />);
    expect(screen.getByText(/bus rodomas, kai bus įkelti/i)).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  it("offers the how-it-is-calculated drawer on every dial", () => {
    for (const dim of ["attendance", "partyLoyalty", "experience"] as const) {
      const { unmount } = render(<DimensionDial dimension={dim} value={50} />);
      expect(screen.getByRole("button", { name: /Kaip skaičiuojama/ })).toBeInTheDocument();
      unmount();
    }
  });
});

describe("the trajectory strip renders gaps as gaps", () => {
  const strip = (buckets: AttendanceTrajectory["buckets"]) =>
    render(
      <AttendanceTrajectoryStrip
        data={{
          mp_id: "x",
          unit: "month",
          min_eligible_days: 3,
          mandate_start_date: "2024-11-14",
          mandate_end_date: null,
          buckets,
        }}
      />,
    );

  it("distinguishes a recess from thin data from a real value", () => {
    strip([
      { period: "2024-11", eligible_days: 6, days_present: 5, attendance: 83.33 },
      { period: "2024-12", eligible_days: 0, days_present: 0, attendance: null },
      { period: "2025-01", eligible_days: 2, days_present: 1, attendance: null },
    ]);
    // Three different facts, three different renderings — none of them a
    // zero-height bar, which would say the member missed everything.
    expect(screen.getByText(/Seimas neposėdžiavo/)).toBeInTheDocument();
    expect(screen.getByText(/per mažai duomenų/)).toBeInTheDocument();
    expect(screen.getByText(/83\.3 procento/)).toBeInTheDocument();
  });

  it("renders nothing rather than a flat line when no month is publishable", () => {
    const { container } = strip([
      { period: "2024-11", eligible_days: 0, days_present: 0, attendance: null },
    ]);
    expect(container).toBeEmptyDOMElement();
  });
});
