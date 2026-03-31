/**
 * Shared wire DTO shapes for Seimas public API responses.
 * @see docs/adr/0002-shared-typescript-contracts.md
 */

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
