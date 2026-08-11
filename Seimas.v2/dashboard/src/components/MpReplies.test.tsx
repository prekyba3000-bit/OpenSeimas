import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { trustApi } from "../services/trust";
import { MpReplies } from "./MpReplies";

vi.mock("../services/trust", async () => {
  const actual = await vi.importActual<typeof import("../services/trust")>("../services/trust");
  return { ...actual, trustApi: { ...actual.trustApi, getMpReplies: vi.fn() } };
});

function renderReplies() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MpReplies mpId="mp-1" />
    </QueryClientProvider>,
  );
}

describe("MpReplies", () => {

  it("explains the right of reply when the MP has not used it", async () => {
    vi.mocked(trustApi.getMpReplies).mockClear();
    vi.mocked(trustApi.getMpReplies).mockResolvedValue({ politician_id: "mp-1", replies: [] });
    renderReplies();

    expect(await screen.findByText(/Kol kas atsakymo nepateikta/i)).toBeInTheDocument();
    expect(screen.getByText(/patvirtintas Seimo nario atsakymas/i)).toBeInTheDocument();
  });

  it("renders a reply with the verified badge", async () => {
    vi.mocked(trustApi.getMpReplies).mockClear();
    vi.mocked(trustApi.getMpReplies).mockResolvedValue({
      politician_id: "mp-1",
      replies: [
        {
          id: "r1",
          subject_type: "profile",
          subject_ref: null,
          body_lt: "Nesutinku su pateiktu vertinimu dėl šių priežasčių.",
          verified: true,
          created_at: "2026-08-11T09:00:00Z",
        },
      ],
    });
    renderReplies();

    expect(await screen.findByText("Patvirtintas atsakymas")).toBeInTheDocument();
    expect(screen.getByText(/Nesutinku su pateiktu vertinimu/)).toBeInTheDocument();
  });

  it("surfaces a Lithuanian error message when the request fails", async () => {
    vi.mocked(trustApi.getMpReplies).mockClear();
    vi.mocked(trustApi.getMpReplies).mockImplementation(() => Promise.reject(new Error("network")));
    renderReplies();
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Nepavyko įkelti atsakymo/i));
  });
});
