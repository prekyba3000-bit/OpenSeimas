import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { trustApi } from "../services/trust";
import { CorrectionsAndRepliesPanel } from "./CorrectionsAndRepliesPanel";

vi.mock("../services/trust", async () => {
  const actual = await vi.importActual<typeof import("../services/trust")>("../services/trust");
  return { ...actual, trustApi: { ...actual.trustApi, listCorrections: vi.fn() } };
});

describe("CorrectionsAndRepliesPanel", () => {
  it("shows a rejected review decision without submission text or English status", async () => {
    vi.mocked(trustApi.listCorrections).mockResolvedValue({
      generated_at: "2026-11-24T09:00:00Z",
      count: 1,
      corrections: [
        {
          id: "rejected",
          entity_type: "mp",
          entity_id: "member-1",
          description: null,
          status: "rejected",
          resolution_note: "Peržiūrėta; teiginys nesutvirtintas.",
          created_at: "2026-11-24T09:00:00Z",
          resolved_at: "2026-11-24T10:00:00Z",
        },
      ],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CorrectionsAndRepliesPanel />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Peržiūrėta; teiginys nesutvirtintas/)).toBeInTheDocument();
    expect(screen.getByText(/Atmesta/)).toBeInTheDocument();
    expect(screen.queryByText(/rejected/)).not.toBeInTheDocument();
  });
});
