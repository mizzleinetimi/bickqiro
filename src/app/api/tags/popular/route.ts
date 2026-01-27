/**
 * GET /api/tags/popular
 * 
 * Get popular tags ordered by bick_count descending.
 * Returns tags with bick_count > 0.
 * 
 * @requirements 9.2, 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PopularTag {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

interface PopularTagsResponse {
  success: true;
  tags: PopularTag[];
}

interface PopularTagsErrorResponse {
  success: false;
  error: string;
}

type Response = PopularTagsResponse | PopularTagsErrorResponse;

export async function GET(
  request: NextRequest
): Promise<NextResponse<Response>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    
    // Parse limit (default 12, max 50)
    let limit = 12;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
        limit = parsed;
      }
    }
    
    const supabase = await createClient();
    
    // Call the get_popular_tags function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_popular_tags', {
      result_limit: limit,
    });
    
    if (error) {
      console.error('Popular tags error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch popular tags' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tags: (data || []) as PopularTag[],
    });
  } catch (error) {
    console.error('Popular tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
