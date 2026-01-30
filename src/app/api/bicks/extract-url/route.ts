/**
 * POST /api/bicks/extract-url
 * 
 * Extracts audio from social media video URLs using yt-dlp.
 * Supports YouTube, TikTok, Instagram, and Twitter/X.
 * 
 * @requirements 9.1, 2.1, 2.2, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  detectPlatform, 
  extractAudioFromUrl, 
  ExtractionError,
  SUPPORTED_PLATFORM_NAMES,
  cleanupExtractedAudio
} from '@/lib/audio/extractor';
import { readFile, stat } from 'fs/promises';

/**
 * Request body for extract-url endpoint
 */
interface ExtractUrlRequest {
  url: string;
}

/**
 * Success response for extract-url endpoint
 */
interface ExtractUrlSuccessResponse {
  success: true;
  audioUrl: string;
  durationMs: number;
  sourceTitle?: string;
  thumbnailUrl?: string;
}

/**
 * Error response for extract-url endpoint
 */
interface ExtractUrlErrorResponse {
  success: false;
  error: string;
  code: 'INVALID_URL' | 'UNSUPPORTED_PLATFORM' | 'VIDEO_UNAVAILABLE' | 'EXTRACTION_FAILED';
}

type ExtractUrlResponse = ExtractUrlSuccessResponse | ExtractUrlErrorResponse;

/**
 * Validates the request body
 */
function validateRequest(body: unknown): body is ExtractUrlRequest {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const { url } = body as Record<string, unknown>;
  return typeof url === 'string' && url.trim().length > 0;
}

/**
 * POST handler for extracting audio from social media URLs
 * 
 * @param request - The incoming request
 * @returns JSON response with audio URL and metadata or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ExtractUrlResponse>> {
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
          code: 'INVALID_URL',
        },
        { status: 400 }
      );
    }

    // Validate request
    if (!validateRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required',
          code: 'INVALID_URL',
        },
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

    // Extract audio
    let result;
    try {
      result = await extractAudioFromUrl(trimmedUrl);
    } catch (error) {
      if (error instanceof ExtractionError) {
        const statusCode = error.code === 'VIDEO_UNAVAILABLE' ? 404 : 400;
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code as ExtractUrlErrorResponse['code'],
          },
          { status: statusCode }
        );
      }
      throw error;
    }

    // Read the extracted audio file and convert to base64 data URL
    // In production, this would upload to R2 and return a signed URL
    // For now, we return a data URL for the extracted audio
    try {
      const audioBuffer = await readFile(result.audioPath);
      const audioStats = await stat(result.audioPath);
      
      // Create a base64 data URL
      const base64Audio = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

      // Clean up the temporary file
      await cleanupExtractedAudio(result.audioPath);

      return NextResponse.json({
        success: true,
        audioUrl,
        durationMs: result.durationMs,
        sourceTitle: result.title,
        thumbnailUrl: result.thumbnailUrl,
      });
    } catch (fileError) {
      // Clean up on error
      await cleanupExtractedAudio(result.audioPath);
      throw fileError;
    }
  } catch (error) {
    console.error('Extract URL error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract audio from URL',
        code: 'EXTRACTION_FAILED',
      },
      { status: 500 }
    );
  }
}
