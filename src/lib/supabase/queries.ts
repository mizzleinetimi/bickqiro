/**
 * Data fetching functions for Bickqr
 * All public queries filter by status='live' for RLS compliance
 */
import { createClient } from './server';
import type { Bick, Tag, BickWithAssets, Profile } from '@/types/database.types';

// ============================================================================
// TAG QUERIES (defined first as they're used by other queries)
// ============================================================================

/**
 * Get tags for a specific bick
 */
export async function getBickTags(
  bickId: string
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bick_tags')
    .select(`
      tag:tags(id, name, slug)
    `)
    .eq('bick_id', bickId);

  if (error || !data) return [];
  
  // Extract tags from the joined result
  return data
    .map((row: { tag: { id: string; name: string; slug: string } | null }) => row.tag)
    .filter((tag): tag is { id: string; name: string; slug: string } => tag !== null);
}

/**
 * Search tags by prefix for autocomplete
 */
export async function searchTags(
  prefix: string,
  excludeSlugs: string[] = [],
  limit: number = 10
): Promise<Array<{ id: string; name: string; slug: string; bick_count: number }>> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('search_tags', {
    search_prefix: prefix.toLowerCase(),
    exclude_slugs: excludeSlugs,
    result_limit: limit,
  });

  if (error) {
    console.error('Search tags error:', error);
    return [];
  }

  return (data || []) as Array<{ id: string; name: string; slug: string; bick_count: number }>;
}

/**
 * Get popular tags ordered by bick_count
 */
export async function getPopularTags(
  limit: number = 12
): Promise<Array<{ id: string; name: string; slug: string; bick_count: number }>> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_popular_tags', {
    result_limit: limit,
  });

  if (error) {
    console.error('Popular tags error:', error);
    return [];
  }

  return (data || []) as Array<{ id: string; name: string; slug: string; bick_count: number }>;
}

/**
 * Update tags for a bick (uses RPC function)
 */
export async function updateBickTags(
  bickId: string,
  tagNames: string[]
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('update_bick_tags', {
    p_bick_id: bickId,
    p_tag_names: tagNames,
  });

  if (error) {
    console.error('Update bick tags error:', error);
    throw new Error('Failed to update tags');
  }

  return (data || []) as Array<{ id: string; name: string; slug: string }>;
}

// ============================================================================
// BICK QUERIES
// ============================================================================

/**
 * Bick with assets and owner profile
 */
export interface BickWithOwner extends BickWithAssets {
  owner?: Profile | null;
  tags?: Tag[];
}

/**
 * Fetch a single bick by slug and ID
 * Returns null if not found or not live
 * Includes tags via separate query for proper join
 */
export async function getBickBySlugAndId(
  slug: string,
  id: string
): Promise<BickWithOwner | null> {
  const supabase = await createClient();
  
  const { data: bick, error } = await supabase
    .from('bicks')
    .select(`
      *,
      assets:bick_assets(*),
      owner:profiles(*)
    `)
    .eq('id', id)
    .eq('slug', slug)
    .eq('status', 'live')
    .single();

  if (error || !bick) return null;
  
  // Fetch tags separately for cleaner join
  const tags = await getBickTags(id);
  
  // Cast to proper type and add tags
  const bickWithOwner = bick as unknown as BickWithOwner;
  bickWithOwner.tags = tags as Tag[];
  
  return bickWithOwner;
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

/**
 * Fetch latest bicks for homepage
 * Returns most recently published live bicks
 */
export async function getLatestBicks(limit: number = 12): Promise<BickWithAssets[]> {
  const supabase = await createClient();
  
  const { data: bicks, error } = await supabase
    .from('bicks')
    .select(`
      *,
      assets:bick_assets(*)
    `)
    .eq('status', 'live')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !bicks) return [];
  return bicks as BickWithAssets[];
}


// ============================================================================
// SEARCH & TRENDING QUERIES
// ============================================================================

import type { SearchBick, TrendingBick, SearchCursor, TrendingCursor } from '@/types/database.types';

/**
 * Search options for full-text search
 */
export interface SearchOptions {
  query: string;
  cursor?: string;
  limit?: number;
}

/**
 * Search result with pagination
 */
export interface SearchResult {
  bicks: SearchBick[];
  nextCursor: string | null;
}

/**
 * Decode a base64 cursor into SearchCursor
 */
