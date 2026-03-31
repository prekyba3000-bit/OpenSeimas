import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "../services/api";
import { ProblemDetailsNotice } from "./ProblemDetailsNotice";

describe("ProblemDetailsNotice", () => {
  it("maps 429 API problem to localized message", () => {
    const err = new ApiError(429, "Rate limit exceeded", {
      type: "about:blank",
      title: "Too Many Requests",
      status: 429,
      detail: "Rate limit exceeded",
      instance: "/api/v2/heroes/search",
    });
    render(<ProblemDetailsNotice error={err} />);
    expect(screen.getByText("Per daug užklausų. Pabandykite po minutės.")).toBeInTheDocument();
  });

  it("shows generic localized fallback for unknown error", () => {
    render(<ProblemDetailsNotice error={new Error("unknown")} />);
    expect(screen.getByText("Įvyko klaida. Bandykite dar kartą.")).toBeInTheDocument();
  });
});
