/**
 * SeimasOS Type Definitions
 * 
 * Maps the PostgreSQL schema to TypeScript interfaces for the frontend application.
 * Includes "Esports" meta-types for the gamified dashboard interface.
 */

// --- Enums & Constants ---

export type VoteResultType = 'Accepted' | 'Rejected' | 'Other';
export type VoteAction = 'For' | 'Against' | 'Abstain' | 'Missed';
export type RankTier = 'Challenger' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Iron';

// --- Core Entities (Database Mirrors) ---

/**
 * Mapped from table: `politicians`
 */
export interface MP {
  id: string; // UUID
  seimas_id: string; // Official Parliament ID (e.g., P145)
  name: string;
  party: string;
  
  // Derived / UI Fields
  photo_url: string;
  party_color: string; // Hex code
  is_active: boolean;
  
  // Flavor Text
  archetype?: 'The Maverick' | 'Party Soldier' | 'The Ghost' | 'Iron Man';
}

/**
 * Mapped from table: `votes`
 */
export interface Vote {
  id: string; // UUID
  legislation_id?: string; // Reference to bill
  title: string;
  description?: string;
  date: string; // ISO Date String
  session_id?: string;
  
  // Computed Status
  result_type: VoteResultType;
  status_badge: string; // Localized string (e.g., "Priimta")
}

/**
 * Mapped from table: `assets`
 */
export interface Asset {
  id: string;
  politician_id: string;
  year: number;
  value: number; // In Euros
  type: 'Real Estate' | 'Securities' | 'Cash' | 'Other';
  description?: string;
}

/**
 * Mapped from table: `politician_votes`
 * Represents a single "Kill/Assist" in a match
 */
export interface CastVote {
  id: string;
  vote_id: string;
  politician_id: string;
  action: VoteAction;
  is_rebellion: boolean; // True if voted against party majority
}

// --- Esports Derived Types (The "Meta") ---

/**
 * Aggregated statistics for an MP
 * Visualization: Hexagon/Radar Chart Data
 */
export interface PlayerStats {
  // Base Stats
  attendance_rate: number; // 0-100
  participation_rate: number; // 0-100 (Votes cast / Total votes)
  
  // Advanced Metrics
  rebellion_rate: number; // % of votes against party line
  loyalty_rate: number;   // % of votes with party line
  
  // "Gamer" Metrics
  kda_ratio: number; // (Votes For + Votes Against) / Sessions Missed
  win_rate: number;  // % of times their vote matched the final outcome
  
  // Economy
  net_worth: number; // Total assets value
  delta_net_worth: number; // Change since last year
}

/**
 * Result of a specific Vote Session ("Match")
 */
export interface MatchResult {
  vote_id: string;
  winning_side: 'For' | 'Against' | 'Draw';
  
  // The Scoreboard
  total_votes: number;
  stats: {
    for: number;
    against: number;
    abstain: number;
    missed: number;
  };
  
  // Highlights
  turnout_percentage: number;
  party_breakdown: Record<string, { for: number; against: number; abstain: number }>;
}

/**
 * The Leaderboard Entry
 */
export interface RankedEntry {
  rank: number;
  mp: MP;
  tier: RankTier;
  score: number; // Composite score for sorting
  trend: 'up' | 'down' | 'stable';
}

// --- API Responses ---

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
