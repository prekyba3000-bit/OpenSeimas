import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { trustApi, type CorrectionsLogResponse } from "../services/trust";
import { CorrectionsLog } from "./CorrectionsLog";

vi.mock("../services/trust", async () => {
  const actual = await vi.importActual<typeof import("../services/trust")>("../services/trust");
  return { ...actual, trustApi: { ...actual.trustApi, listCorrections: vi.fn() } };
});

function renderLog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CorrectionsLog />
    </QueryClientProvider>,
  );
}

const response = (corrections: CorrectionsLogResponse["corrections"]): CorrectionsLogResponse => ({
  generated_at: "2026-08-11T09:00:00Z",
  count: corrections.length,
  corrections,
});

describe("CorrectionsLog", () => {

  it("invites a submission when the log is empty", async () => {
    vi.mocked(trustApi.listCorrections).mockClear();
    vi.mocked(trustApi.listCorrections).mockResolvedValue(response([]));
    renderLog();
    expect(await screen.findByText(/Kol kas pataisymų nėra/i)).toBeInTheDocument();
    expect(screen.getByText(/Užpildykite formą viršuje/i)).toBeInTheDocument();
  });

  it("renders entries with Lithuanian status badges and the resolution note", async () => {
    vi.mocked(trustApi.listCorrections).mockClear();
    vi.mocked(trustApi.listCorrections).mockResolvedValue(
      response([
        {
          id: "a",
          entity_type: "metric",
          entity_id: "attendance",
          description: "Lankomumo skaičius nesutampa.",
          status: "resolved",
          resolution_note: "Patikrinta, duomenys atnaujinti.",
          created_at: "2026-08-11T09:00:00Z",
          resolved_at: "2026-08-11T10:00:00Z",
        },
      ]),
    );
    renderLog();

    expect(await screen.findByText("Išspręsta")).toBeInTheDocument();
    expect(screen.getByText(/Lankomumo skaičius nesutampa/)).toBeInTheDocument();
    expect(screen.getByText(/Patikrinta, duomenys atnaujinti/)).toBeInTheDocument();
  });

  it("never renders a reporter email even if the API leaks one", async () => {
    vi.mocked(trustApi.listCorrections).mockClear();
    const leaked = {
      id: "b",
      entity_type: "mp",
      entity_id: "x",
      description: "Pastaba.",
      status: "open" as const,
      resolution_note: null,
      created_at: "2026-08-11T09:00:00Z",
      resolved_at: null,
      reporter_email: "pilietis@example.lt",
    };
    vi.mocked(trustApi.listCorrections).mockResolvedValue(
      response([leaked as unknown as CorrectionsLogResponse["corrections"][number]]),
    );
    renderLog();

    expect(await screen.findByText("Gauta")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("pilietis@example.lt");
  });

  it("surfaces a Lithuanian error message when the request fails", async () => {
    vi.mocked(trustApi.listCorrections).mockClear();
    vi.mocked(trustApi.listCorrections).mockRejectedValue(new Error("network"));
    renderLog();
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Nepavyko įkelti/i));
  });
});
