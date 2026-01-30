-- Migration: Device-based Favorites (no auth required)
-- For hackathon demo - allows favorites without login

-- Create device_favorites table
CREATE TABLE IF NOT EXISTS device_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  bick_id UUID NOT NULL REFERENCES bicks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, bick_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_device_favorites_device_id ON device_favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_device_favorites_bick_id ON device_favorites(bick_id);
CREATE INDEX IF NOT EXISTS idx_device_favorites_created_at ON device_favorites(created_at DESC);

-- Enable RLS but allow all operations (device ID is the "auth")
ALTER TABLE device_favorites ENABLE ROW LEVEL SECURITY;

-- Allow all operations - device_id acts as the identifier
CREATE POLICY "Allow all device favorites operations"
  ON device_favorites FOR ALL
  USING (true)
  WITH CHECK (true);
