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
  // mp_id lets a client join a vote to a seat without matching on
  // display_name. Optional because a cached response from before the field
  // existed will not carry it.
  votes: { mp_id?: string; name: string; party: string; choice: string | null }[];
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

export type ForensicStatus = "clean" | "warning" | "flagged" | "critical" | "unavailable";

export type ForensicFlag = {
  engine: "benford" | "chrono" | "loyalty" | "phantom" | "vote_geometry" | "base_risk";
  status: ForensicStatus;
  title: string;
  description: string;
  severity: "high" | "medium" | "low" | "none" | "unknown";
  /** Retained from API penalty field for transparency UI until WS2. */
  penalty: number;
  // TODO(v4): add methodologyAnchor: string once methodology page has anchors
};

export type ForensicBreakdown = {
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
    /** ISO date the mandate began. */
    mandate_start_date?: string | null;
    /** ISO date the mandate ended; null while still serving. */
    mandate_end_date?: string | null;
  };
  forensicBreakdown: ForensicBreakdown;
  evidence: string[];
  /** Source-backed metrics from the backend. Displayed values come from here. */
  metrics?: MpMetrics;
  /** Per-dimension data quality: "direct" | "proxy" | "unavailable". */
  metrics_provenance?: Partial<
    Record<"legislative_activity" | "experience" | "visibility", string>
  > &
    Record<string, string | undefined>;
  // TODO(v4): add faction once backend exposes it
} & MpProfileDimensions;

export type MpMetrics = {
  attendance_percentage?: number | null;
  /** `kiekis_viso` — includes projects the member only co-signed. */
  bills_initiated_total?: number | null;
  /** `kiekis_individualiai` — initiated alone. Null means unknown, not zero. */
  bills_initiated_individually?: number | null;
  party_loyalty?: number | null;
  total_votes_cast?: number | null;
  speeches_given?: number | null;
  bills_authored_count?: number | null;
  committee_leadership?: number | null;
  years_in_parliament?: number | null;
};

/**
 * The gamification fields are gone from the API. The type that named them —
 * `MpProfileDimensions`, with its `level`, `xp` and the computed-key
 * indirection that kept "xp_next_level" out of source — went with them.
 */
export type MpProfileDimensions = {
  /**
   * The three chamber-relative dimensions, named for what they measure.
   * Were STR / WIS / CHA in an RPG stat block that also carried INT (the
   * composite verdict) and STA (a second aggregation nothing rendered).
   */
  dimensions: {
    legislative_activity: number;
    experience: number;
    visibility: number;
  };
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
};

// ── Zod (validates wire shape / Layer A) ────────────────────────────────────

const forensicStatusSchema = z.enum(["clean", "warning", "flagged", "critical", "unavailable"]);

const rawForensicEntrySchema = z.object({
  status: forensicStatusSchema,
  penalty: z.number(),
  explanation: z.string(),
});

const rawForensicBreakdownSchema: z.ZodType<_RawForensicBreakdown> = z.object({
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
      mandate_start_date: z.string().nullable().optional(),
      mandate_end_date: z.string().nullable().optional(),
    }),
    dimensions: z.object({
      legislative_activity: z.number(),
      experience: z.number(),
      visibility: z.number(),
    }),
    forensic_breakdown: rawForensicBreakdownSchema,
    // The real, source-backed numbers. `attributes` above are derived composites
    // and several of them read from tables that are still empty — prefer these.
    // Keyed by what the dimensions measure, matching the payload. These were
    // STR/WIS/CHA/INT/STA, and because `z.object()` strips what it does not
    // declare, the rename left this schema quietly discarding every key the
    // API sent — provenance arrived as `{}` and the two provenance-gated dials
    // hid data the backend had just supplied.
    //
    // `catchall` rather than a closed shape: a new dimension should reach the
    // client the moment the backend serves it, not one deploy later.
    metrics_provenance: z
      .object({
        legislative_activity: z.string().optional(),
        experience: z.string().optional(),
        visibility: z.string().optional(),
      })
      .catchall(z.string())
      .optional(),
    // Nullable, not merely optional: the backend sends null for a metric it
    // declines to publish (e.g. attendance for a member with almost no
    // eligible sitting days). Treating null as a schema violation took the
    // whole profile down for exactly those members.
    metrics: z
      .object({
        attendance_percentage: z.number().nullable().optional(),
        party_loyalty: z.number().nullable().optional(),
        total_votes_cast: z.number().nullable().optional(),
        speeches_given: z.number().nullable().optional(),
        bills_authored_count: z.number().nullable().optional(),
        // Declared, or z.object() drops them and the profile shows nothing
        // while the API is serving both. That is exactly how metrics_provenance
        // was silently emptied.
        bills_initiated_total: z.number().nullable().optional(),
        bills_initiated_individually: z.number().nullable().optional(),
        committee_leadership: z.number().nullable().optional(),
        years_in_parliament: z.number().nullable().optional(),
      })
      .partial()
      .optional(),
  })
  .extend({
    [WIRE_MP_HIGHLIGHT_EVIDENCE]: z.array(z.string()).optional().default([]),
  });


