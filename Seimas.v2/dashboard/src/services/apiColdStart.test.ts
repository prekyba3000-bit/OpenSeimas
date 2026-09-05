import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { api, isApiWarm, resetApiWarmth } from "./api";

/**
 * A real /api/stats body, for a test about timeouts rather than about shape.
 *
 * The stub here used to be `{ total_mps: 141 }`, which was fine while the
 * endpoint had no runtime schema and stopped being fine the moment it got one.
 * Read from the committed degraded fixture rather than hand-written, so this
 * file cannot drift from what the backend can actually send — hand-written
 * stubs drifting from the wire is the failure this whole contract layer exists
 * to stop.
 */
const STATS_BODY = JSON.parse(
  readFileSync(
    join(__dirname, "..", "..", "..", "contracts", "fixtures", "degraded-stats.json"),
    "utf-8",
  ),
).payload;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fetch that never settles but rejects when its AbortSignal fires. */
function hangingFetch() {
  return vi.fn().mockImplementation(
    (_url, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );
}

describe("cold-start timeout budget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetApiWarmth();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts cold", () => {
    expect(isApiWarm()).toBe(false);
  });

  it("does not abort a cold request at the warm 8s deadline", async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.getStats().catch((e) => e);
    // Past the 8s warm timeout — a cold request must still be waiting.
    await vi.advanceTimersByTimeAsync(9000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // It aborts once past the 70s cold budget.
    await vi.advanceTimersByTimeAsync(62000);
    const err = await promise;
    expect(err).toBeInstanceOf(Error);
    // Still one attempt: cold path does not retry by default.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks the API warm after the first success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(STATS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    expect(isApiWarm()).toBe(false);
    await api.getStats();
    expect(isApiWarm()).toBe(true);
  });

  it("reverts to the short 8s timeout once warm", async () => {
    // Warm it up first.
    const okFetch = vi.fn().mockResolvedValue(jsonResponse(STATS_BODY));
    vi.stubGlobal("fetch", okFetch);
    await api.getStats();
    expect(isApiWarm()).toBe(true);

    vi.useFakeTimers();
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.getStats().catch((e) => e);
    // Warm request aborts at 8s, not 70s. After the abort a ~250ms backoff runs,
    // then — because the warm path retries (DEFAULT_RETRIES=2) — a second attempt
    // starts (~8.25s). Advancing to 9s proves the deadline was 8s, not 70s.
    await vi.advanceTimersByTimeAsync(9000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Let all retries drain so the rejection is observed, not left dangling.
    await vi.advanceTimersByTimeAsync(60000);
    await promise;
  });

  it("honours an explicit retries override even while cold", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network down"));
    vi.stubGlobal("fetch", fetchMock);

    // getMpProfile forwards RequestOptions; the network error rejects before any
    // parse runs, so retry counting is what we observe.
    await api.getMpProfile("some-id", { retries: 2, retryDelayMs: 1 }).catch(() => {});
    // 2 retries => 3 attempts, despite the cold default of 0.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
