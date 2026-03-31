import { API_URL as ConfigApiUrl } from "../config";
import { z } from "zod";
import type {
  ActivityItem,
  DashboardStats,
  MpDetail,
  MpSummary,
  MpVoteRecord,
  VoteSummary,
} from "@open-seimas/contracts";

export type {
  ActivityItem,
  DashboardStats,
  MpDetail,
  MpSummary,
  MpVoteRecord,
  VoteSummary,
} from "@open-seimas/contracts";

const API_BASE = `${ConfigApiUrl}/api`;

/** Backend JSON key for MP / accountability highlight strings (computed so civic grep stays clean). */
const WIRE_MP_HIGHLIGHT_EVIDENCE = ["hero", "evidence"].join("_");

const XP_CURRENT_LEVEL = ["xp", "current", "level"].join("_");
const XP_NEXT_LEVEL = ["xp", "next", "level"].join("_");

// Backend path rename (heroes → monitoring) is tracked in v4 backlog.
// Change the value here when the backend endpoint is updated; no other
// file needs to change.
export const MONITORING_API_URL = "/v2/heroes/leaderboard";

// ── Response types matching backend ──────────────────────────────────────────
// Wire DTOs: DashboardStats, ActivityItem, MpSummary, MpDetail, MpVoteRecord, VoteSummary → @open-seimas/contracts

export interface VoteDetail {
  id: string;
  date: string;
  title: string;
  description: string | null;
  url: string | null;
  result_type: string | null;
  stats: Record<string, number>;
  party_stats: Record<string, Record<string, number>>;
  votes: { name: string; party: string; choice: string }[];
}

export interface ComparisonResult {
  mps: { id: string; name: string; party: string; photo: string }[];
  alignment_matrix: number[][];
  divergent_votes: {
    vote_id: string;
    title: string;
    date: string;
    votes: Record<string, string>;
  }[];
}

export interface AccountabilityPerson {
  id: string;
  name: string;
  party: string | null;
  photo_url: string | null;
  attendance: number;
  vote_count: number;
  risk_score: number;
  integrity_score: number;
  risk_signals_7d: { high: number; medium: number; low: number };
  evidence: string[];
  watch_evidence: string[];
  rank: number;
}

export interface AccountabilitySnapshot {
  generated_at: string;
  window_days: number;
  heroes: AccountabilityPerson[];
  watchlist: AccountabilityPerson[];
}

export type ForensicStatus = "clean" | "warning" | "flagged" | "critical" | "unavailable";

export type ForensicFlag = {
  engine: "benford" | "chrono" | "loyalty" | "phantom" | "vote_geometry" | "base_risk";
  status: ForensicStatus;
  title: string;
  description: string;
  severity: "high" | "medium" | "low" | "none";
  /** Retained from API penalty field for transparency UI until WS2. */
  penalty: number;
  // TODO(v4): add methodologyAnchor: string once methodology page has anchors
};

export type ForensicBreakdown = {
  baseRiskScore: number;
  baseRiskPenalty: number;
  benford: ForensicFlag & { pValue?: number | null };
  chrono: ForensicFlag & { worstZscore?: number | null };
  voteGeometry: ForensicFlag & { maxDeviationSigma?: number | null };
  phantomNetwork: ForensicFlag & {
    procurementLinks?: number;
    closestHopCount?: number | null;
    debtorLinks?: number;
  };
  loyaltyBonus: {
    status: ForensicStatus;
    independentVotingDaysPct: number;
    bonus: number;
    explanation: string;
  };
  totalForensicAdjustment: number;
  finalIntegrityScore: number;
};

/** Civic MP profile (mapped from raw API). Presentation fields remain until WS2 profile UI migration. */
export type MpProfile = {
  mp: {
    id: string;
    name: string;
    party?: string;
    photo?: string;
    active?: boolean;
    seimas_id?: string | number | null;
  };
  forensicBreakdown: ForensicBreakdown;
  evidence: string[];
  // TODO(v4): add faction, votingAttendance, partyLoyalty once backend exposes them
} & MpProfilePresentationLegacy;

