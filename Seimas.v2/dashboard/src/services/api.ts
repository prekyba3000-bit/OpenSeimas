import { API_URL as ConfigApiUrl } from "../config";

const API_BASE = `${ConfigApiUrl}/api`;

// ── Response types matching backend ──────────────────────────────────────────

export interface DashboardStats {
  total_mps: number;
  historical_votes: string;
  individual_votes: string;
  accuracy: string;
}

export interface ActivityItem {
  name: string;
  action: string;
  context: string;
  time: string;
}

export interface MpSummary {
  id: string;
  name: string;
  normalized_name: string;
  party: string;
  is_active: boolean;
  photo_url: string;
  vote_count: number;
  attendance: number;
  vote_mode: string | null;
}

export interface MpDetail {
  id: string;
  name: string;
  party: string;
  photo: string;
  active: boolean;
  seimas_id: number | null;
  vote_count: number;
}

export interface MpVoteRecord {
  title: string;
  date: string;
  choice: string;
}

export interface VoteSummary {
  id: string;
  date: string;
  title: string;
  result: string | null;
}

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
  hero_evidence: string[];
  watch_evidence: string[];
  rank: number;
}

export interface HeroesVillainsResponse {
  generated_at: string;
  window_days: number;
  heroes: AccountabilityPerson[];
  watchlist: AccountabilityPerson[];
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

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, detail);
  }

  return response.json();
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

  getHeroesVillains: (limit = 10) =>
    request<HeroesVillainsResponse>(`/accountability/heroes-villains?limit=${limit}`),

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
