import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/api";
import { trustApi, type MethodologyVersion } from "../services/trust";
import { MethodologyVersions } from "./MethodologyVersions";

vi.mock("../services/trust", async () => {
  const actual = await vi.importActual<typeof import("../services/trust")>("../services/trust");
  return { ...actual, trustApi: { ...actual.trustApi, getMethodology: vi.fn() } };
});

function renderVersions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MethodologyVersions metricKey="attendance" />
    </QueryClientProvider>,
  );
}

const version = (overrides: Partial<MethodologyVersion> = {}): MethodologyVersion => ({
  metric_key: "attendance",
  version: 1,
  title_lt: "Lankomumo skaičiavimas",
  body_lt: "Lankomumas skaičiuojamas pagal užfiksuotus balsavimus.",
  announced_at: null,
  effective_from: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("MethodologyVersions", () => {

  it("treats a 404 as 'nothing published yet', not an error", async () => {
    vi.mocked(trustApi.getMethodology).mockClear();
    vi.mocked(trustApi.getMethodology).mockRejectedValue(
      new ApiError(404, "No methodology published for 'attendance'"),
    );
    renderVersions();

    await vi.waitFor(() => expect(screen.getByText(/Kol kas pakeitimų nėra/i)).toBeInTheDocument());
    expect(screen.getByText(/likus 14 dienų iki įsigaliojimo/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the current version and older history entries", async () => {
    vi.mocked(trustApi.getMethodology).mockClear();
    vi.mocked(trustApi.getMethodology).mockResolvedValue({
      metric_key: "attendance",
      current: version({ version: 2, title_lt: "Antra versija" }),
      history: [version({ version: 1, title_lt: "Pirma versija" })],
    });
    renderVersions();

    expect(await screen.findByText("Antra versija")).toBeInTheDocument();
    expect(screen.getByText("Pirma versija")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("announces an upcoming change with its notice period", async () => {
    vi.mocked(trustApi.getMethodology).mockClear();
    const effective = new Date(Date.now() + 20 * 86_400_000).toISOString();
    const announced = new Date(Date.now() - 1 * 86_400_000).toISOString();
    vi.mocked(trustApi.getMethodology).mockResolvedValue({
      metric_key: "attendance",
      current: version({ version: 3, effective_from: effective, announced_at: announced }),
      history: [],
    });
    renderVersions();

    expect(await screen.findByText(/įsigalios nauja/i)).toBeInTheDocument();
    expect(screen.getByText(/likus 21 d\. iki įsigaliojimo/i)).toBeInTheDocument();
  });

  it("does not announce anything when the current version is already in force", async () => {
    vi.mocked(trustApi.getMethodology).mockClear();
    vi.mocked(trustApi.getMethodology).mockResolvedValue({
      metric_key: "attendance",
      current: version(),
      history: [],
    });
    renderVersions();

    expect(await screen.findByText("Lankomumo skaičiavimas")).toBeInTheDocument();
    expect(screen.queryByText(/įsigalios nauja/i)).not.toBeInTheDocument();
  });
});
