/**
 * Trust-floor client (V.4 Phase 1) — backend/routes_trust.py public endpoints.
 *
 * The public corrections log never carries reporter_email: the backend omits it
 * from the SELECT, and CorrectionEntry has no field for it, so it cannot render.
 */
import { request } from "./api";

export type CorrectionStatus = "open" | "accepted" | "rejected" | "resolved";

/** entity_type values accepted by POST /api/trust/corrections. */
export const ENTITY_TYPES = [
  "mp",
  "vote",
  "bill",
  "topic_tag",
  "summary",
  "metric",
  "other",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export interface CorrectionEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  description: string;
  status: CorrectionStatus;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface CorrectionSubmission {
  entity_type: EntityType;
  entity_id: string;
  description: string;
  reporter_email?: string;
  /** Honeypot: rendered off-screen, must stay empty. Filled ⇒ backend discards silently. */
  website?: string;
}

export interface MethodologyVersion {
  metric_key: string;
  version: number;
  title_lt: string;
  body_lt: string;
  announced_at: string | null;
  effective_from: string;
}

export interface SummaryRevision {
  revision: number;
  body_lt: string;
  editor: string;
  note: string | null;
  created_at: string;
}

export interface MpReply {
  id: string;
  subject_type: string;
  subject_ref: string | null;
  body_lt: string;
  verified: boolean;
  created_at: string;
}

// Envelope shapes — verified against the live API, not assumed.
export interface CorrectionsLogResponse {
  generated_at: string;
  count: number;
  corrections: CorrectionEntry[];
}

/** `current` is the newest version; `history` holds the older ones. */
export interface MethodologyResponse {
  metric_key: string;
  current: MethodologyVersion;
  history: MethodologyVersion[];
}

export interface SummaryHistoryResponse {
  entity_type: string;
  entity_id: string;
  revisions: SummaryRevision[];
}

export interface MpRepliesResponse {
  politician_id: string;
  replies: MpReply[];
}

export const trustApi = {
  /** Non-idempotent: retries: 0 so a slow network cannot double-submit. */
  submitCorrection: (payload: CorrectionSubmission) =>
    request<{ status: string; id?: string; created_at?: string }>("/trust/corrections", {
      method: "POST",
      body: payload,
      retries: 0,
    }),

  listCorrections: (limit = 50) =>
    request<CorrectionsLogResponse>(`/trust/corrections?limit=${limit}`),

  /** 404 (ApiError) when the metric has no published methodology — that is the empty case. */
  getMethodology: (metricKey: string) =>
    request<MethodologyResponse>(`/trust/methodology/${encodeURIComponent(metricKey)}`),

  getSummaryHistory: (entityType: string, entityId: string) =>
    request<SummaryHistoryResponse>(
      `/trust/summary-history/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    ),

  /** Backend returns verified replies only. */
  getMpReplies: (mpId: string) =>
    request<MpRepliesResponse>(`/trust/replies/${encodeURIComponent(mpId)}`),
};
