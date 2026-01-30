-- Migration: Saved Bicks
-- Allows users to save/bookmark bicks

-- Create saved_bicks table
CREATE TABLE IF NOT EXISTS saved_bicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bick_id UUID NOT NULL REFERENCES bicks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, bick_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_bicks_user_id ON saved_bicks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_bicks_bick_id ON saved_bicks(bick_id);
CREATE INDEX IF NOT EXISTS idx_saved_bicks_created_at ON saved_bicks(created_at DESC);

-- Enable RLS
ALTER TABLE saved_bicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own saved bicks
CREATE POLICY "Users can view own saved bicks"
  ON saved_bicks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save bicks
CREATE POLICY "Users can save bicks"
  ON saved_bicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own bicks
CREATE POLICY "Users can unsave own bicks"
  ON saved_bicks FOR DELETE
  USING (auth.uid() = user_id);
