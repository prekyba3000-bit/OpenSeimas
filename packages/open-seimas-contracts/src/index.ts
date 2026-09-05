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
  /**
   * The sitting date, or null. `votes.sitting_date` is a nullable column and
   * this was built with a bare `str()`, so a null would have arrived as the
   * four characters „None" — a plausible-looking value in a date slot.
   */
  time: string | null;
}

/**
 * `?:` on the nullable fields is a tsc workaround, not a claim that the key can
 * be absent — /api/mps sends every one of them on every row.
 *
 * `dashboard/tsconfig.json` sets `strict: false`, so with strictNullChecks off
 * `z.infer` renders `z.string().nullable()` as `party?: string`. A field
 * declared required here then cannot be satisfied by the schema that parses it,
 * and `mpSummaryListSchema.parse()` fails to typecheck against `MpSummary[]`.
 * Optional-and-nullable is the shape that survives both readings; the same
 * workaround is why the mandate dates below are written that way.
 */
export interface MpSummary {
  id: string;
  name: string;
  normalized_name: string;
  /**
   * The parliamentary FACTION, not the nominating party — those became
   * separate columns on 2026-09-04.
   *
   * Null when the member sits in no faction: the Speaker steps out of his for
   * the term, and former members left theirs when the mandate ended. That is 9
   * of 148 today. This field was declared `string` while the API sent null for
   * all nine, and because the endpoint had no runtime schema nothing failed —
   * the value simply rendered as itself. Render through `faction.ts`.
   */
  party?: string | null;
  /**
   * Mandate covers today. Prefer asking the API for ?status=active: that
   * filter is derived from the mandate dates, so it cannot drift the way this
   * stored boolean can. Nullable, as the column is.
   */
  is_active?: boolean | null;
  photo_url?: string | null;
  /**
   * Sent by the API, read by no client today. Present so a schema declaring
   * this shape does not strip it off the wire.
   */
  social_links?: Record<string, unknown>;
  vote_count: number;
  /**
   * Null when no percentage is publishable — a member whose mandate covers
   * fewer than three sitting days. Never 0: that reads as "never showed up"
   * rather than "not enough data", and four members are in that position.
   */
  attendance?: number | null;
  vote_mode?: string | null;
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
  /** `votes.title` is nullable. */
  title: string | null;
  /** `votes.sitting_date` is nullable. See ActivityItem.time. */
  date: string | null;
  choice: string;
}

export interface VoteSummary {
  id: string;
  /** `votes.sitting_date` is nullable. See ActivityItem.time. */
  date: string | null;
  /** `votes.title` is nullable. */
  title: string | null;
  /** `result_type` is null on all 5,286 rows — the source does not supply it. */
  result: string | null;
}
