import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { trustApi } from "../services/trust";
import { SummaryHistoryView } from "./SummaryHistoryView";

vi.mock("../services/trust", async () => {
  const actual = await vi.importActual<typeof import("../services/trust")>("../services/trust");
  return { ...actual, trustApi: { ...actual.trustApi, getSummaryHistory: vi.fn() } };
});

function renderHistory() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SummaryHistoryView entityType="vote" entityId="v-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SummaryHistoryView", () => {

  it("explains the revision trail when nothing has been edited yet", async () => {
    vi.mocked(trustApi.getSummaryHistory).mockClear();
    vi.mocked(trustApi.getSummaryHistory).mockResolvedValue({
      entity_type: "vote",
      entity_id: "v-1",
      revisions: [],
    });
    renderHistory();

    expect(await screen.findByText(/kol kas redaguota nebuvo/i)).toBeInTheDocument();
    expect(screen.getByText(/kaip Vikipedijoje/i)).toBeInTheDocument();
  });

  it("lists revisions with editor and reason", async () => {
    vi.mocked(trustApi.getSummaryHistory).mockClear();
    vi.mocked(trustApi.getSummaryHistory).mockResolvedValue({
      entity_type: "vote",
      entity_id: "v-1",
      revisions: [
        {
          revision: 2,
          body_lt: "Patikslinta santrauka.",
          editor: "pipeline:tagger v1",
          note: "Pataisyta pagal pastabą",
          created_at: "2026-08-11T09:00:00Z",
        },
        {
          revision: 1,
          body_lt: "Pradinė santrauka.",
          editor: "pipeline:tagger v1",
          note: null,
          created_at: "2026-08-01T09:00:00Z",
        },
      ],
    });
    renderHistory();

    expect(await screen.findByText("Redakcija 2")).toBeInTheDocument();
    expect(screen.getByText("Redakcija 1")).toBeInTheDocument();
    expect(screen.getByText(/Pataisyta pagal pastabą/)).toBeInTheDocument();
    expect(screen.getByText("Patikslinta santrauka.")).toBeInTheDocument();
  });

  it("surfaces a Lithuanian error message when the request fails", async () => {
    vi.mocked(trustApi.getSummaryHistory).mockClear();
    vi.mocked(trustApi.getSummaryHistory).mockRejectedValue(new Error("network"));
    renderHistory();
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Nepavyko įkelti istorijos/i));
  });
});
