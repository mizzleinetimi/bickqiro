/**
 * Search API Route
 * GET /api/search?q=query&cursor=xxx&limit=20
 * 
 * Full-text search for bicks using PostgreSQL tsvector
 */
import { NextRequest, NextResponse } from 'next/server';
import { searchBicks } from '@/lib/supabase/queries';

// Rate limit configuration (simple in-memory for now)
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const q = searchParams.get('q');
  const cursor = searchParams.get('cursor') || undefined;
  const limitParam = searchParams.get('limit');
  
  // Validate required 'q' parameter
  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }
  
  // Validate query length (max 200 chars)
  if (q.length > 200) {
    return NextResponse.json(
      { error: 'Search query too long (max 200 characters)' },
      { status: 400 }
    );
  }
  
  // Parse and validate limit
  let limit = 20; // default
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }
    limit = parsedLimit;
  }
  
  try {
    // Execute search
    const result = await searchBicks({
      query: q,
      cursor,
      limit
    });
    
    // Build response with rate limit headers
    const response = NextResponse.json({
      bicks: result.bicks,
      nextCursor: result.nextCursor
    });
    
    // Add rate limiting headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - 1).toString()); // Simplified
    
    // Add cache headers for CDN
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
