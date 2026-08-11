import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/api";
import { trustApi } from "../services/trust";
import { CorrectionForm } from "./CorrectionForm";

vi.mock("../services/trust", async () => {
  const actual = await vi.importActual<typeof import("../services/trust")>("../services/trust");
  return { ...actual, trustApi: { ...actual.trustApi, submitCorrection: vi.fn() } };
});

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CorrectionForm />
    </QueryClientProvider>,
  );
}

function fillValid() {
  fireEvent.change(screen.getByPlaceholderText(/identifikatorius|nario vardas/i), {
    target: { value: "attendance" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Aprašykite netikslumą/i), {
    target: { value: "Lankomumo skaičius nesutampa su oficialiu šaltiniu." },
  });
}

describe("CorrectionForm", () => {

  it("blocks submission and explains why when the description is too short", () => {
    vi.mocked(trustApi.submitCorrection).mockClear();
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/identifikatorius|nario vardas/i), {
      target: { value: "attendance" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Aprašykite netikslumą/i), {
      target: { value: "trumpa" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Pateikti pataisymą/i }));

    expect(screen.getByText((_, el) => el?.textContent === "Aprašymas turi būti bent 10 simbolių.")).toBeTruthy();
    expect(trustApi.submitCorrection).not.toHaveBeenCalled();
  });

  it("submits with an empty honeypot and confirms in Lithuanian", async () => {
    vi.mocked(trustApi.submitCorrection).mockClear();
    vi.mocked(trustApi.submitCorrection).mockResolvedValue({ status: "received", id: "1" });
    renderForm();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /Pateikti pataisymą/i }));

    await vi.waitFor(() => expect(trustApi.submitCorrection).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(trustApi.submitCorrection).mock.calls[0][0];
    expect(payload.website).toBeUndefined();
    expect(payload.entity_id).toBe("attendance");
    await vi.waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Pataisymas gautas/i));
  });

  it("keeps the honeypot reachable in the DOM but out of view", () => {
    vi.mocked(trustApi.submitCorrection).mockClear();
    renderForm();
    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
    expect(honeypot).toBeTruthy();
    expect(honeypot.type).not.toBe("hidden");
    expect(honeypot.tabIndex).toBe(-1);
  });

  it("shows the rate-limit message on 429", async () => {
    vi.mocked(trustApi.submitCorrection).mockClear();
    vi.mocked(trustApi.submitCorrection).mockRejectedValue(new ApiError(429, "Rate limit exceeded"));
    renderForm();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /Pateikti pataisymą/i }));

    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Per daug užklausų/i));
  });

  it("shows the generic error message on server failure", async () => {
    vi.mocked(trustApi.submitCorrection).mockClear();
    vi.mocked(trustApi.submitCorrection).mockRejectedValue(new ApiError(500, "boom"));
    renderForm();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /Pateikti pataisymą/i }));

    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Nepavyko išsiųsti/i));
  });
});
