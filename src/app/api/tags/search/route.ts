/**
 * GET /api/tags/search
 * 
 * Search for tags by prefix for autocomplete.
 * Returns up to 10 results ordered by bick_count descending.
 * 
 * @requirements 9.1, 3.1, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TagSuggestion {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

interface TagSearchResponse {
  success: true;
  tags: TagSuggestion[];
}

interface TagSearchErrorResponse {
  success: false;
  error: string;
}

type SearchResponse = TagSearchResponse | TagSearchErrorResponse;

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const excludeParam = searchParams.get('exclude');
    
    // Parse limit (default 10, max 20)
    let limit = 10;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
        limit = parsed;
      }
    }
    
    // Parse exclude slugs
    const excludeSlugs = excludeParam ? excludeParam.split(',').filter(Boolean) : [];
    
    // Return empty results for empty or too short query
    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        tags: [],
      });
    }
    
    const supabase = await createClient();
    
    // Call the search_tags function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('search_tags', {
      search_prefix: query.toLowerCase(),
      exclude_slugs: excludeSlugs,
      result_limit: limit,
    });
    
    if (error) {
      console.error('Tag search error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search tags' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tags: (data || []) as TagSuggestion[],
    });
  } catch (error) {
    console.error('Tag search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
