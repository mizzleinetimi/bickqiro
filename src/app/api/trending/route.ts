/**
 * Trending API Route
 * GET /api/trending - Returns paginated trending bicks
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTrendingBicksPaginated } from '@/lib/supabase/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get('cursor') || undefined;
  const limitParam = searchParams.get('limit');
  
  // Parse and validate limit
  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }
    limit = parsed;
  }

  try {
    const result = await getTrendingBicksPaginated({ cursor, limit });
    
    return NextResponse.json({
      bicks: result.bicks,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending' },
      { status: 500 }
    );
  }
}
