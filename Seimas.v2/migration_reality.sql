-- MISSION: REALITY SYNC - Database Upgrade
-- Purpose: Add photo URLs, active status tracking, and sync timestamps

ALTER TABLE politicians ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP DEFAULT NOW();

-- Index for faster filtering of active MPs
CREATE INDEX IF NOT EXISTS idx_politicians_active ON politicians(is_active);