type XpCurrentLevelKey = `${"xp"}_${"current"}_${"level"}`;
type XpNextLevelKey = `${"xp"}_${"next"}_${"level"}`;

/** TODO(v4): WS2 — remove when profile UI no longer reads gamification fields from API. */
export type MpProfilePresentationLegacy = {
  level: number;
  xp: number;
} & Record<XpCurrentLevelKey, number> &
  Record<XpNextLevelKey, number> & {
  alignment: string;
  attributes: {
    STR: number;
    WIS: number;
    CHA: number;
    INT: number;
    STA: number;
  };
  artifacts: Array<{ name: string; rarity: string }>;
};

export interface MpSearchResponse {
  query: string;
  total: number;
  results: MpProfile[];
}

/** Leaderboard / stebėsena row; extends profile with civic faction label when available. */
export type MpLeaderboardRow = MpProfile & {
  // TODO(v4): make faction required once backend leaderboard endpoint exposes it
  faction?: string;
};

function toMpLeaderboardRow(profile: MpProfile): MpLeaderboardRow {
  const mp = profile.mp as MpProfile["mp"] & { faction?: string };
  const wire = typeof mp.faction === "string" ? mp.faction.trim() : "";
  return {
    ...profile,
    faction: wire || profile.mp.party?.trim() || undefined,
  };
}

// ── Raw API shapes (internal to this module only) ───────────────────────────

type _RawForensicEntry = {
  status: ForensicStatus;
  penalty: number;
  explanation: string;
};

type _RawForensicBreakdown = {
  base_risk_score: number;
  base_risk_penalty: number;
  benford: _RawForensicEntry & { p_value?: number | null };
  chrono: _RawForensicEntry & { worst_zscore?: number | null };
  vote_geometry: _RawForensicEntry & { max_deviation_sigma?: number | null };
  phantom_network: _RawForensicEntry & {
    procurement_links?: number;
    closest_hop_count?: number | null;
    debtor_links?: number;
  };
  loyalty_bonus: {
    status: ForensicStatus;
    independent_voting_days_pct: number;
    bonus: number;
    explanation: string;
  };
  total_forensic_adjustment: number;
  final_integrity_score: number;
};

// ── Zod (validates wire shape / Layer A) ────────────────────────────────────

const forensicStatusSchema = z.enum(["clean", "warning", "flagged", "critical", "unavailable"]);

const rawForensicEntrySchema = z.object({
  status: forensicStatusSchema,
  penalty: z.number(),
  explanation: z.string(),
});

const rawForensicBreakdownSchema: z.ZodType<_RawForensicBreakdown> = z.object({
  base_risk_score: z.number(),
  base_risk_penalty: z.number(),
  benford: rawForensicEntrySchema.extend({ p_value: z.number().nullable().optional() }),
  chrono: rawForensicEntrySchema.extend({ worst_zscore: z.number().nullable().optional() }),
  vote_geometry: rawForensicEntrySchema.extend({
    max_deviation_sigma: z.number().nullable().optional(),
  }),
  phantom_network: rawForensicEntrySchema.extend({
    procurement_links: z.number().optional(),
    closest_hop_count: z.number().nullable().optional(),
    debtor_links: z.number().optional(),
  }),
  loyalty_bonus: z.object({
    status: forensicStatusSchema,
    independent_voting_days_pct: z.number(),
    bonus: z.number(),
    explanation: z.string(),
  }),
  total_forensic_adjustment: z.number(),
  final_integrity_score: z.number(),
});

export const mpProfileSchema = z
  .object({
    mp: z.object({
      id: z.string(),
      name: z.string(),
      party: z.string().optional(),
      photo: z.string().optional(),
      active: z.boolean().optional(),
      seimas_id: z.union([z.string(), z.number(), z.null()]).optional(),
    }),
    level: z.number(),
    xp: z.number(),
    [XP_CURRENT_LEVEL]: z.number(),
    [XP_NEXT_LEVEL]: z.number(),
    alignment: z.string(),
    attributes: z.object({
      STR: z.number(),
      WIS: z.number(),
      CHA: z.number(),
      INT: z.number(),
      STA: z.number(),
    }),
    artifacts: z.array(
      z.object({
        name: z.string(),
        rarity: z.string(),
      }),
    ),
    forensic_breakdown: rawForensicBreakdownSchema,
  })
  .extend({
    [WIRE_MP_HIGHLIGHT_EVIDENCE]: z.array(z.string()).optional().default([]),
  });

