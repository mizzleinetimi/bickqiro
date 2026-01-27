/**
 * PUT /api/bicks/[id]/tags
 * 
 * Update tags for a bick. Owner only.
 * 
 * @requirements 9.3, 9.4, 9.5, 9.6, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TagUpdateRequest {
  tags: string[];
}

interface UpdatedTag {
  id: string;
  name: string;
  slug: string;
}

interface TagUpdateSuccessResponse {
  success: true;
  tags: UpdatedTag[];
}

interface TagUpdateErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DATABASE_ERROR';
}

type TagUpdateResponse = TagUpdateSuccessResponse | TagUpdateErrorResponse;

/**
 * Validate tag format - alphanumeric, hyphens, and spaces only
 */
function isValidTagFormat(tag: string): boolean {
  // Allow alphanumeric, hyphens, and spaces
  return /^[a-zA-Z0-9\s-]+$/.test(tag) && tag.trim().length > 0;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<TagUpdateResponse>> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // Get bick ID from route params
    const { id: bickId } = await context.params;
    
    if (!bickId) {
      return NextResponse.json(
        { success: false, error: 'Bick ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Check if bick exists and user is owner
    const { data: bick, error: bickError } = await supabase
      .from('bicks')
      .select('id, owner_id')
      .eq('id', bickId)
      .single<{ id: string; owner_id: string | null }>();
    
    if (bickError || !bick) {
      return NextResponse.json(
        { success: false, error: 'Bick not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    if (bick.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not own this bick', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    // Parse request body
    let body: TagUpdateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Validate tags array
    if (!Array.isArray(body.tags)) {
      return NextResponse.json(
        { success: false, error: 'Tags must be an array', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Validate tag count
    if (body.tags.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 tags allowed', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Validate each tag format
    for (const tag of body.tags) {
      if (typeof tag !== 'string' || !isValidTagFormat(tag)) {
        return NextResponse.json(
          { success: false, error: `Invalid tag format: ${tag}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
    }
    
    // Update tags using the database function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedTags, error: updateError } = await (supabase.rpc as any)('update_bick_tags', {
      p_bick_id: bickId,
      p_tag_names: body.tags,
    });
    
    if (updateError) {
      console.error('Tag update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update tags', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tags: (updatedTags || []) as UpdatedTag[],
    });
  } catch (error) {
    console.error('Tag update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bicks/[id]/tags
 * 
 * Get tags for a specific bick.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { id: bickId } = await context.params;
    
    if (!bickId) {
      return NextResponse.json(
        { success: false, error: 'Bick ID is required' },
        { status: 400 }
      );
    }
    
    // Get tags for the bick
    const { data: tags, error } = await supabase
      .from('bick_tags')
      .select('tag:tags(id, name, slug)')
      .eq('bick_id', bickId);
    
    if (error) {
      console.error('Get tags error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tags' },
        { status: 500 }
      );
    }
    
    // Extract tags from the join result
    const tagList = (tags || [])
      .map((t: { tag: { id: string; name: string; slug: string } | null }) => t.tag)
      .filter(Boolean);
    
    return NextResponse.json({
      success: true,
      tags: tagList,
    });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
