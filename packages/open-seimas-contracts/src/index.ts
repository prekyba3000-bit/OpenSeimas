/**
 * Shared wire DTO shapes for Seimas public API responses.
 * @see docs/adr/0002-shared-typescript-contracts.md
 */

export interface DashboardStats {
  /**
   * Constitutional size of the Seimas (141, Article 55). A constant, not a row
   * count — seats can be vacant without the chamber changing size.
   */
  seats_total: number;
  /** Members whose mandate covers today (~140). Use this for "Seimo nariai". */
  mps_active: number;
  /**
   * Everyone who held a mandate this term (148), including replaced members
   * and the four who resigned the day they were sworn in. Historical total —
   * never label this as the number of MPs.
   */
  mps_all_time: number;
  /** seats_total - mps_active, floored at 0. */
  seats_vacant: number;
  /** @deprecated Misnamed: always carried the active count. Use mps_active. */
  total_mps: number;
  historical_votes: string;
  individual_votes: string;
  /** Distinct sitting days covered by the ingested votes. */
  sitting_days: number;
}

export interface ActivityItem {
  name: string;
  /**
   * The raw Lithuanian vote choice („Prieš" / „Susilaikė"). Prefer this: the
   * client composes the sentence, so no English reaches a Lithuanian page.
   */
  vote_choice?: string;
  /** @deprecated Server-composed English ("Voted Susilaikė"). Use vote_choice. */
  action: string;
  context: string;
  time: string;
}

export interface MpSummary {
  id: string;
  name: string;
  normalized_name: string;
  party: string;
  /** Mandate covers today. Prefer asking the API for ?status=active. */
  is_active: boolean;
  photo_url: string;
  vote_count: number;
  /**
   * Null when no percentage is publishable — a member whose mandate covers
   * fewer than three sitting days. Never 0: that reads as "never showed up"
   * rather than "not enough data", and four members are in that position.
   */
  attendance: number | null;
  vote_mode: string | null;
  /** ISO date the mandate began. */
  mandate_start_date?: string | null;
  /** ISO date the mandate ended; null while still serving. */
  mandate_end_date?: string | null;
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
