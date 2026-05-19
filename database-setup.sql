-- =================================================================
-- Order Portal - Database Setup
-- =================================================================
-- Copy this entire file and paste into Supabase SQL Editor, then click Run.
-- Goes to: Supabase dashboard > SQL Editor > New query > paste > Run

-- 1. Create the tickets table
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL,
  autotask_link TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the items table (linked to tickets)
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  acquired BOOLEAN DEFAULT FALSE,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Turn on row-level security (so only logged-in users can see/edit data)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 4. Allow any signed-in user (your team) to read and write all tickets/items
-- This is a "shared team" model — everyone on your team sees everything.
CREATE POLICY "Authenticated users can view all tickets"
  ON tickets FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create tickets"
  ON tickets FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets"
  ON tickets FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tickets"
  ON tickets FOR DELETE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all items"
  ON items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create items"
  ON items FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update items"
  ON items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete items"
  ON items FOR DELETE
  TO authenticated USING (true);

-- Done! Your database is ready.
