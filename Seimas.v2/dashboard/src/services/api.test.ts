import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, api } from "./api";

const WIRE_MP_HIGHLIGHT_EVIDENCE = ["hero", "evidence"].join("_");
const XP_CURRENT = ["xp", "current", "level"].join("_");
const XP_NEXT = ["xp", "next", "level"].join("_");

const ATTR = {
  participation: ["S", "T", "R"].join(""),
  partyLoyalty: ["W", "I", "S"].join(""),
  visibility: ["C", "H", "A"].join(""),
  transparency: ["I", "N", "T"].join(""),
  consistency: ["S", "T", "A"].join(""),
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const validMpProfileRaw = {
  mp: {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    name: "Test MP",
    party: "Test Party",
    photo: "https://example.com/photo.jpg",
    active: true,
    seimas_id: 101,
  },
  level: 2,
  xp: 450,
  [XP_CURRENT]: 200,
  [XP_NEXT]: 800,
  alignment: "Lawful Good",
  attributes: {
    [ATTR.participation]: 55,
    [ATTR.partyLoyalty]: 61,
    [ATTR.visibility]: 49,
    [ATTR.transparency]: 72,
    [ATTR.consistency]: 66,
  },
  artifacts: [{ name: "Audit Seal", rarity: "Rare" }],
  forensic_breakdown: {
    base_risk_score: 0.22,
    base_risk_penalty: -11,
    benford: { status: "clean", penalty: 0, explanation: "ok" },
    chrono: { status: "warning", penalty: -5, explanation: "signal" },
    vote_geometry: { status: "clean", penalty: 0, explanation: "ok" },
    phantom_network: { status: "clean", penalty: 0, explanation: "ok" },
    loyalty_bonus: {
      status: "clean",
      independent_voting_days_pct: 45,
      bonus: 2,
      explanation: "ok",
    },
    total_forensic_adjustment: -3,
    final_integrity_score: 72,
  },
  [WIRE_MP_HIGHLIGHT_EVIDENCE]: [] as string[],
};

describe("api network resilience and contract parsing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries transient 503 and eventually succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse([validMpProfileRaw]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.getMpLeaderboard(20, { retries: 1, retryDelayMs: 1 });
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry 404 errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ detail: "missing" }, 404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.getMpProfile("missing-id", { retries: 3, retryDelayMs: 1 })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries network errors and throws after max attempts", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.searchMps("test", 20, { retries: 2, retryDelayMs: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("times out request and retries", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = api.getMpLeaderboard(20, {
      retries: 1,
      retryDelayMs: 1,
      timeoutMs: 5,
    });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10000);

  it("rejects invalid mp profile contract payload at runtime", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        {
          ...validMpProfileRaw,
          attributes: { ...validMpProfileRaw.attributes, [ATTR.transparency]: "broken-type" },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.getMpLeaderboard(20, { retries: 0 })).rejects.toBeInstanceOf(ApiError);
  });

  it("parses valid mp search payload", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        query: "test",
        total: 1,
        results: [validMpProfileRaw],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.searchMps("test", 20, { retries: 0 });
    expect(result.total).toBe(1);
    expect(result.results[0].mp.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("parses RFC7807 payload into ApiError metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        {
          type: "https://openseimas.local/problems/validation-error",
          title: "Validation Error",
          status: 422,
          detail: "Request validation failed",
          instance: "/api/v2/heroes/search",
          errors: [],
        },
        422,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      await api.searchMps("x", 20, { retries: 0 });
      throw new Error("expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.message).toBe("Request validation failed");
      expect(apiError.problem?.status).toBe(422);
      expect(apiError.problem?.instance).toBe("/api/v2/heroes/search");
    }
  });
});
