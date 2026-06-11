-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- Adds the column the portal uses to know WHEN a ticket was finished,
-- which drives the auto-archiving of previous-month completions.
alter table tickets add column if not exists completed_at timestamptz;
