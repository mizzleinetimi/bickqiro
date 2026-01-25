/**
 * POST /api/bicks/[id]/complete
 * 
 * Marks an upload as complete and enqueues the processing job.
 * 
 * @requirements 9.3, 8.1, 8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { enqueueBickProcessing } from '@/lib/queue/queues';
import { getCdnUrl } from '@/lib/r2/client';
import type { BickProcessingJob } from '@/lib/queue/jobs';
import type { Bick, BickAssetInsert } from '@/types/database.types';

/**
 * Request body for complete endpoint
 */
interface CompleteUploadRequest {
  storageKey: string;
  sizeBytes: number;
}

/**
 * Success response for complete endpoint
 */
interface CompleteUploadSuccessResponse {
  success: true;
  bickId: string;
  jobId: string;
}

/**
 * Error response for complete endpoint
 */
interface CompleteUploadErrorResponse {
  success: false;
  error: string;
  code: 'NOT_FOUND' | 'ALREADY_COMPLETED' | 'QUEUE_ERROR' | 'VALIDATION_ERROR';
}

type CompleteUploadResponse = CompleteUploadSuccessResponse | CompleteUploadErrorResponse;

/**
 * Validates the request body
 */
function validateRequest(body: unknown): { 
  valid: true; 
  data: CompleteUploadRequest 
} | { 
  valid: false; 
  error: string 
} {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body is required' };
  }

  const data = body as Record<string, unknown>;

  // Validate storageKey (required)
  if (typeof data.storageKey !== 'string' || data.storageKey.trim().length === 0) {
    return { valid: false, error: 'Storage key is required' };
  }

  // Validate sizeBytes (required)
  if (typeof data.sizeBytes !== 'number' || data.sizeBytes <= 0) {
    return { valid: false, error: 'Size in bytes must be a positive number' };
  }

  return {
    valid: true,
    data: {
      storageKey: data.storageKey,
      sizeBytes: data.sizeBytes,
    },
  };
}

/**
 * Route segment config
 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST handler for marking upload complete
 * 
 * @param request - The incoming request
 * @param context - Route context with params
 * @returns JSON response with job ID or error
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<CompleteUploadResponse>> {
  try {
    // Get bick ID from route params
    const { id: bickId } = await context.params;

    if (!bickId || bickId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bick ID is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

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
          error: validation.error,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const { storageKey, sizeBytes } = validation.data;

    // Get bick record
    const adminClient = createAdminClient();
    const { data: bick, error: fetchError } = await adminClient
      .from('bicks')
      .select('id, status, original_filename')
      .eq('id', bickId)
      .single() as { data: Pick<Bick, 'id' | 'status' | 'original_filename'> | null; error: Error | null };

    if (fetchError || !bick) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bick not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if already completed (not in processing state)
    if (bick.status !== 'processing') {
      return NextResponse.json(
        {
          success: false,
          error: `Bick is already ${bick.status}`,
          code: 'ALREADY_COMPLETED',
        },
        { status: 409 }
      );
    }

    // Create bick_asset record for the original upload
    const cdnUrl = getCdnUrl(storageKey);
    const assetInsert: BickAssetInsert = {
      bick_id: bickId,
      asset_type: 'original',
      storage_key: storageKey,
      cdn_url: cdnUrl,
      mime_type: 'audio/mpeg',
      size_bytes: sizeBytes,
    };
    const { error: assetError } = await adminClient
      .from('bick_assets')
      .insert(assetInsert as never);

    if (assetError) {
      console.error('Error creating bick asset:', assetError);
      // Continue anyway - the asset record is not critical for processing
    }

    // Enqueue processing job
    const jobPayload: BickProcessingJob = {
      bickId,
      storageKey,
      originalFilename: bick.original_filename || 'unknown.mp3',
    };

    let jobId: string;
    try {
      jobId = await enqueueBickProcessing(jobPayload);
    } catch (queueError) {
      console.error('Error enqueuing processing job:', queueError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to enqueue processing job',
          code: 'QUEUE_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bickId,
      jobId,
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'QUEUE_ERROR',
      },
      { status: 500 }
    );
  }
}