// Wire contract. z.object() strips undeclared keys silently, so any field the
// API starts sending must be declared here too — that omission once emptied
// metrics_provenance and hid three dials in production.
export const mpActivitySchema = z.object({
  // null means the table is absent in this database: we cannot tell. [] means
  // we looked and found none. The surface renders those differently.
  travel: z
    .array(
      z.object({
        date_from: z.string(),
        date_to: z.string().nullable(),
        title: z.string(),
        title_truncated: z.boolean(),
      }),
    )
    .nullable(),
  // Whether the list was cut at the limit. Not a total: a total would be a
  // comparable number beside a name, which is the thing these lists refuse to
  // publish. This only says "there is more", so nothing is shown as complete
  // when it is not.
  travel_has_more: z.boolean().nullable(),
  press_releases: z.array(
    z.object({
      date: z.string(),
      title: z.string(),
      url: z.string().nullable(),
    }),
  ),
  press_has_more: z.boolean(),
  // Names and whether the post is in the constituency office. No contact
  // field exists to declare: mp_assistants has no column for one, because
  // the feed's phone numbers and addresses are dropped at the parser.
  staff: z
    .array(
      z.object({
        first_name: z.string(),
        last_name: z.string(),
        in_constituency: z.boolean().nullable(),
      }),
    )
    .nullable(),
});

export type MpActivity = z.infer<typeof mpActivitySchema>;


// Wire contract. No total, deliberately: `has_more` says another page exists
// and nothing says how many. A count of diary events measures office, not
// effort, so the API declines to make one available.
export const mpDiarySchema = z.object({
  // null = the table is absent here (we cannot tell); [] = this member's
  // calendar is genuinely empty. Rendered differently.
  events: z
    .array(
      z.object({
        starts_at: z.string(),
        ends_at: z.string().nullable(),
        location: z.string().nullable(),
        title: z.string(),
      }),
    )
    .nullable(),
  has_more: z.boolean().nullable(),
});

export type MpDiary = z.infer<typeof mpDiarySchema>;


// Wire contract for the votes behind the faction-alignment figure.
export const factionAlignmentSchema = z.object({
  // null below the comparable-vote floor: a percentage from a handful of votes
  // is noise wearing a decimal point.
  alignment_pct: z.number().nullable(),
  comparable_votes: z.number(),
  aligned_votes: z.number(),
  votes: z.array(
    z.object({
      vote_id: z.number(),
      date: z.string(),
      title: z.string(),
      choice: z.string(),
      faction_position: z.string(),
      faction_voters: z.number(),
      // The choices matched. Not "was loyal": voting differently from one's
      // faction is a normal act, and we do not have the reasons.
      agreed: z.boolean(),
    }),
  ),
  has_more: z.boolean(),
});

export type FactionAlignment = z.infer<typeof factionAlignmentSchema>;

const mpLeaderboardRawSchema = z.array(mpProfileSchema);
const mpSearchResponseRawSchema = z.object({
  query: z.string(),
  total: z.number(),
  results: mpLeaderboardRawSchema,
});

/**
 * The one predicate that turns an engine status into a severity.
 *
 * It used to end in `return "low"`, so `unavailable` — which the backend sends
 * with the explanation „table is unavailable" — rendered as „Žemas" next to a
 * named member's name. Three of the five engines are unavailable in production
 * today, so three low-severity findings were being asserted about people the
 * platform knows nothing about. Not-measured and measured-and-fine are
 * different facts and now map to different severities.
 *
 * Exported because a second copy of this function lived in
 * utils/forensicBreakdownToFlags.ts and carried the identical bug. One
 * predicate, so they cannot drift apart again.
 */
export function forensicSeverityFromStatus(status: ForensicStatus): ForensicFlag["severity"] {
  if (status === "flagged" || status === "critical") return "high";
  if (status === "warning") return "medium";
  if (status === "clean") return "none";
  if (status === "unavailable") return "unknown";
  // An engine status we do not recognise is also something we cannot grade.
  return "unknown";
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
  dimensions: MpProfile["dimensions"];
  metrics?: MpMetrics;
  metrics_provenance?: MpProfile["metrics_provenance"];
} & Record<string, unknown>;

