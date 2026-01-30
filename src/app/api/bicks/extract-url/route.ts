/**
 * POST /api/bicks/extract-url
 * 
 * Extracts audio from social media video URLs.
 * Proxies to the Railway worker which has yt-dlp installed.
 * Supports YouTube, TikTok, Instagram, and Twitter/X.
 * 
 * @requirements 9.1, 2.1, 2.2, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  detectPlatform, 
  SUPPORTED_PLATFORM_NAMES,
} from '@/lib/audio/platform';

interface ExtractUrlRequest {
  url: string;
}

interface ExtractUrlSuccessResponse {
  success: true;
  audioUrl: string;
  durationMs: number;
  sourceTitle?: string;
  thumbnailUrl?: string;
}

interface ExtractUrlErrorResponse {
  success: false;
  error: string;
  code: 'INVALID_URL' | 'UNSUPPORTED_PLATFORM' | 'VIDEO_UNAVAILABLE' | 'EXTRACTION_FAILED';
}

type ExtractUrlResponse = ExtractUrlSuccessResponse | ExtractUrlErrorResponse;

// Worker extraction API URL (Railway)
const WORKER_API_URL = process.env.WORKER_API_URL;

function validateRequest(body: unknown): body is ExtractUrlRequest {
  if (typeof body !== 'object' || body === null) return false;
  const { url } = body as Record<string, unknown>;
  return typeof url === 'string' && url.trim().length > 0;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractUrlResponse>> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    if (!validateRequest(body)) {
      return NextResponse.json(
        { success: false, error: 'URL is required', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    const { url } = body;
    const trimmedUrl = url.trim();

    // Detect platform
    const platform = detectPlatform(trimmedUrl);
    if (!platform) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported platform. Supported platforms: ${SUPPORTED_PLATFORM_NAMES.join(', ')}`,
          code: 'UNSUPPORTED_PLATFORM',
        },
        { status: 400 }
      );
    }

    // Check if worker API is configured
    if (!WORKER_API_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL extraction service not configured. Please upload audio directly.',
          code: 'EXTRACTION_FAILED',
        },
        { status: 503 }
      );
    }

    // Call the worker's extraction API
    try {
      const workerResponse = await fetch(`${WORKER_API_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = await workerResponse.json();
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Extraction failed',
            code: result.code || 'EXTRACTION_FAILED',
          },
          { status: workerResponse.status }
        );
      }

      return NextResponse.json({
        success: true,
        audioUrl: result.audioUrl,
        durationMs: result.durationMs,
        sourceTitle: result.sourceTitle,
        thumbnailUrl: result.thumbnailUrl,
      });
    } catch (fetchError) {
      console.error('Worker API error:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Extraction service unavailable. Please try again or upload directly.',
          code: 'EXTRACTION_FAILED',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Extract URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extract audio from URL', code: 'EXTRACTION_FAILED' },
      { status: 500 }
    );
  }
}
