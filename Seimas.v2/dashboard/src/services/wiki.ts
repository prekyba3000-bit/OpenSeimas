export const WIKI_CACHE_PREFIX = "wiki:";
/** Wiki markdown treated as outdated after this age (renamed to avoid accidental RPG-stat substring matches in grep). */
export const WIKI_PAGE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export interface WikiFrontmatter {
  mp_id: string;
  display_name?: string;
  risk_level?: string;
  generated_at?: string;
  source?: string;
}

export interface WikiParseResult {
  meta: WikiFrontmatter | null;
  body: string;
}

export type WikiIdentityStatus = "ok" | "identity_mismatch" | "stale";

export interface WikiIdentityCheck {
  status: WikiIdentityStatus;
  reason?: string;
}

export function parseWikiFrontmatter(raw: string): WikiParseResult {
  if (!raw.startsWith("---")) {
    return { meta: null, body: raw };
  }
  const closingIdx = raw.indexOf("---", 3);
  if (closingIdx === -1) {
    return { meta: null, body: raw };
  }
  const fmBlock = raw.slice(3, closingIdx);
  const body = raw.slice(closingIdx + 3).replace(/^\n/, "");
  const fields: Record<string, string> = {};
  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) fields[key] = value;
  }
  if (!fields.mp_id) {
    return { meta: null, body: raw };
  }
  return {
    meta: {
      mp_id: fields.mp_id,
      display_name: fields.display_name,
      risk_level: fields.risk_level,
      generated_at: fields.generated_at,
      source: fields.source,
    },
    body,
  };
}

export function checkWikiIdentity(
  routeMpId: string,
  meta: WikiFrontmatter | null,
): WikiIdentityCheck {
  if (!meta) {
    return { status: "ok" };
  }
  if (meta.mp_id.toLowerCase() !== routeMpId.toLowerCase()) {
    return {
      status: "identity_mismatch",
      reason: `Route UUID '${routeMpId}' does not match wiki mp_id '${meta.mp_id}'.`,
    };
  }
  if (meta.generated_at) {
    const generatedMs = new Date(meta.generated_at).getTime();
    if (!Number.isNaN(generatedMs) && Date.now() - generatedMs > WIKI_PAGE_MAX_AGE_MS) {
      const hoursAgo = Math.round((Date.now() - generatedMs) / 3_600_000);
      return {
        status: "stale",
        reason: `Wiki generated ${hoursAgo}h ago.`,
      };
    }
  }
  return { status: "ok" };
}

type WikiResultKind = "ok" | "cached" | "not_found" | "error";

export interface WikiFetchResult {
  kind: WikiResultKind;
  markdown: string | null;
  meta?: WikiFrontmatter | null;
  error?: Error;
}

export interface WikiFetchOptions {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(mpId: string): string {
  return `${WIKI_CACHE_PREFIX}${mpId}`;
}

function readCache(mpId: string): string | null {
  const value = sessionStorage.getItem(cacheKey(mpId));
  return value && value.trim() ? value : null;
}

function writeCache(mpId: string, markdown: string): void {
  sessionStorage.setItem(cacheKey(mpId), markdown);
}

export async function fetchWikiMarkdown(
  mpId: string,
  options: WikiFetchOptions = {},
): Promise<WikiFetchResult> {
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 250;
  const timeoutMs = options.timeoutMs ?? 5000;
  const url = `/wikis/${encodeURIComponent(mpId)}.md`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method: "GET", signal: controller.signal });
      if (response.status === 404) {
        clearTimeout(timeoutId);
        return { kind: "not_found", markdown: null };
      }
      if (!response.ok) {
        if (attempt < retries && RETRYABLE_STATUSES.has(response.status)) {
          clearTimeout(timeoutId);
          await sleep(retryDelayMs * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Wiki request failed (${response.status})`);
      }
      const text = await response.text();
      const markdown = text && text.trim() ? text : null;
      if (!markdown) {
        clearTimeout(timeoutId);
        return { kind: "not_found", markdown: null };
      }
      writeCache(mpId, markdown);
      clearTimeout(timeoutId);
      const { meta, body } = parseWikiFrontmatter(markdown);
      return { kind: "ok", markdown: body, meta };
    } catch (error) {
      const err = error as Error;
      lastError = err;
      if (attempt < retries) {
        clearTimeout(timeoutId);
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const cached = readCache(mpId);
  if (cached) {
    return { kind: "cached", markdown: cached, error: lastError };
  }

  return { kind: "error", markdown: null, error: lastError };
}