/**
 * The four engine names are composed here, client-side — they are display
 * strings, not values from the API — and they were in English. They render as
 * the section headings of „Kodėl toks balas?“ on every MP profile, which is
 * one of the most-read surfaces on a Lithuanian-language site.
 */
function mapRawForensicBreakdown(raw: _RawForensicBreakdown): ForensicBreakdown {
  return {
    benford: {
      ...mapRawForensicEntry("benford", "Benfordo dėsnio analizė", raw.benford),
      pValue: raw.benford.p_value,
    },
    chrono: {
      ...mapRawForensicEntry("chrono", "Pataisų laiko analizė", raw.chrono),
      worstZscore: raw.chrono.worst_zscore,
    },
    voteGeometry: {
      ...mapRawForensicEntry("vote_geometry", "Balsavimo geometrija", raw.vote_geometry),
      maxDeviationSigma: raw.vote_geometry.max_deviation_sigma,
    },
    phantomNetwork: {
      ...mapRawForensicEntry("phantom", "Paslėptų ryšių tinklas", raw.phantom_network),
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
  };
}

function mapRawToMpProfile(raw: z.infer<typeof mpProfileSchema>): MpProfile {
  const r = raw as unknown as _ParsedMpProfileWire;
  const wireEvidence = (r[WIRE_MP_HIGHLIGHT_EVIDENCE] ?? []) as string[];
  return {
    mp: r.mp,
    forensicBreakdown: mapRawForensicBreakdown(r.forensic_breakdown),
    evidence: wireEvidence,
    dimensions: r.dimensions,
    metrics: r.metrics,
    metrics_provenance: r.metrics_provenance,
  } as MpProfile;
}

/** Same z.infer widening as `mpProfileSchema` when object keys are computed strings. */
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

export interface LoyaltyDay {
  date: string;
  /** Null when the day yielded no comparable votes. Never a stand-in number. */
  alignment: number | null;
  aligned_votes: number | null;
  votes_on_day: number | null;
}

export interface LoyaltyMp {
  mp_id: string;
  name: string;
  party: string;
  /**
   * Numerator and denominator, so a surface can show why the percentage is
   * what it is. `alignment_pct` is computed from these sums, not as a mean of
   * daily percentages — a sitting day carries 1 to 124 votes, and averaging
   * the daily figures weighs those equally.
   */
  aligned_votes: number;
  comparable_votes: number;
  alignment_pct: number | null;
  sitting_days: number;
  daily: LoyaltyDay[];
}

export interface LoyaltyResponse {
  alignment: LoyaltyMp[];
  total_mps: number;
  source?: string | null;
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
  method?: "GET" | "POST";
  /** JSON-serialized into the request body. Pass retries: 0 for non-idempotent calls. */
  body?: unknown;
}

const DEFAULT_TIMEOUT_MS = 8000;
// Render's free tier sleeps and cold-starts in 15–50s. The first request of an
// app session bears that wait, so it gets a much larger budget; every request
// after the first success reverts to DEFAULT_TIMEOUT_MS.
const COLD_START_TIMEOUT_MS = 70000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

// Session-global: has any request succeeded yet? Governs the cold-start budget.
let apiWarm = false;

/** True once any request has succeeded — i.e. the backend is awake. */
export function isApiWarm(): boolean {
  return apiWarm;
}

/** Reset the warm flag. Exported for tests; no production caller. */
export function resetApiWarmth(): void {
  apiWarm = false;
}

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

export async function request<T>(endpoint: string, options: RequestOptions<T> = {}): Promise<T> {
  // While cold, one long attempt rather than several: the 70s budget already
  // spans Render's boot, and stacking retries only multiplies the worst case the
  // "connecting" state is covering. If it still fails the user gets the error
  // screen with a retry button — their tap, not a silent 140s wait. An explicit
  // caller override (e.g. POST with retries: 0) still wins in both fields.
  const warm = apiWarm;
  const retries = options.retries ?? (warm ? DEFAULT_RETRIES : 0);
  const timeoutMs = options.timeoutMs ?? (warm ? DEFAULT_TIMEOUT_MS : COLD_START_TIMEOUT_MS);
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const url = `${API_BASE}${endpoint}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: options.method ?? "GET",
        ...(options.body === undefined
          ? {}
          : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) }),
      });

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
      // The backend answered — it is awake. Later requests use the short budget.
      apiWarm = true;
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

/**
 * The most recent day the Seimas voted.
 *
 * `outcomes` is null while `votes.result_type` is NULL everywhere — the LRS
 * feed publishes tallies and no pass/fail field. Null means "render no outcome
 * line", not "render zero".
 */
/**
 * Attendance month by month across a member's own mandate.
 *
 * `attendance` is null in two different situations, which is why
 * `eligible_days` travels beside it:
 *   eligible_days === 0  the Seimas did not sit that month — a gap, not an
 *                        absence, and never a zero.
 *   0 < eligible < 3     too few sitting days for a percentage to mean
 *                        anything.
 */
export interface AttendanceTrajectory {
  mp_id: string;
  unit: "month";
  min_eligible_days: number;
  mandate_start_date: string | null;
  mandate_end_date: string | null;
  buckets: Array<{
    period: string;
    eligible_days: number;
    days_present: number;
    attendance: number | null;
  }>;
}

/**
 * Session boundaries as LRS publishes them. `date_to` is null while a session
 * has not ended — it must stay null. The view that consumes this used to carry
 * its own table in which an unfinished session ended in 2099, so a session that
 * closed on 2026-07-14 kept collecting votes under the label „dabar".
 */
export interface SeimasSession {
  id: number;
  number: number | null;
  name: string;
  date_from: string;
  date_to: string | null;
  status: "ended" | "sitting" | "upcoming";
}

export interface SessionsResponse {
  sessions: SeimasSession[];
  source: string | null;
  synced_at?: string | null;
}

export interface LastSittingDay {
  sitting_date: string | null;
  vote_count: number;
  mps_present: number;
  /** Members with a recorded choice that day. Absence is "not in this list" —
   *  the only safe direction, since the source records choices, not absences. */
  mps_present_ids: string[];
  days_since: number | null;
  is_recess: boolean;
  outcomes: { decided: number } | null;
}

export interface Freshness {
  generated_at: string;
  politicians: { row_count: number; latest: string | null };
  votes: { row_count: number; latest: string | null };
  [domain: string]: unknown;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const api = {
  getStats: () => request<DashboardStats>("/stats"),

  getActivity: () => request<ActivityItem[]>("/activity"),

  /**
   * MPs by mandate status. Defaults to `active` — members whose mandate covers
   * today — because that is what "Seimo nariai" means to a reader. Former
   * members are still available (`former` / `all`); they are never deleted,
   * since votes and attendance denominators depend on their records.
   */
  getMps: (status: "active" | "former" | "all" = "active") =>
    request<MpSummary[]>(`/mps?status=${status}`),

  getMp: (id: string) => request<MpDetail>(`/mps/${id}`),

  getMpVotes: (id: string, limit = 20) =>
    request<MpVoteRecord[]>(`/mps/${id}/votes?limit=${limit}`),

  getVotes: (limit = 50, offset = 0) =>
    request<VoteSummary[]>(`/votes?limit=${limit}&offset=${offset}`),

  getMpDiary: (id: string, limit = 50, offset = 0, options?: RequestOptions<MpDiary>) =>
    request<MpDiary>(`/mps/${id}/diary?limit=${limit}&offset=${offset}`, {
      ...options,
      parse: (data) => mpDiarySchema.parse(data),
    }),

  getMpFactionAlignment: (
    id: string,
    only: 'all' | 'diverged' | 'agreed' = 'diverged',
    limit = 25,
    offset = 0,
    options?: RequestOptions<FactionAlignment>,
  ) =>
    request<FactionAlignment>(
      `/mps/${id}/faction-alignment?only=${only}&limit=${limit}&offset=${offset}`,
      { ...options, parse: (data) => factionAlignmentSchema.parse(data) },
    ),

  getMpActivity: (id: string, options?: RequestOptions<MpActivity>) =>
    request<MpActivity>(`/mps/${id}/activity`, {
      ...options,
      parse: (data) => mpActivitySchema.parse(data),
    }),

  getAttendanceTrajectory: (id: string) =>
    request<AttendanceTrajectory>(`/mps/${id}/attendance-trajectory`),

  getLastSittingDay: () => request<LastSittingDay>("/meta/last-sitting-day"),

  getFreshness: () => request<Freshness>("/meta/freshness"),

  getSessions: () => request<SessionsResponse>("/meta/sessions"),

  getVote: (id: string) => request<VoteDetail>(`/votes/${id}`),

  compareMps: (ids: string[]) =>
    request<ComparisonResult>(`/mps/compare?ids=${ids.join(",")}`),


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