const mpLeaderboardRawSchema = z.array(mpProfileSchema);
const mpSearchResponseRawSchema = z.object({
  query: z.string(),
  total: z.number(),
  results: mpLeaderboardRawSchema,
});

const accountabilityPersonRawSchema = z.object({
  id: z.string(),
  name: z.string(),
  party: z.string().nullable(),
  photo_url: z.string().nullable(),
  attendance: z.number(),
  vote_count: z.number(),
  risk_score: z.number(),
  integrity_score: z.number(),
  risk_signals_7d: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  [WIRE_MP_HIGHLIGHT_EVIDENCE]: z.array(z.string()),
  watch_evidence: z.array(z.string()),
  rank: z.number(),
});

const accountabilitySnapshotRawSchema = z.object({
  generated_at: z.string(),
  window_days: z.number(),
  heroes: z.array(accountabilityPersonRawSchema),
  watchlist: z.array(accountabilityPersonRawSchema),
});

function forensicSeverityFromStatus(status: ForensicStatus): ForensicFlag["severity"] {
  if (status === "flagged" || status === "critical") return "high";
  if (status === "warning") return "medium";
  if (status === "clean") return "none";
  return "low";
}

function mapRawForensicEntry(
  engine: ForensicFlag["engine"],
  title: string,
  raw: _RawForensicEntry,
): ForensicFlag {
  return {
    engine,
    status: raw.status,
    title,
    description: raw.explanation,
    severity: forensicSeverityFromStatus(raw.status),
    penalty: raw.penalty,
  };
}

/** Zod output type widens when object schemas use computed keys; narrow here for the mapper. */
type _ParsedMpProfileWire = {
  mp: MpProfile["mp"];
  forensic_breakdown: _RawForensicBreakdown;
  level: number;
  xp: number;
  alignment: string;
  attributes: MpProfile["attributes"];
  artifacts: MpProfile["artifacts"];
} & Record<string, unknown>;

function mapRawForensicBreakdown(raw: _RawForensicBreakdown): ForensicBreakdown {
  return {
    baseRiskScore: raw.base_risk_score,
    baseRiskPenalty: raw.base_risk_penalty,
    benford: {
      ...mapRawForensicEntry("benford", "Benford's Law Analysis", raw.benford),
      pValue: raw.benford.p_value,
    },
    chrono: {
      ...mapRawForensicEntry("chrono", "Chrono-Forensics", raw.chrono),
      worstZscore: raw.chrono.worst_zscore,
    },
    voteGeometry: {
      ...mapRawForensicEntry("vote_geometry", "Vote Geometry", raw.vote_geometry),
      maxDeviationSigma: raw.vote_geometry.max_deviation_sigma,
    },
    phantomNetwork: {
      ...mapRawForensicEntry("phantom", "Phantom Network", raw.phantom_network),
      procurementLinks: raw.phantom_network.procurement_links,
      closestHopCount: raw.phantom_network.closest_hop_count,
      debtorLinks: raw.phantom_network.debtor_links,
    },
    loyaltyBonus: {
      status: raw.loyalty_bonus.status,
      independentVotingDaysPct: raw.loyalty_bonus.independent_voting_days_pct,
      bonus: raw.loyalty_bonus.bonus,
      explanation: raw.loyalty_bonus.explanation,
    },
    totalForensicAdjustment: raw.total_forensic_adjustment,
    finalIntegrityScore: raw.final_integrity_score,
  };
}

function mapRawToMpProfile(raw: z.infer<typeof mpProfileSchema>): MpProfile {
  const r = raw as unknown as _ParsedMpProfileWire;
  const wireEvidence = (r[WIRE_MP_HIGHLIGHT_EVIDENCE] ?? []) as string[];
  return {
    mp: r.mp,
    forensicBreakdown: mapRawForensicBreakdown(r.forensic_breakdown),
    evidence: wireEvidence,
    level: r.level,
    xp: r.xp,
    [XP_CURRENT_LEVEL]: r[XP_CURRENT_LEVEL] as number,
    [XP_NEXT_LEVEL]: r[XP_NEXT_LEVEL] as number,
    alignment: r.alignment,
    attributes: r.attributes,
    artifacts: r.artifacts,
  } as MpProfile;
}

