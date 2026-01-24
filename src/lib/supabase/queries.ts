/**
 * Data fetching functions for Bickqr
 * All public queries filter by status='live' for RLS compliance
 */
import { createClient } from './server';
import type { Bick, Tag, BickWithAssets } from '@/types/database.types';

/**
 * Fetch a single bick by slug and ID
 * Returns null if not found or not live
 */
export async function getBickBySlugAndId(
  slug: string,
  id: string
): Promise<BickWithAssets | null> {
  const supabase = await createClient();
  
  const { data: bick, error } = await supabase
    .from('bicks')
    .select(`
      *,
      assets:bick_assets(*)
    `)
    .eq('id', id)
    .eq('slug', slug)
    .eq('status', 'live')
    .single();

  if (error || !bick) return null;
  return bick as BickWithAssets;
}

/**
 * Fetch a single bick by ID only (for embed page)
 */
export async function getBickById(id: string): Promise<BickWithAssets | null> {
  const supabase = await createClient();
  
  const { data: bick, error } = await supabase
    .from('bicks')
    .select(`
      *,
      assets:bick_assets(*)
    `)
    .eq('id', id)
    .eq('status', 'live')
    .single();

  if (error || !bick) return null;
  return bick as BickWithAssets;
}

/**
 * Fetch tag details by slug
 */
export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const supabase = await createClient();
  
  const { data: tag, error } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !tag) return null;
  return tag as Tag;
}

/**
 * Fetch paginated bicks by tag slug
 * Uses cursor pagination for efficiency
 */
export async function getBicksByTag(
  tagSlug: string,
  cursor?: string,
  limit: number = 20
): Promise<{ bicks: Bick[]; nextCursor: string | null }> {
  const supabase = await createClient();
  
  // First get the tag
  const tagResult = await supabase
    .from('tags')
    .select('id')
    .eq('slug', tagSlug)
    .single<{ id: string }>();

  if (tagResult.error || !tagResult.data) return { bicks: [], nextCursor: null };

  const tagId = tagResult.data.id;

  // Get bick IDs for this tag
  const bickTagsResult = await supabase
    .from('bick_tags')
    .select('bick_id')
    .eq('tag_id', tagId)
    .returns<{ bick_id: string }[]>();

  if (bickTagsResult.error || !bickTagsResult.data || bickTagsResult.data.length === 0) {
    return { bicks: [], nextCursor: null };
  }

  const bickIds = bickTagsResult.data.map(bt => bt.bick_id);

  // Build query with cursor pagination
  let query = supabase
    .from('bicks')
    .select('*')
    .in('id', bickIds)
    .eq('status', 'live')
    .order('published_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('published_at', cursor);
  }

  const { data: bicks, error } = await query;

  if (error || !bicks) return { bicks: [], nextCursor: null };

  const bicksList = bicks as Bick[];
  const hasMore = bicksList.length > limit;
  const results = hasMore ? bicksList.slice(0, limit) : bicksList;
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].published_at : null;

  return { bicks: results, nextCursor };
}

/**
 * Fetch live bicks for sitemap generation
 * Uses cursor pagination for large datasets
 */
export async function getLiveBicksForSitemap(
  cursor?: string,
  limit: number = 1000
): Promise<{ bicks: Pick<Bick, 'id' | 'slug' | 'updated_at'>[]; nextCursor: string | null }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('bicks')
    .select('id, slug, updated_at')
    .eq('status', 'live')
    .order('id', { ascending: true })
    .limit(limit + 1);

  if (cursor) {
    query = query.gt('id', cursor);
  }

  const { data: bicks, error } = await query;

  if (error || !bicks) return { bicks: [], nextCursor: null };

  type SitemapBick = Pick<Bick, 'id' | 'slug' | 'updated_at'>;
  const bicksList = bicks as SitemapBick[];
  const hasMore = bicksList.length > limit;
  const results = hasMore ? bicksList.slice(0, limit) : bicksList;
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

  return { bicks: results, nextCursor };
}

/**
 * Fetch all tags for sitemap
 */
export async function getAllTags(): Promise<Tag[]> {
  const supabase = await createClient();
  
  const { data: tags, error } = await supabase
    .from('tags')
    .select('*')
    .gt('bick_count', 0)
    .order('name', { ascending: true });

  if (error || !tags) return [];
  return tags as Tag[];
}

/**
 * Fetch trending bicks for homepage/trending page
 */
export async function getTrendingBicks(limit: number = 10): Promise<Bick[]> {
  const supabase = await createClient();
  
  const { data: bicks, error } = await supabase
    .from('bicks')
    .select('*')
    .eq('status', 'live')
    .order('play_count', { ascending: false })
    .limit(limit);

  if (error || !bicks) return [];
  return bicks as Bick[];
}
