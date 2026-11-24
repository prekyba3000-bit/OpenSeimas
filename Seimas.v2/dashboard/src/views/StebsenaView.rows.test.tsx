import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { api } from "../services/api";
import StebsenaView from "./StebsenaView";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return { ...actual, api: { ...actual.api, getMpLeaderboard: vi.fn() } };
});

/**
 * Evaluation CORA-08 and CORF-02 (2026-11-22).
 *  - The page asked for the default 20 rows, so about 120 of 140 sitting
 *    members were silently absent from a main-navigation page.
 *  - Sorting by a dimension lifted members without it into a group whose rows
 *    had one cell more than the header, so every value sat under the wrong
 *    column; on phones that group was not rendered at all.
 *  - The leaderboard serves the English placeholder „Unknown" as a faction.
 */
const row = (id: string, name: string, attendance: number | null, faction: string) => ({
  mp: { id, name, party: faction, photo: "", active: true },
  metrics: { attendance_percentage: attendance },
  faction,
});
const ROWS = [
  row("a", "Agnė Bilotaitė", 72.04, "TS-LKD frakcija"),
  row("b", "Juozas Olekas", null, "Unknown"),
  row("c", "Šarūnas Birutis", 88.5, "Demokratų frakcija „Vardan Lietuvos“"),
];

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StebsenaView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sortByAttendance = async () => {
  await userEvent.selectOptions(await screen.findByLabelText("Rikiuoti pagal"), "attendance");
};

beforeEach(() => {
  vi.mocked(api.getMpLeaderboard).mockReset();
  vi.mocked(api.getMpLeaderboard).mockResolvedValue(ROWS as never);
});

describe("Stebėsena", () => {
  it("asks for every sitting member, not the first 20", async () => {
    renderView();
    await screen.findAllByText("Agnė Bilotaitė");
    const [limit] = vi.mocked(api.getMpLeaderboard).mock.calls[0];
    expect(limit).toBeGreaterThanOrEqual(141);
  });

  it("keeps every cell under its header when members are lifted out", async () => {
    renderView();
    await sortByAttendance();
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader").length;
    const olekasRow = within(table).getByText("Juozas Olekas").closest("tr")!;
    expect(olekasRow.querySelectorAll("td")).toHaveLength(headers);
    expect(olekasRow.querySelectorAll("td")[0].textContent).toContain("Juozas Olekas");
  });

  it("still lists a member without the sorted figure on a phone", async () => {
    renderView();
    await sortByAttendance();
    const phoneList = screen.getAllByRole("list")[0];
    expect(within(phoneList).getByText("Juozas Olekas")).toBeInTheDocument();
    expect(within(phoneList).getAllByRole("listitem")).toHaveLength(ROWS.length);
  });

  it("renders the English placeholder faction as no faction", async () => {
    renderView();
    await screen.findAllByText("Agnė Bilotaitė");
    expect(screen.queryByText("Unknown")).toBeNull();
    expect(screen.getAllByText("Frakcija nenurodyta").length).toBeGreaterThan(0);
  });
});
