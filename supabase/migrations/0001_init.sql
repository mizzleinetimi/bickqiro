-- Bickqr Initial Schema Migration
-- Creates all core tables, indexes, RLS policies, and triggers

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- ============================================================================
-- BICKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'processing' 
        CHECK (status IN ('processing', 'live', 'failed', 'removed')),
    duration_ms INTEGER,
    play_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    original_filename TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    -- Full-text search vector (auto-generated)
    title_search TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', COALESCE(title, ''))) STORED,
    -- Unique constraint for URL: /bick/[slug]-[id]
    CONSTRAINT bicks_slug_id_unique UNIQUE (id, slug)
);

-- Bicks indexes
CREATE INDEX IF NOT EXISTS bicks_slug_idx ON bicks(slug);
CREATE INDEX IF NOT EXISTS bicks_owner_id_idx ON bicks(owner_id);
CREATE INDEX IF NOT EXISTS bicks_status_idx ON bicks(status);
CREATE INDEX IF NOT EXISTS bicks_created_at_idx ON bicks(created_at DESC);
CREATE INDEX IF NOT EXISTS bicks_published_at_idx ON bicks(published_at DESC);
CREATE INDEX IF NOT EXISTS bicks_title_search_idx ON bicks USING GIN(title_search);

-- ============================================================================
-- BICK_ASSETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bick_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bick_id UUID NOT NULL REFERENCES bicks(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL 
        CHECK (asset_type IN ('original', 'audio', 'waveform_json', 'og_image', 'teaser_mp4', 'thumbnail')),
    storage_key TEXT,
    cdn_url TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bick assets indexes
CREATE INDEX IF NOT EXISTS bick_assets_bick_id_idx ON bick_assets(bick_id);
CREATE INDEX IF NOT EXISTS bick_assets_type_idx ON bick_assets(asset_type);


-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    bick_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags indexes
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);
CREATE INDEX IF NOT EXISTS tags_slug_idx ON tags(slug);

-- ============================================================================
-- BICK_TAGS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bick_tags (
    bick_id UUID NOT NULL REFERENCES bicks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (bick_id, tag_id)
);

-- Bick tags indexes
CREATE INDEX IF NOT EXISTS bick_tags_bick_id_idx ON bick_tags(bick_id);
CREATE INDEX IF NOT EXISTS bick_tags_tag_id_idx ON bick_tags(tag_id);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bick_id UUID NOT NULL REFERENCES bicks(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports indexes
CREATE INDEX IF NOT EXISTS reports_bick_id_idx ON reports(bick_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set published_at when status changes to 'live'
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'live' AND (OLD.status IS NULL OR OLD.status != 'live') THEN
        NEW.published_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Profiles updated_at trigger
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Bicks updated_at trigger
DROP TRIGGER IF EXISTS bicks_updated_at ON bicks;
CREATE TRIGGER bicks_updated_at
    BEFORE UPDATE ON bicks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Bicks published_at trigger
DROP TRIGGER IF EXISTS bicks_published_at ON bicks;
CREATE TRIGGER bicks_published_at
    BEFORE UPDATE ON bicks
    FOR EACH ROW
    EXECUTE FUNCTION set_published_at();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bick_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bick_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Public can read all profiles
CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_owner_update" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for signup flow)
CREATE POLICY "profiles_owner_insert" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- BICKS POLICIES
-- ============================================================================

-- Public can only read live bicks
CREATE POLICY "bicks_public_read" ON bicks
    FOR SELECT
    USING (status = 'live');

-- Authenticated users can read their own bicks (any status)
CREATE POLICY "bicks_owner_read" ON bicks
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Authenticated users can insert their own bicks
CREATE POLICY "bicks_auth_insert" ON bicks
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own bicks
CREATE POLICY "bicks_owner_update" ON bicks
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their own bicks
CREATE POLICY "bicks_owner_delete" ON bicks
    FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================================================
-- BICK_ASSETS POLICIES
-- ============================================================================

-- Public can only read assets for live bicks
CREATE POLICY "bick_assets_public_read" ON bick_assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_assets.bick_id 
            AND bicks.status = 'live'
        )
    );

-- Owners can read their own bick assets (any status)
CREATE POLICY "bick_assets_owner_read" ON bick_assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_assets.bick_id 
            AND bicks.owner_id = auth.uid()
        )
    );

-- Service role can insert assets (used by worker)
CREATE POLICY "bick_assets_service_insert" ON bick_assets
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_assets.bick_id 
            AND bicks.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- TAGS POLICIES
-- ============================================================================

-- Public can read all tags
CREATE POLICY "tags_public_read" ON tags
    FOR SELECT
    USING (true);

-- Service role handles tag creation (via functions or admin)
CREATE POLICY "tags_service_insert" ON tags
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- BICK_TAGS POLICIES
-- ============================================================================

-- Public can only read tags for live bicks
CREATE POLICY "bick_tags_public_read" ON bick_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_tags.bick_id 
            AND bicks.status = 'live'
        )
    );

-- Owners can read their own bick tags
CREATE POLICY "bick_tags_owner_read" ON bick_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_tags.bick_id 
            AND bicks.owner_id = auth.uid()
        )
    );

-- Owners can manage tags for their bicks
CREATE POLICY "bick_tags_owner_insert" ON bick_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_tags.bick_id 
            AND bicks.owner_id = auth.uid()
        )
    );

CREATE POLICY "bick_tags_owner_delete" ON bick_tags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM bicks 
            WHERE bicks.id = bick_tags.bick_id 
            AND bicks.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

-- Anyone can insert a report (authenticated or anonymous via anon key)
CREATE POLICY "reports_anyone_insert" ON reports
    FOR INSERT
    WITH CHECK (true);

-- No public read policy = reports are not publicly readable
-- Service role bypasses RLS for admin access