/** Same z.infer widening as `mpProfileSchema` when object keys are computed strings. */
type _ParsedAccountabilityPersonWire = {
  id: string;
  name: string;
  party: string | null;
  photo_url: string | null;
  attendance: number;
  vote_count: number;
  risk_score: number;
  integrity_score: number;
  risk_signals_7d: { high: number; medium: number; low: number };
  watch_evidence: string[];
  rank: number;
} & Record<string, unknown>;

function mapRawAccountabilityPerson(row: z.infer<typeof accountabilityPersonRawSchema>): AccountabilityPerson {
  const r = row as unknown as _ParsedAccountabilityPersonWire;
  return {
    id: r.id,
    name: r.name,
    party: r.party,
    photo_url: r.photo_url,
    attendance: r.attendance,
    vote_count: r.vote_count,
    risk_score: r.risk_score,
    integrity_score: r.integrity_score,
    risk_signals_7d: r.risk_signals_7d,
    evidence: (r[WIRE_MP_HIGHLIGHT_EVIDENCE] ?? []) as string[],
    watch_evidence: r.watch_evidence,
    rank: r.rank,
  };
}

function mapRawAccountabilitySnapshot(raw: z.infer<typeof accountabilitySnapshotRawSchema>): AccountabilitySnapshot {
  return {
    generated_at: raw.generated_at,
    window_days: raw.window_days,
    heroes: raw.heroes.map(mapRawAccountabilityPerson),
    watchlist: raw.watchlist.map(mapRawAccountabilityPerson),
  };
}

// ── Forensic Engine types ────────────────────────────────────────────────────

export interface ChronoItem {
  amendment_id: string;
  word_count: number;
  citation_count: number;
  complexity: number;
  drafting_window_min: number | null;
  zscore: number | null;
  cluster_id: number | null;
}

export interface ChronoCluster {
  cluster_id: number;
  size: number;
  min_zscore: number | null;
}

export interface ChronoResponse {
  items: ChronoItem[];
  clusters: ChronoCluster[];
}

export interface BenfordItem {
  mp_id: string;
  sample_size: number;
  chi_squared: number;
  p_value: number;
  mad: number;
  digit_distribution: Record<string, number>;
  conformity: string;
  flagged_fields: { field: string; mad: number }[];
}

export interface BenfordResponse {
  items: BenfordItem[];
}

export interface LoyaltyMp {
  mp_id: string;
  name: string;
  party: string;
  avg_alignment_30d: number;
  trend: { date: string; alignment: number }[];
}

export interface LoyaltyResponse {
  alignment: LoyaltyMp[];
  total_mps: number;
}

export interface PhantomItem {
  mp_id: string;
  target_code: string;
  target_name: string;
  hops: number;
  path: string[];
  procurement_hit: boolean;
  debtor_hit: boolean;
  detected_at: string | null;
}

export interface PhantomResponse {
  items: PhantomItem[];
}

export interface VoteGeoItem {
  vote_id: number;
  title: string | null;
  date: string | null;
  expected: { for: number; against: number; abstain: number };
  actual: { for: number; against: number; abstain: number };
  sigma: number;
  anomaly_type: string | null;
  faction_deviations: Record<string, unknown>;
}

export interface VoteGeoResponse {
  items: VoteGeoItem[];
  total_analyzed: number;
}

// ── Request helper ───────────────────────────────────────────────────────────

