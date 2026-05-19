-- =================================================================
-- Order Portal - Add Notes Column
-- =================================================================
-- Run this ONCE in Supabase SQL Editor to add the notes column.
-- Goes to: Supabase dashboard > SQL Editor > New query > paste > Run

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Done!
