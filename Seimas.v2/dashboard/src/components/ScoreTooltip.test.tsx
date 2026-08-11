import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { MpProfile } from "../services/api";
import { ScoreTooltip } from "./ScoreTooltip";

/**
 * Guards the 2026-08-12 relabel: displayed numbers must come from `metrics`
 * (source-backed), never from the `attributes` composites, several of which
 * read from tables that are still empty.
 */
function profile(overrides: Partial<MpProfile> = {}): MpProfile {
  return {
    mp: { id: "mp-1", name: "Testas Testauskas" },
    forensicBreakdown: {} as MpProfile["forensicBreakdown"],
    evidence: [],
    level: 1,
    xp: 0,
    xp_current_level: 0,
    xp_next_level: 100,
    alignment: "neutral",
    // Deliberately contradicts metrics: attributes must not win.
    attributes: { STR: 0, WIS: 12.36, CHA: 0, INT: 100, STA: 56.78 },
    artifacts: [],
    metrics: { attendance_percentage: 70.97, party_loyalty: 77.27 },
    metrics_provenance: { STR: "unavailable", WIS: "direct", CHA: "unavailable", INT: "direct", STA: "proxy" },
    ...overrides,
  } as MpProfile;
}

function renderTooltip(p: MpProfile) {
  return render(
    <MemoryRouter>
      <ScoreTooltip profile={p} />
    </MemoryRouter>,
  );
}

/** The value rendered next to a label — pairing is what this relabel got wrong. */
function valueFor(label: string): string {
  const dt = screen.getByText(label);
  return dt.parentElement?.querySelector("dd")?.textContent?.trim() ?? "";
}

describe("ScoreTooltip", () => {
  it("renders attendance from metrics, not from the STA/STR composites", () => {
    renderTooltip(profile());

    expect(valueFor("Dalyvavimas")).toBe("71.0"); // metrics 70.97, not STA 56.78
    expect(screen.queryByText("56.8")).not.toBeInTheDocument(); // STA never shown
    expect(screen.queryByText("0.0")).not.toBeInTheDocument(); // STR / CHA never shown
  });

  it("uses the real party-loyalty metric rather than the seniority composite", () => {
    renderTooltip(profile());

    // 77.27 is metrics.party_loyalty; 12.36 is the WIS composite, which now
    // sits under its own honest label instead of masquerading as loyalty.
    expect(valueFor("Partijos lojalumas")).toBe("77.3");
    expect(valueFor("Patirtis ir aktyvumas")).toBe("12.4");
  });

  it("never prints the misspelled legacy label", () => {
    renderTooltip(profile());
    expect(document.body.textContent).not.toContain("Dalyvaumas");
  });

  it("shows the honest note instead of a number for un-ingested metrics", () => {
    renderTooltip(profile());

    // Integrity would otherwise render its no-data baseline of 100.0.
    expect(screen.getByText("Skaidrumo indeksas")).toBeInTheDocument();
    expect(screen.queryByText("100.0")).not.toBeInTheDocument();
    expect(screen.getAllByText(/bus rodomas, kai bus įkelti šaltinio duomenys/i).length).toBeGreaterThan(0);
  });

  it("falls back to the note when the metrics block is absent entirely", () => {
    renderTooltip(profile({ metrics: undefined }));

    expect(screen.queryByText("71.0")).not.toBeInTheDocument();
    expect(screen.getAllByText(/bus rodomas, kai bus įkelti šaltinio duomenys/i).length).toBeGreaterThan(0);
  });
});


describe("ScoreTooltip metric availability follows the backend", () => {
  it("resurrects a metric once the backend reports a source for it", () => {
    // What a backfill looks like: provenance flips off "unavailable" and the
    // number appears with no frontend change.
    renderTooltip(
      profile({
        attributes: { STR: 73.33, WIS: 22.9, CHA: 4.58, INT: 100, STA: 73.12 },
        metrics_provenance: { STR: "direct", WIS: "direct", CHA: "direct", INT: "direct", STA: "proxy" },
      }),
    );

    expect(valueFor("Teisėkūros aktyvumas")).toBe("73.3");
    expect(valueFor("Viešumas")).toBe("4.6");
  });

  it("keeps a metric hidden while the backend reports it unavailable", () => {
    renderTooltip(profile());
    expect(valueFor("Teisėkūros aktyvumas")).toMatch(/bus rodomas/i);
    expect(valueFor("Viešumas")).toMatch(/bus rodomas/i);
  });

  it("keeps integrity hidden even though the backend calls it direct", () => {
    // The engine returns a baseline 100 for everyone when the forensic tables
    // are empty, so provenance cannot tell a clean record from no data.
    renderTooltip(
      profile({
        metrics_provenance: { STR: "direct", WIS: "direct", CHA: "direct", INT: "direct", STA: "proxy" },
      }),
    );
    expect(valueFor("Skaidrumo indeksas")).toMatch(/bus rodomas/i);
  });
});
