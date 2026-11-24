import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import MpProfileCard from "./MpProfileCard";
import type { MpProfile } from "../services/api";

/**
 * Evaluation CORF-04. The four forensic engines were deleted on 2026-11-14;
 * nothing had ever run them. Every profile still listed them under
 * „Skaidrumas · Ką rodo patikros" as „Duomenų nėra" rows — which reads as
 * checks run, or pending, on this person, among them a „hidden-connections
 * network".
 */
const unavailable = (engine: string, title: string) => ({
  engine, status: "unavailable", title, description: "table is unavailable", severity: "unknown",
});

const profile = {
  mp: { id: "a", name: "Agnė Bilotaitė", party: "TS-LKD", photo: "", active: true, seimas_id: "79143" },
  forensicBreakdown: {
    benford: unavailable("benford", "Benfordo dėsnio analizė"),
    chrono: unavailable("chrono", "Pataisų laiko analizė"),
    voteGeometry: unavailable("vote_geometry", "Balsavimo geometrija"),
    phantomNetwork: unavailable("phantom", "Paslėptų ryšių tinklas"),
  },
} as unknown as MpProfile;

describe("profile card", () => {
  it("presents no check that the platform does not run", () => {
    render(<MemoryRouter><MpProfileCard profile={profile} /></MemoryRouter>);
    for (const gone of [/Ką rodo patikros/, /Benfordo/, /Pataisų laiko/, /Balsavimo geometrija/, /Paslėptų ryšių/]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });

  it("still links the official Seimas profile", () => {
    render(<MemoryRouter><MpProfileCard profile={profile} /></MemoryRouter>);
    expect(screen.getByText(/Oficialus Seimo profilis/)).toBeInTheDocument();
  });
});
