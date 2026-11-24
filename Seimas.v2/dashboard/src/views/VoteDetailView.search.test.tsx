import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { VoteDetail } from "../services/api";
import VoteDetailView from "./VoteDetailView";

/**
 * Evaluation CORA-02: `party` is null on a vote for the Speaker and for former
 * members (the schema says so). The voter search called `v.party.toLowerCase()`
 * on every row whose name did not match, so almost any query threw and the
 * error boundary replaced the vote page.
 */
const vote: VoteDetail = {
  id: "7001",
  date: "2026-11-05",
  title: "Atmintinų dienų įstatymo pakeitimo projektas (Nr. XVP-1)",
  description: null,
  url: null,
  result_type: "Priimta",
  stats: { "Už": 3 },
  party_stats: {},
  votes: [
    { mp_id: "a", name: "Juozas Olekas", party: null, choice: "Už" },
    { mp_id: "b", name: "Šarūnas Birutis", party: "Demokratų frakcija „Vardan Lietuvos“", choice: "Už" },
    { mp_id: "c", name: "Agnė Bilotaitė", party: "TS-LKD frakcija", choice: "Už" },
  ],
} as unknown as VoteDetail;

const getVote = vi.fn();
vi.mock("../services/api", async (orig) => {
  const actual = await orig<typeof import("../services/api")>();
  return { ...actual, api: { ...actual.api, getVote: (id: string) => getVote(id) } };
});

async function renderVote() {
  getVote.mockResolvedValue(vote);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VoteDetailView voteId={vote.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText(vote.title, undefined, { timeout: 5000 });
}

beforeEach(() => getVote.mockReset());
afterEach(cleanup);

describe("searching a vote's voters", () => {
  it("survives a member with no faction", async () => {
    await renderVote();
    await userEvent.type(screen.getByPlaceholderText("Ieškoti..."), "bilo");
    expect(screen.getByText("Agnė Bilotaitė")).toBeInTheDocument();
    expect(screen.queryByText("Juozas Olekas")).not.toBeInTheDocument();
  });

  it("finds the member with no faction by name", async () => {
    await renderVote();
    await userEvent.type(screen.getByPlaceholderText("Ieškoti..."), "olek");
    expect(screen.getByText("Juozas Olekas")).toBeInTheDocument();
  });

  it("ignores accents, as the members list does", async () => {
    await renderVote();
    await userEvent.type(screen.getByPlaceholderText("Ieškoti..."), "sarunas");
    expect(screen.getByText("Šarūnas Birutis")).toBeInTheDocument();
  });
});
