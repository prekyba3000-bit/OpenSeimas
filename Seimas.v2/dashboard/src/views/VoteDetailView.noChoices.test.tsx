import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { VoteDetail } from "../services/api";

/**
 * The fifth instance of the pattern, closed at the UI layer.
 *
 * 1,653 of 5,279 votes (31%) carry one row per member with `choice: null` —
 * the array is present and full-length while holding nothing. Before this,
 * the page called `choice.toLowerCase()` on the first null and threw; the
 * error boundary blanked the whole vote for a third of the record.
 */
const members = (choice: string | null) =>
  Array.from({ length: 140 }, (_, i) => ({
    mp_id: `mp-${i}`,
    name: `Narys ${i}`,
    party: "Lietuvos socialdemokratų partijos frakcija",
    choice,
  }));

const unpublished: VoteDetail = {
  id: "5190",
  date: "2026-07-14",
  title: "Seimo nutarimo projektas (Nr. XVP-1766)",
  description: null,
  url: null,
  result_type: null,
  stats: { null: 140 } as unknown as Record<string, number>,
  party_stats: {},
  votes: members(null),
};

const published: VoteDetail = {
  ...unpublished,
  id: "5213",
  stats: { "Už": 89 },
  party_stats: { "Lietuvos socialdemokratų partijos frakcija": { "Už": 89 } },
  votes: members("Už"),
};

const getVote = vi.fn();
vi.mock("../services/api", async (orig) => {
  const actual = await orig<typeof import("../services/api")>();
  return { ...actual, api: { ...actual.api, getVote: (id: string) => getVote(id) } };
});

async function renderVote(vote: VoteDetail) {
  getVote.mockResolvedValue(vote);
  const { default: VoteDetailView } = await import("./VoteDetailView");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VoteDetailView voteId={vote.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText(vote.title);
}

beforeEach(() => getVote.mockReset());

describe("a vote whose per-member choices were never published", () => {
  it("renders without throwing, and says so explicitly", async () => {
    await renderVote(unpublished);
    expect(screen.getByText("Nėra duomenų apie pavienius balsus")).toBeInTheDocument();
  });

  it("renders zero member rows", async () => {
    await renderVote(unpublished);
    // Not one of the 140 names, and not the list's own furniture either — a
    // search box over an empty list invites a hunt for data that never existed.
    expect(screen.queryByText("Narys 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Individualūs balsai")).not.toBeInTheDocument();
  });

  it("does not print a total assembled from rows that hold no votes", async () => {
    // `stats` is `{ null: 140 }`; summing it gave „140 balsų" for a vote where
    // nobody is recorded as having voted.
    await renderVote(unpublished);
    expect(screen.queryByText(/140 balsų/)).not.toBeInTheDocument();
  });

  it("still shows the member list when choices do exist", async () => {
    await renderVote(published);
    expect(screen.getByText("Individualūs balsai")).toBeInTheDocument();
    expect(screen.queryByText("Nėra duomenų apie pavienius balsus")).not.toBeInTheDocument();
  });
});
