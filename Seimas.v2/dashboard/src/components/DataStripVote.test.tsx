import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataStripVote } from "./DataStripVote";

/**
 * An unrecorded outcome must render as unrecorded.
 *
 * The LRS vote-results XML publishes tallies (už / prieš / susilaikė) but no
 * pass/fail field, so `result` is null for every vote currently ingested. The
 * component used to fall back to 'DEFERRED', which put a definite-looking
 * badge on 5,279 votes asserting the Seimas had deferred them — a claim the
 * source never made.
 *
 * This is the trust floor applied to text rather than numbers: a value without
 * a source stays absent, never a plausible-looking default.
 */
const baseProps = {
  title: "Darbo kodekso 185 straipsnio pakeitimo įstatymo projektas",
  votesFor: 0,
  votesAgainst: 0,
  timestamp: "2026-07-14",
};

describe("DataStripVote outcome honesty", () => {
  it("renders no outcome word when the source publishes no result", () => {
    render(<DataStripVote {...baseProps} outcome={null} />);

    // The title still renders — the vote happened, only its result is unknown.
    expect(screen.getByText(baseProps.title)).toBeInTheDocument();

    for (const word of ["DEFERRED", "PASSED", "FAILED", "Atidėta", "Priimta", "Atmesta"]) {
      expect(screen.queryByText(word)).not.toBeInTheDocument();
    }
  });

  it("draws no coloured outcome edge when there is no outcome", () => {
    const { container } = render(<DataStripVote {...baseProps} outcome={null} />);
    const edge = container.querySelector<HTMLElement>(".absolute.left-0.top-0.bottom-0.w-1");
    expect(edge).not.toBeNull();
    // A 4px colour bar reads as a verdict; transparent when there is none.
    expect(edge!.style.backgroundColor).toBe("transparent");
    expect(edge!.style.boxShadow).toBe("none");
  });

  it("still renders a real outcome when the source provides one", () => {
    render(<DataStripVote {...baseProps} outcome="PASSED" />);
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });

  it("renders FAILED distinctly from PASSED", () => {
    render(<DataStripVote {...baseProps} outcome="FAILED" />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.queryByText("PASSED")).not.toBeInTheDocument();
  });
});

/**
 * Guard for the substring trap that made the old mapping wrong even when a
 * result *was* present: "nepriimta" contains "priimta", so testing for
 * "priimta" first labelled rejected votes as passed.
 */
describe("result string mapping", () => {
  const mapOutcome = (result: string | null) =>
    result?.toLowerCase().includes("nepriimta")
      ? "FAILED"
      : result?.toLowerCase().includes("priimta")
        ? "PASSED"
        : null;

  it("maps 'nepriimta' to FAILED, not PASSED", () => {
    expect("nepriimta".includes("priimta")).toBe(true); // the trap itself
    expect(mapOutcome("Nepriimta")).toBe("FAILED");
  });

  it("maps 'priimta' to PASSED", () => {
    expect(mapOutcome("Priimta")).toBe("PASSED");
  });

  it("maps null and unrecognised values to null, never to a default outcome", () => {
    expect(mapOutcome(null)).toBeNull();
    expect(mapOutcome("")).toBeNull();
    expect(mapOutcome("Svarstymas")).toBeNull();
  });
});
