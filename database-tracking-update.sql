-- =================================================================
-- Order Portal - Tracking Columns Update
-- =================================================================
-- Run this ONCE in the Supabase SQL Editor to add tracking columns.
-- Goes to: Supabase dashboard > SQL Editor > New query > paste > Run

-- Add tracking columns to existing items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS tracking_status TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMPTZ;

-- Done!
