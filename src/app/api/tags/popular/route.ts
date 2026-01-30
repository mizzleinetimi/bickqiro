/**
 * GET /api/tags/popular
 * 
 * Returns popular tags ordered by bick count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '12', 10);

  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, slug, bick_count')
      .gt('bick_count', 0)
      .order('bick_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch popular tags:', error);
      return NextResponse.json({ tags: [] });
    }

    return NextResponse.json({ tags: data || [] });
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    return NextResponse.json({ tags: [] });
  }
}
