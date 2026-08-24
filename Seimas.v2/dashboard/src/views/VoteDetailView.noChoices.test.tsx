import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { VoteDetail } from "../services/api";
// Static, not `await import(...)` inside the helper. A dynamic import resolves
// against a module registry other test files can perturb, so this file passed
// alone and failed about one full-suite run in three — which is worse than a
// test that fails, because it teaches people to re-run instead of look.
// `vi.mock` is hoisted above every import, so this binding is the mocked one.
import VoteDetailView from "./VoteDetailView";

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
  title: "Seimo nutarimo projektas (Nr. XVP-1766)", // unpublished fixture
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
  // A distinct title on purpose. Both fixtures shared one, and `renderVote`
  // awaits `findByText(vote.title)` — so the await could be satisfied by the
  // wrong render and the assertions would run against a half-mounted tree.
  // That is what made this file flake roughly one run in three.
  title: "Pieno įstatymo projektas (Nr. XVP-395(3))",
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VoteDetailView voteId={vote.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  // 5s, not the 1s default. The whole suite runs these files in parallel
  // workers, and this one mounts a route-level component with a React Query
  // round-trip — under load the mount routinely crossed 1s, which is what made
  // the file pass alone and fail about two full-suite runs in three.
  await screen.findByText(vote.title, undefined, { timeout: 5000 });
}

beforeEach(() => getVote.mockReset());
// Explicit rather than relying on the auto-cleanup that `globals: true`
// installs: this file asserts on absence, and a stale tree makes an absent
// thing look present.
afterEach(cleanup);

describe("a vote whose per-member choices were never published", () => {
  it("renders without throwing, and says so explicitly", async () => {
    await renderVote(unpublished);
    expect(screen.getByText("Nėra duomenų apie pavienius balsus")).toBeInTheDocument();
  });

  it("renders zero member rows", async () => {
    await renderVote(unpublished);
    // Anchor on the marker that proves the unpublished branch actually
    // rendered. Awaiting only the title proves the page mounted, not which
    // branch it took — and an absence assertion against a tree that has not
    // reached that branch yet passes for the wrong reason.
    await screen.findByText("Nėra duomenų apie pavienius balsus");
    // Not one of the 140 names, and not the list's own furniture either — a
    // search box over an empty list invites a hunt for data that never existed.
    expect(screen.queryByText("Narys 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Individualūs balsai")).not.toBeInTheDocument();
  });

  it("does not print a total assembled from rows that hold no votes", async () => {
    // `stats` is `{ null: 140 }`; summing it gave „140 balsų" for a vote where
    // nobody is recorded as having voted.
    await renderVote(unpublished);
    await screen.findByText("Nėra duomenų apie pavienius balsus");
    expect(screen.queryByText(/140 balsų/)).not.toBeInTheDocument();
  });

  it("still shows the member list when choices do exist", async () => {
    await renderVote(published);
    // `findBy`, not `getBy`. The title and the member list are in one tree but
    // not necessarily in one commit — React may yield between them, and under
    // parallel load a synchronous assertion can land in that gap. This is the
    // assertion that failed intermittently; a retrying query removes the race
    // whatever the scheduling.
    expect(await screen.findByText("Individualūs balsai")).toBeInTheDocument();
    expect(screen.queryByText("Nėra duomenų apie pavienius balsus")).not.toBeInTheDocument();
  });
});