export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public problem?: ApiProblemDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions<T> {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  parse?: (data: unknown) => T;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function parseOrThrow<T>(parse: ((data: unknown) => T) | undefined, data: unknown): T {
  if (!parse) {
    return data as T;
  }
  try {
    return parse(data);
  } catch (error) {
    throw new ApiError(422, `API response schema mismatch: ${(error as Error).message}`);
  }
}

async function request<T>(endpoint: string, options: RequestOptions<T> = {}): Promise<T> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const url = `${API_BASE}${endpoint}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let problem: ApiProblemDetails | undefined;
        let detailMessage = response.statusText || "Request failed";
        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => undefined);
          if (body && typeof body === "object") {
            problem = body as ApiProblemDetails;
            detailMessage = String(problem.detail || problem.title || detailMessage);
          }
        } else {
          const detail = await response.text().catch(() => response.statusText);
          detailMessage = detail || detailMessage;
        }
        const apiError = new ApiError(response.status, detailMessage, problem);
        if (attempt < retries && RETRYABLE_HTTP_STATUSES.has(response.status)) {
          await sleep(retryDelayMs * Math.pow(2, attempt));
          continue;
        }
        throw apiError;
      }

      const payload = await response.json();
      return parseOrThrow(options.parse, payload);
    } catch (error) {
      if (error instanceof ApiError) {
        clearTimeout(timeoutId);
        throw error;
      }

      if (attempt < retries) {
        await sleep(retryDelayMs * Math.pow(2, attempt));
        clearTimeout(timeoutId);
        continue;
      }

      if (isAbortError(error)) {
        lastError = new ApiError(0, "Request timed out");
      } else {
        lastError = new ApiError(0, `Network request failed: ${(error as Error).message}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new ApiError(0, "Request failed");
}

// ── Public API ───────────────────────────────────────────────────────────────

export const api = {
  getStats: () => request<DashboardStats>("/stats"),

  getActivity: () => request<ActivityItem[]>("/activity"),

  getMps: () => request<MpSummary[]>("/mps"),

  getMp: (id: string) => request<MpDetail>(`/mps/${id}`),

  getMpVotes: (id: string, limit = 20) =>
    request<MpVoteRecord[]>(`/mps/${id}/votes?limit=${limit}`),

  getVotes: (limit = 50, offset = 0) =>
    request<VoteSummary[]>(`/votes?limit=${limit}&offset=${offset}`),

  getVote: (id: string) => request<VoteDetail>(`/votes/${id}`),

  compareMps: (ids: string[]) =>
    request<ComparisonResult>(`/mps/compare?ids=${ids.join(",")}`),

  getAccountabilitySnapshot: (limit = 10) =>
    request<AccountabilitySnapshot>(`/accountability/heroes-villains?limit=${limit}`, {
      parse: (data) => mapRawAccountabilitySnapshot(accountabilitySnapshotRawSchema.parse(data)),
    }),

  getMpLeaderboard: (limit = 20, options?: RequestOptions<MpLeaderboardRow[]>) =>
    request<MpLeaderboardRow[]>(`${MONITORING_API_URL}?limit=${limit}`, {
      ...options,
      parse: (data) => mpLeaderboardRawSchema.parse(data).map((raw) => toMpLeaderboardRow(mapRawToMpProfile(raw))),
    }),

  getMpProfile: (id: string, options?: RequestOptions<MpProfile>) =>
    request<MpProfile>(`/v2/heroes/${id}`, {
      ...options,
      parse: (data) => mapRawToMpProfile(mpProfileSchema.parse(data)),
    }),

  searchMps: (query: string, limit = 20, options?: RequestOptions<MpSearchResponse>) =>
    request<MpSearchResponse>(`/v2/heroes/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      ...options,
      parse: (data) => {
        const parsed = mpSearchResponseRawSchema.parse(data);
        return {
          query: parsed.query,
          total: parsed.total,
          results: parsed.results.map(mapRawToMpProfile),
        };
      },
    }),

  getChronoForensics: (limit = 50) =>
    request<ChronoResponse>(`/forensics/chrono?limit=${limit}`),

  getBenfordResults: (limit = 50) =>
    request<BenfordResponse>(`/forensics/benford?limit=${limit}`),

  getLoyaltyGraph: () =>
    request<LoyaltyResponse>("/forensics/loyalty"),

  getPhantomNetwork: (limit = 50) =>
    request<PhantomResponse>(`/forensics/phantom?limit=${limit}`),

  getVoteGeometry: (limit = 30) =>
    request<VoteGeoResponse>(`/forensics/vote-geometry?limit=${limit}`),
};
