-- Upload Pipeline Schema Migration
-- Adds columns and updates policies to support the upload pipeline feature
-- Requirements: 10.1, 10.2, 10.3, 10.4

-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================

-- Add source_url for URL extraction attribution (Requirement 10.1)
ALTER TABLE bicks ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add original_duration_ms for tracking pre-trim duration (Requirement 10.2)
ALTER TABLE bicks ADD COLUMN IF NOT EXISTS original_duration_ms INTEGER;

-- ============================================================================
-- MODIFY EXISTING COLUMNS
-- ============================================================================

-- Make owner_id nullable for anonymous uploads (Requirement 10.3)
ALTER TABLE bicks ALTER COLUMN owner_id DROP NOT NULL;

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop the existing authenticated-only insert policy
DROP POLICY IF EXISTS "bicks_auth_insert" ON bicks;

-- Create new policy allowing anonymous inserts (Requirement 10.4)
-- This allows both authenticated and anonymous users to create bicks
CREATE POLICY "bicks_insert" ON bicks
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for source_url lookups (for attribution queries)
CREATE INDEX IF NOT EXISTS bicks_source_url_idx ON bicks (source_url) WHERE source_url IS NOT NULL;
