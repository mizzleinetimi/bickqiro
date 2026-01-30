-- Search Tags Migration
-- Updates search_bicks function to use ILIKE for flexible partial matching
-- Also searches by tag names

-- ============================================================================
-- UPDATED SEARCH RPC FUNCTION WITH ILIKE + TAG SUPPORT
-- ============================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS search_bicks(text, double precision, uuid, integer);

-- Recreate the function with ILIKE search
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
DECLARE
  search_pattern TEXT;
BEGIN
  -- Convert "word1 | word2" back to a simple search pattern
  -- Remove the OR operators and create a LIKE pattern
  search_pattern := '%' || LOWER(REPLACE(REPLACE(search_query, ' | ', ' '), ' ', '%')) || '%';
  
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
      -- Score: title match = 1.0, description match = 0.5, tag match = 0.3
      -- Cast to FLOAT to match return type
      (CASE 
        WHEN LOWER(b.title) LIKE search_pattern THEN 1.0
        WHEN LOWER(COALESCE(b.description, '')) LIKE search_pattern THEN 0.5
        WHEN EXISTS (
          SELECT 1 FROM bick_tags bt
          JOIN tags t ON t.id = bt.tag_id
          WHERE bt.bick_id = b.id
          AND LOWER(t.name) LIKE search_pattern
        ) THEN 0.3
        ELSE 0.1
      END)::FLOAT AS search_rank
    FROM bicks b
    WHERE 
      b.status = 'live'
      AND (
        LOWER(b.title) LIKE search_pattern
        OR LOWER(COALESCE(b.description, '')) LIKE search_pattern
        OR EXISTS (
          SELECT 1 FROM bick_tags bt
          JOIN tags t ON t.id = bt.tag_id
          WHERE bt.bick_id = b.id
          AND LOWER(t.name) LIKE search_pattern
        )
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
