import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWikiMarkdown,
  parseWikiFrontmatter,
  checkWikiIdentity,
  WIKI_CACHE_PREFIX,
  WIKI_PAGE_MAX_AGE_MS,
} from "./wiki";

function textResponse(text: string, status = 200) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain" } });
}

describe("wiki service resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("returns markdown and caches it on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(textResponse("# Wiki")));

    const result = await fetchWikiMarkdown("abc", { retries: 0, timeoutMs: 1000 });
    expect(result.kind).toBe("ok");
    expect(result.markdown).toContain("Wiki");
    expect(sessionStorage.getItem(`${WIKI_CACHE_PREFIX}abc`)).toContain("# Wiki");
  });

  it("retries once on transient 503 and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(textResponse("temporary", 503))
      .mockResolvedValueOnce(textResponse("# Recovered", 200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikiMarkdown("abc", { retries: 1, retryDelayMs: 1, timeoutMs: 1000 });
    expect(result.kind).toBe("ok");
    expect(result.markdown).toContain("Recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses cached content when network fails", async () => {
    sessionStorage.setItem(`${WIKI_CACHE_PREFIX}abc`, "cached wiki");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("Network down")));

    const result = await fetchWikiMarkdown("abc", { retries: 0, timeoutMs: 1000 });
    expect(result.kind).toBe("cached");
    expect(result.markdown).toBe("cached wiki");
  });

  it("returns not_found on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(textResponse("missing", 404)));

    const result = await fetchWikiMarkdown("abc", { retries: 0, timeoutMs: 1000 });
    expect(result.kind).toBe("not_found");
  });
});

describe("parseWikiFrontmatter", () => {
  it("extracts mp_id and generated_at from valid frontmatter", () => {
    const raw =
      "---\nmp_id: 67835f9f-16a1-4151-a938-4bf84fb34a38\n" +
      "display_name: Roma Janušonienė\n" +
      "generated_at: 2026-03-31T10:00:00+00:00\n---\n## Summary\nHigh risk.";
    const result = parseWikiFrontmatter(raw);
    expect(result.meta).toBeTruthy();
    expect(result.meta!.mp_id).toBe("67835f9f-16a1-4151-a938-4bf84fb34a38");
    expect(result.meta!.display_name).toBe("Roma Janušonienė");
    expect(result.meta!.generated_at).toBe("2026-03-31T10:00:00+00:00");
    expect(result.body).toContain("## Summary");
    expect(result.body).not.toContain("---");
  });

  it("returns null meta for content without frontmatter", () => {
    const result = parseWikiFrontmatter("## Summary\nNo frontmatter.");
    expect(result.meta).toBeNull();
    expect(result.body).toContain("## Summary");
  });

  it("returns null meta for malformed frontmatter (missing closing ---)", () => {
    const result = parseWikiFrontmatter("---\nmp_id: abc\nno closing");
    expect(result.meta).toBeNull();
  });
});

describe("checkWikiIdentity", () => {
  const UUID_ROMA = "67835f9f-16a1-4151-a938-4bf84fb34a38";
  const UUID_IGNAS = "18d2ac9d-69d3-431d-8e8c-0bff1586a387";

  it("returns ok when route UUID matches frontmatter mp_id", () => {
    const meta = { mp_id: UUID_ROMA, display_name: "Roma", generated_at: new Date().toISOString() };
    const result = checkWikiIdentity(UUID_ROMA, meta);
    expect(result.status).toBe("ok");
  });

  it("returns identity_mismatch when UUIDs differ", () => {
    const meta = { mp_id: UUID_IGNAS, display_name: "Ignas", generated_at: new Date().toISOString() };
    const result = checkWikiIdentity(UUID_ROMA, meta);
    expect(result.status).toBe("identity_mismatch");
  });

  it("returns stale when generated_at is older than threshold", () => {
    const old = new Date(Date.now() - WIKI_PAGE_MAX_AGE_MS - 60_000).toISOString();
    const meta = { mp_id: UUID_ROMA, display_name: "Roma", generated_at: old };
    const result = checkWikiIdentity(UUID_ROMA, meta);
    expect(result.status).toBe("stale");
  });

  it("returns ok when no meta is provided (backward compat)", () => {
    const result = checkWikiIdentity(UUID_ROMA, null);
    expect(result.status).toBe("ok");
  });

  it("matches UUIDs case-insensitively", () => {
    const meta = { mp_id: UUID_ROMA.toUpperCase(), display_name: "Roma", generated_at: new Date().toISOString() };
    const result = checkWikiIdentity(UUID_ROMA, meta);
    expect(result.status).toBe("ok");
  });
});
