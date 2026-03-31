import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

const Bomb = () => {
  throw new Error("boom");
};

describe("AppErrorBoundary", () => {
  it("renders localized fallback when child crashes", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Įvyko netikėta klaida")).toBeInTheDocument();
    expect(screen.getByText("Bandyti iš naujo")).toBeInTheDocument();
    errSpy.mockRestore();
  });
});
