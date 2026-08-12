import { describe, expect, it } from "vitest";
import { isConnectionProblem } from "./ConnectionState";

describe("isConnectionProblem", () => {
  it("is true when a query errored with no data (server unreachable)", () => {
    expect(isConnectionProblem({ isError: true, isPaused: false, data: undefined })).toBe(true);
  });

  it("is true when a query is paused with no data (device offline)", () => {
    expect(isConnectionProblem({ isError: false, isPaused: true, data: undefined })).toBe(true);
  });

  it("is false while merely loading (no error, not paused, no data yet)", () => {
    // This is the cold-start case — the connecting notice handles it, not the error screen.
    expect(isConnectionProblem({ isError: false, isPaused: false, data: undefined })).toBe(false);
  });

  it("is false when cached data exists, even if a refetch errored", () => {
    // Keep showing stale data rather than blanking the page.
    expect(isConnectionProblem({ isError: true, isPaused: false, data: [{ id: "1" }] })).toBe(false);
  });

  it("is false when cached data exists while offline-paused", () => {
    expect(isConnectionProblem({ isError: false, isPaused: true, data: [{ id: "1" }] })).toBe(false);
  });

  it("treats null data as no data", () => {
    expect(isConnectionProblem({ isError: true, isPaused: false, data: null })).toBe(true);
  });
});
