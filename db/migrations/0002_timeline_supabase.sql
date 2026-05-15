-- Migration 0002: timeline Supabase columns
-- Keep timeline events aligned with the client-facing Memory model.

ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS image_url text;
