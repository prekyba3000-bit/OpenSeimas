-- Migration 003: add politicians.last_synced_at
--
-- Backfills a schema column that existed on the local dev DB (added via
-- ad-hoc ALTER earlier in dev) but was never captured in schema.sql or
-- any migration. Referenced by:
--   - sync_real_mps.py (SET last_synced_at = NOW())
--   - mp_leaderboard_metrics MV (migrations 014, 015)
--
-- Discovered when bootstrapping a fresh Render Postgres: migration 014
-- failed with "column p.last_synced_at does not exist". IF NOT EXISTS
-- keeps this no-op on DBs that already have the column.

ALTER TABLE politicians
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP DEFAULT NOW();
