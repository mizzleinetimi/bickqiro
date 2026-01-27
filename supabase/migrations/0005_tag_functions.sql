-- Tag Functions Migration
-- Creates trigger and helper functions for tag management

-- ============================================================================
-- TAG COUNT TRIGGER FUNCTION
-- ============================================================================
-- Automatically updates tag bick_count when bick_tags change

CREATE OR REPLACE FUNCTION update_tag_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET bick_count = bick_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET bick_count = GREATEST(0, bick_count - 1) WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for bick_tags changes
DROP TRIGGER IF EXISTS bick_tags_count_trigger ON bick_tags;
CREATE TRIGGER bick_tags_count_trigger
    AFTER INSERT OR DELETE ON bick_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_count();

-- ============================================================================
-- SEARCH TAGS FUNCTION
-- ============================================================================
-- Search tags by prefix for autocomplete, ordered by popularity

CREATE OR REPLACE FUNCTION search_tags(
    search_prefix TEXT,
    exclude_slugs TEXT[] DEFAULT '{}',
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    bick_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.slug, t.bick_count
    FROM tags t
    WHERE t.slug LIKE lower(search_prefix) || '%'
      AND NOT (t.slug = ANY(exclude_slugs))
    ORDER BY t.bick_count DESC, t.name ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_tags(TEXT, TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_tags(TEXT, TEXT[], INTEGER) TO anon;

-- ============================================================================
-- GET OR CREATE TAG FUNCTION
-- ============================================================================
-- Upsert logic for tags - returns existing tag ID or creates new one

CREATE OR REPLACE FUNCTION get_or_create_tag(
    tag_name TEXT,
    tag_slug TEXT
)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    -- Try to get existing tag
    SELECT id INTO result_id FROM tags WHERE slug = tag_slug;
    
    -- Create if not exists
    IF result_id IS NULL THEN
        INSERT INTO tags (name, slug, bick_count) 
        VALUES (tag_name, tag_slug, 0)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO result_id;
    END IF;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_tag(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- UPDATE BICK TAGS FUNCTION
-- ============================================================================
-- Atomically update all tags for a bick

CREATE OR REPLACE FUNCTION update_bick_tags(
    p_bick_id UUID,
    p_tag_names TEXT[]
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT
) AS $$
DECLARE
    tag_name TEXT;
    tag_slug TEXT;
    tag_id UUID;
BEGIN
    -- Delete existing tags for this bick
    DELETE FROM bick_tags WHERE bick_id = p_bick_id;
    
    -- Add new tags
    IF p_tag_names IS NOT NULL AND array_length(p_tag_names, 1) > 0 THEN
        FOREACH tag_name IN ARRAY p_tag_names
        LOOP
            -- Generate slug from name (lowercase, replace spaces with hyphens)
            tag_slug := lower(regexp_replace(trim(tag_name), '\s+', '-', 'g'));
            
            -- Skip empty tags
            IF tag_slug = '' THEN
                CONTINUE;
            END IF;
            
            -- Get or create the tag
            tag_id := get_or_create_tag(trim(tag_name), tag_slug);
            
            -- Link tag to bick
            INSERT INTO bick_tags (bick_id, tag_id) 
            VALUES (p_bick_id, tag_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- Return the updated tags
    RETURN QUERY
    SELECT t.id, t.name, t.slug
    FROM tags t
    JOIN bick_tags bt ON bt.tag_id = t.id
    WHERE bt.bick_id = p_bick_id
    ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_bick_tags(UUID, TEXT[]) TO authenticated;

-- ============================================================================
-- GET POPULAR TAGS FUNCTION
-- ============================================================================
-- Get popular tags ordered by bick_count

CREATE OR REPLACE FUNCTION get_popular_tags(
    result_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    bick_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.slug, t.bick_count
    FROM tags t
    WHERE t.bick_count > 0
    ORDER BY t.bick_count DESC, t.name ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_popular_tags(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_tags(INTEGER) TO anon;
