/**
 * POST /api/bicks/upload-session
 * 
 * Creates a bick record and returns a presigned R2 URL for direct upload.
 * 
 * @requirements 9.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generatePresignedPutUrl, generateStorageKey } from '@/lib/r2/client';
import { generateUniqueSlug } from '@/lib/upload/slug';
import { 
  validateTitle, 
  validateDescription, 
  validateTags 
} from '@/lib/upload/validation';
import type { BickInsert, Database } from '@/types/database.types';

/**
 * Request body for upload-session endpoint
 */
interface UploadSessionRequest {
  title: string;
  description?: string;
  tags?: string[];
  filename: string;
  contentType: string;
  durationMs: number;
  originalDurationMs?: number;
  sourceUrl?: string;
}

/**
 * Success response for upload-session endpoint
 */
interface UploadSessionSuccessResponse {
  success: true;
  bickId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
}

/**
 * Error response for upload-session endpoint
 */
interface UploadSessionErrorResponse {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'R2_ERROR';
  details?: Record<string, string>;
}

type UploadSessionResponse = UploadSessionSuccessResponse | UploadSessionErrorResponse;

/**
 * Validates the request body and returns validation errors if any
 */
function validateRequest(body: unknown): { 
  valid: true; 
  data: UploadSessionRequest 
} | { 
  valid: false; 
  errors: Record<string, string> 
} {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: { body: 'Request body is required' } };
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Validate title (required)
  if (typeof data.title !== 'string') {
    errors.title = 'Title is required';
  } else {
    const titleResult = validateTitle(data.title);
    if (!titleResult.valid) {
      errors.title = titleResult.error!;
    }
  }

  // Validate description (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else {
      const descResult = validateDescription(data.description);
      if (!descResult.valid) {
        errors.description = descResult.error!;
      }
    }
  }

  // Validate tags (optional)
  if (data.tags !== undefined && data.tags !== null) {
    if (!Array.isArray(data.tags)) {
      errors.tags = 'Tags must be an array';
    } else {
      const tagsResult = validateTags(data.tags as string[]);
      if (!tagsResult.valid) {
        errors.tags = tagsResult.error!;
      }
    }
  }

  // Validate filename (required)
  if (typeof data.filename !== 'string' || data.filename.trim().length === 0) {
    errors.filename = 'Filename is required';
  }

  // Validate contentType (required)
  if (typeof data.contentType !== 'string' || data.contentType.trim().length === 0) {
    errors.contentType = 'Content type is required';
  }

  // Validate durationMs (required)
  if (typeof data.durationMs !== 'number' || data.durationMs <= 0) {
    errors.durationMs = 'Duration must be a positive number';
  }

  // Validate originalDurationMs (optional)
  if (data.originalDurationMs !== undefined && data.originalDurationMs !== null) {
    if (typeof data.originalDurationMs !== 'number' || data.originalDurationMs <= 0) {
      errors.originalDurationMs = 'Original duration must be a positive number';
    }
  }

  // Validate sourceUrl (optional)
  if (data.sourceUrl !== undefined && data.sourceUrl !== null) {
    if (typeof data.sourceUrl !== 'string') {
      errors.sourceUrl = 'Source URL must be a string';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      title: data.title as string,
      description: data.description as string | undefined,
      tags: data.tags as string[] | undefined,
      filename: data.filename as string,
      contentType: data.contentType as string,
      durationMs: data.durationMs as number,
      originalDurationMs: data.originalDurationMs as number | undefined,
      sourceUrl: data.sourceUrl as string | undefined,
    },
  };
}

/**
 * POST handler for creating upload sessions
 * 
 * @param request - The incoming request
 * @returns JSON response with upload session data or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadSessionResponse>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const { 
      title, 
      description, 
      tags, 
      filename, 
      contentType, 
      durationMs, 
      originalDurationMs, 
      sourceUrl 
    } = validation.data;

    // Get authenticated user (if any)
    let ownerId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      ownerId = user?.id ?? null;
    } catch {
      // Anonymous upload - ownerId remains null
    }

    // Generate unique slug from title
    const slug = generateUniqueSlug(title);

    // Create bick record with admin client (bypasses RLS)
    const adminClient = createAdminClient();
    
    const bickInsert: BickInsert = {
      owner_id: ownerId,
      slug,
      title,
      description: description ?? null,
      status: 'processing',
      duration_ms: durationMs,
      original_duration_ms: originalDurationMs ?? null,
      original_filename: filename,
      source_url: sourceUrl ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bick, error: dbError } = await (adminClient
      .from('bicks') as any)
      .insert(bickInsert)
      .select('id')
      .single();

    if (dbError || !bick) {
      console.error('Database error creating bick:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create bick record',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      // Create or get existing tags
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase();
        
        // Upsert tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tag, error: tagError } = await (adminClient
          .from('tags') as any)
          .upsert(
            { name: tagName, slug: tagSlug },
            { onConflict: 'slug' }
          )
          .select('id')
          .single();

        if (tagError) {
          console.error('Error creating tag:', tagError);
          continue; // Skip this tag but continue with others
        }

        // Create bick_tag association
        if (tag) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient
            .from('bick_tags') as any)
            .insert({ bick_id: bick.id, tag_id: tag.id })
            .select();
        }
      }
    }

    // Generate storage key and presigned URL
    const storageKey = generateStorageKey(bick.id, filename);
    
    let uploadUrl: string;
    let expiresAt: Date;
    
    try {
      const presignedResult = await generatePresignedPutUrl({
        key: storageKey,
        contentType,
        expiresIn: 3600, // 1 hour
      });
      uploadUrl = presignedResult.url;
      expiresAt = presignedResult.expiresAt;
    } catch (r2Error) {
      console.error('R2 error generating presigned URL:', r2Error);
      
      // Clean up the bick record since we can't complete the upload
      await adminClient.from('bicks').delete().eq('id', bick.id);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate upload URL',
          code: 'R2_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bickId: bick.id,
      uploadUrl,
      storageKey,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
