-- Search & Trending Migration
-- Adds description search vector and trending scores table

-- ============================================================================
-- DESCRIPTION SEARCH VECTOR
-- ============================================================================

-- Add description_search tsvector column to bicks table
ALTER TABLE bicks ADD COLUMN IF NOT EXISTS 
  description_search TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(description, ''))
  ) STORED;

-- Create index for description search
CREATE INDEX IF NOT EXISTS bicks_description_search_idx 
  ON bicks USING GIN(description_search);

-- Create combined search index (title weighted higher than description)
-- This allows efficient combined search queries
CREATE INDEX IF NOT EXISTS bicks_combined_search_idx 
  ON bicks USING GIN ((
    setweight(title_search, 'A') || 
    setweight(description_search, 'B')
  ));

-- ============================================================================
-- TRENDING SCORES TABLE
-- ============================================================================

-- Create trending_scores table for precomputed rankings
CREATE TABLE IF NOT EXISTS trending_scores (
  bick_id UUID PRIMARY KEY REFERENCES bicks(id) ON DELETE CASCADE,
  score DECIMAL(12, 4) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient trending queries (order by rank)
CREATE INDEX IF NOT EXISTS trending_scores_rank_idx 
  ON trending_scores(rank ASC);

-- Index for score-based queries
CREATE INDEX IF NOT EXISTS trending_scores_score_idx 
  ON trending_scores(score DESC);

-- ============================================================================
-- ROW LEVEL SECURITY FOR TRENDING_SCORES
-- ============================================================================

-- Enable RLS
ALTER TABLE trending_scores ENABLE ROW LEVEL SECURITY;

-- Public can read all trending scores
CREATE POLICY "trending_scores_public_read" ON trending_scores
  FOR SELECT USING (true);

-- Service role handles inserts/updates (via worker)
-- No insert/update policies needed for public - worker uses service role


-- ============================================================================
-- SEARCH RPC FUNCTION
-- ============================================================================

-- Function to search bicks with full-text search and cursor pagination
CREATE OR REPLACE FUNCTION search_bicks(
  search_query TEXT,
  cursor_score FLOAT DEFAULT NULL,
  cursor_id UUID DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  status TEXT,
  duration_ms INTEGER,
  original_duration_ms INTEGER,
  play_count INTEGER,
  share_count INTEGER,
  original_filename TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  search_rank FLOAT,
  assets JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_bicks AS (
    SELECT 
      b.id,
      b.owner_id,
      b.slug,
      b.title,
      b.description,
      b.status::TEXT,
      b.duration_ms,
      b.original_duration_ms,
      b.play_count,
      b.share_count,
      b.original_filename,
      b.source_url,
      b.created_at,
      b.updated_at,
      b.published_at,
      ts_rank(
        setweight(b.title_search, 'A') || setweight(b.description_search, 'B'),
        to_tsquery('english', search_query)
      ) AS search_rank
    FROM bicks b
    WHERE 
      b.status = 'live'
      AND (
        b.title_search @@ to_tsquery('english', search_query)
        OR b.description_search @@ to_tsquery('english', search_query)
      )
  ),
  filtered_bicks AS (
    SELECT rb.*
    FROM ranked_bicks rb
    WHERE 
      cursor_score IS NULL 
      OR rb.search_rank < cursor_score
      OR (rb.search_rank = cursor_score AND rb.id > cursor_id)
    ORDER BY rb.search_rank DESC, rb.id ASC
    LIMIT result_limit
  )
  SELECT 
    fb.id,
    fb.owner_id,
    fb.slug,
    fb.title,
    fb.description,
    fb.status,
    fb.duration_ms,
    fb.original_duration_ms,
    fb.play_count,
    fb.share_count,
    fb.original_filename,
    fb.source_url,
    fb.created_at,
    fb.updated_at,
    fb.published_at,
    fb.search_rank,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ba.id,
            'bick_id', ba.bick_id,
            'asset_type', ba.asset_type,
            'storage_key', ba.storage_key,
            'cdn_url', ba.cdn_url,
            'mime_type', ba.mime_type,
            'size_bytes', ba.size_bytes,
            'metadata', ba.metadata,
            'created_at', ba.created_at
          )
        )
        FROM bick_assets ba
        WHERE ba.bick_id = fb.id
      ),
      '[]'::jsonb
    ) AS assets
  FROM filtered_bicks fb;
END;
$$;
