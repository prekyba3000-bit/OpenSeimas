import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const mps = pgTable("mps", {
  id: serial("id").primaryKey(),
  seimasId: varchar("seimas_id", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  party: varchar("party", { length: 255 }),
  socialLinks: jsonb("social_links")
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const amendmentProfiles = pgTable("amendment_profiles", {
  id: serial("id").primaryKey(),
  amendmentId: varchar("amendment_id", { length: 100 }).unique(),
  wordCount: integer("word_count"),
  legalCitationCount: integer("legal_citation_count"),
  complexityScore: real("complexity_score"),
  draftingWindowMinutes: integer("drafting_window_minutes"),
  speedAnomalyZscore: real("speed_anomaly_zscore"),
  clusterId: integer("cluster_id"),
  computedAt: timestamp("computed_at").defaultNow(),
});

export const benfordAnalyses = pgTable("benford_analyses", {
  id: serial("id").primaryKey(),
  mpId: integer("mp_id"),
  sampleSize: integer("sample_size"),
  chiSquared: real("chi_squared"),
  pValue: real("p_value"),
  mad: real("mad"),
  digitDistribution: jsonb("digit_distribution").$type<Record<string, number>>(),
  conformityLabel: varchar("conformity_label", { length: 50 }),
  flaggedFields: jsonb("flagged_fields").$type<{ field: string; mad: number }[]>(),
  computedAt: timestamp("computed_at").defaultNow(),
});

export const ownershipEdges = pgTable("ownership_edges", {
  id: serial("id").primaryKey(),
  sourceEntityCode: varchar("source_entity_code", { length: 100 }),
  targetEntityCode: varchar("target_entity_code", { length: 100 }),
  edgeType: varchar("edge_type", { length: 50 }),
  personName: varchar("person_name", { length: 255 }),
});

export const indirectLinks = pgTable("indirect_links", {
  id: serial("id").primaryKey(),
  mpId: integer("mp_id"),
  targetEntityCode: varchar("target_entity_code", { length: 100 }),
  targetEntityName: varchar("target_entity_name", { length: 255 }),
  hopCount: integer("hop_count"),
  path: jsonb("path").$type<string[]>(),
  hasProcurementHit: boolean("has_procurement_hit").default(false),
  hasDebtorHit: boolean("has_debtor_hit").default(false),
  detectedAt: timestamp("detected_at").defaultNow(),
});

export const voteGeometry = pgTable("vote_geometry", {
  id: serial("id").primaryKey(),
  voteId: integer("vote_id"),
  expectedFor: real("expected_for"),
  expectedAgainst: real("expected_against"),
  expectedAbstain: real("expected_abstain"),
  actualFor: integer("actual_for"),
  actualAgainst: integer("actual_against"),
  actualAbstain: integer("actual_abstain"),
  deviationSigma: real("deviation_sigma"),
  anomalyType: varchar("anomaly_type", { length: 50 }),
  factionDeviations: jsonb("faction_deviations").$type<Record<string, unknown>>(),
  computedAt: timestamp("computed_at").defaultNow(),
});