function decodeSearchCursor(cursor: string): SearchCursor | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed.score === 'number' && typeof parsed.id === 'string') {
      return parsed as SearchCursor;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Encode a SearchCursor to base64
 */
function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Full-text search for bicks
 * Uses PostgreSQL tsvector with weighted title (A) and description (B) search
 * Returns only live bicks, ordered by relevance
 */
export async function searchBicks(options: SearchOptions): Promise<SearchResult> {
  const { query, cursor, limit = 20 } = options;
  const supabase = await createClient();
  
  // Sanitize query - remove special characters that could break tsquery
  const sanitizedQuery = query
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(' | '); // OR logic for multi-word search
  
  if (!sanitizedQuery) {
    return { bicks: [], nextCursor: null };
  }

  // Parse cursor if provided
  let cursorData: SearchCursor | null = null;
  if (cursor) {
    cursorData = decodeSearchCursor(cursor);
  }

  // Use raw SQL for full-text search with ts_rank
  // We need to use RPC or raw query for proper tsvector search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('search_bicks', {
    search_query: sanitizedQuery,
    cursor_score: cursorData?.score ?? null,
    cursor_id: cursorData?.id ?? null,
    result_limit: limit + 1
  });

  if (error) {
    console.error('Search error:', error);
    return { bicks: [], nextCursor: null };
  }

  const results = (data || []) as SearchBick[];
  const hasMore = results.length > limit;
  const bicks = hasMore ? results.slice(0, limit) : results;
  
  let nextCursor: string | null = null;
  if (hasMore && bicks.length > 0) {
    const lastBick = bicks[bicks.length - 1];
    nextCursor = encodeSearchCursor({
      score: lastBick.search_rank ?? 0,
      id: lastBick.id
    });
  }

  return { bicks, nextCursor };
}

/**
 * Trending options for paginated trending queries
 */
export interface TrendingOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Trending result with pagination
 */
export interface TrendingResult {
  bicks: TrendingBick[];
  nextCursor: string | null;
}

/**
 * Decode a base64 cursor into TrendingCursor
 */
function decodeTrendingCursor(cursor: string): TrendingCursor | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed.rank === 'number' && typeof parsed.id === 'string') {
      return parsed as TrendingCursor;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Encode a TrendingCursor to base64
 */
function encodeTrendingCursor(cursor: TrendingCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Get trending bicks with pagination
 * Uses precomputed trending_scores table
 */
export async function getTrendingBicksPaginated(options: TrendingOptions = {}): Promise<TrendingResult> {
  const { cursor, limit = 20 } = options;
  const supabase = await createClient();
  
  // Parse cursor if provided
  let cursorData: TrendingCursor | null = null;
  if (cursor) {
    cursorData = decodeTrendingCursor(cursor);
  }

  // Build query joining bicks with trending_scores
  let query = supabase
    .from('trending_scores')
    .select(`
      score,
      rank,
      bick:bicks!inner(
        *,
        assets:bick_assets(*)
      )
    `)
    .order('rank', { ascending: true })
    .limit(limit + 1);

  // Apply cursor filter
  if (cursorData) {
    query = query.or(`rank.gt.${cursorData.rank},and(rank.eq.${cursorData.rank},bick_id.gt.${cursorData.id})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Trending query error:', error);
    return { bicks: [], nextCursor: null };
  }

  // Transform results to TrendingBick format
  const results: TrendingBick[] = (data || []).map((row: { score: number; rank: number; bick: BickWithAssets }) => ({
    ...row.bick,
    trending_score: row.score,
    trending_rank: row.rank
  }));

  const hasMore = results.length > limit;
  const bicks = hasMore ? results.slice(0, limit) : results;
  
  let nextCursor: string | null = null;
  if (hasMore && bicks.length > 0) {
    const lastBick = bicks[bicks.length - 1];
    nextCursor = encodeTrendingCursor({
      rank: lastBick.trending_rank ?? 0,
      id: lastBick.id
    });
  }

  return { bicks, nextCursor };
}

/**
 * Get top N trending bicks (for homepage)
 * Simple limit-based query without pagination
 */
export async function getTopTrendingBicks(limit: number = 6): Promise<TrendingBick[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('trending_scores')
    .select(`
      score,
      rank,
      bick:bicks!inner(
        *,
        assets:bick_assets(*)
      )
    `)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Top trending query error:', error);
    return [];
  }

  // Transform results to TrendingBick format
  return (data || []).map((row: { score: number; rank: number; bick: BickWithAssets }) => ({
    ...row.bick,
    trending_score: row.score,
    trending_rank: row.rank
  }));
}


// ============================================================================
// USER BICKS QUERIES
// ============================================================================

/**
 * User bicks options for paginated queries
 */
export interface UserBicksOptions {
  cursor?: string;
  limit?: number;
}

/**
 * User bicks result with pagination
 */
export interface UserBicksResult {
  bicks: Bick[];
  nextCursor: string | null;
}

/**
 * Get bicks owned by a specific user
 * Includes all statuses (processing, live, failed, removed)
 * Uses cursor-based pagination
 */
export async function getUserBicks(
  userId: string,
  options: UserBicksOptions = {}
): Promise<UserBicksResult> {
  const { cursor, limit = 20 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('bicks')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('User bicks query error:', error);
    return { bicks: [], nextCursor: null };
  }

  const results = (data || []) as Bick[];
  const hasMore = results.length > limit;
  const bicks = hasMore ? results.slice(0, limit) : results;

  let nextCursor: string | null = null;
  if (hasMore && bicks.length > 0) {
    nextCursor = bicks[bicks.length - 1].created_at;
  }

  return { bicks, nextCursor };
}
