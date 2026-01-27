-- Tracking Functions Migration
-- Creates RPC functions for atomic play and share count increments

-- ============================================================================
-- INCREMENT PLAY COUNT FUNCTION
-- ============================================================================
-- Atomically increments the play_count for a bick and returns the new count
-- Usage: SELECT increment_play_count('bick-uuid-here');
-- Returns: The new play_count value after increment

CREATE OR REPLACE FUNCTION increment_play_count(bick_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    UPDATE bicks 
    SET play_count = play_count + 1 
    WHERE id = bick_id 
    RETURNING play_count;
$$;

-- Grant execute permission to authenticated and anonymous users
-- This allows the tracking API to call this function
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO anon;

-- ============================================================================
-- INCREMENT SHARE COUNT FUNCTION
-- ============================================================================
-- Atomically increments the share_count for a bick and returns the new count
-- Usage: SELECT increment_share_count('bick-uuid-here');
-- Returns: The new share_count value after increment

CREATE OR REPLACE FUNCTION increment_share_count(bick_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    UPDATE bicks 
    SET share_count = share_count + 1 
    WHERE id = bick_id 
    RETURNING share_count;
$$;

-- Grant execute permission to authenticated and anonymous users
-- This allows the tracking API to call this function
GRANT EXECUTE ON FUNCTION increment_share_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_share_count(UUID) TO anon;
