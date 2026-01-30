/**
 * Audio extraction service for Bickqr
 * 
 * Provides platform detection and audio extraction from social media URLs
 * using yt-dlp.
 * 
 * Requirements:
 * - 2.1: Extract audio from TikTok, Instagram, YouTube, Twitter/X URLs
 * - 2.2: Display error for unsupported platforms
 * - 2.3: Display error for invalid/unavailable videos
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

// Import platform detection utilities
import {
  detectPlatform,
  isSupportedUrl,
  SUPPORTED_PLATFORMS,
  SUPPORTED_PLATFORM_NAMES,
  type SupportedPlatform,
} from './platform';

// Re-export platform detection utilities (these are client-safe)
export {
  detectPlatform,
  isSupportedUrl,
  SUPPORTED_PLATFORMS,
  SUPPORTED_PLATFORM_NAMES,
  type SupportedPlatform,
};

const execAsync = promisify(exec);

/**
 * Result of audio extraction
 */
export interface ExtractionResult {
  /** Path to the extracted audio file */
  audioPath: string;
  /** Duration of the audio in milliseconds */
  durationMs: number;
  /** Original video/audio title (for attribution) */
  title?: string;
  /** Detected platform */
  platform: SupportedPlatform;
  /** Thumbnail URL from the source video */
  thumbnailUrl?: string;
}

/**
 * Error codes for extraction failures
 */
export type ExtractionErrorCode = 
  | 'INVALID_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'VIDEO_UNAVAILABLE'
  | 'EXTRACTION_FAILED'
  | 'TIMEOUT';

/**
 * Custom error class for extraction failures
 */
export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: ExtractionErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * Options for audio extraction
 */
export interface ExtractionOptions {
  /** Timeout for getting video info in milliseconds (default: 30000) */
  infoTimeout?: number;
  /** Timeout for extracting audio in milliseconds (default: 120000) */
  extractionTimeout?: number;
  /** Temporary directory for output files (default: /tmp) */
  tempDir?: string;
}

const DEFAULT_OPTIONS: Required<ExtractionOptions> = {
  infoTimeout: 30000,
  extractionTimeout: 120000,
  tempDir: '/tmp',
};

/**
 * Extracts audio from a social media video URL using yt-dlp.
 * 
 * @param url - The URL to extract audio from
 * @param options - Extraction options
 * @returns ExtractionResult with audio path, duration, and metadata
 * @throws ExtractionError if extraction fails
 * 
 * **Validates: Requirements 2.1, 2.3**
 */
export async function extractAudioFromUrl(
  url: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate URL
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new ExtractionError('Invalid URL provided', 'INVALID_URL');
  }

  const trimmedUrl = url.trim();

  // Detect platform
  const platform = detectPlatform(trimmedUrl);
  if (!platform) {
    throw new ExtractionError(
      `Unsupported platform. Supported platforms: ${SUPPORTED_PLATFORM_NAMES.join(', ')}`,
      'UNSUPPORTED_PLATFORM'
    );
  }

  const tempId = randomUUID();
  const outputPath = path.join(opts.tempDir, `${tempId}.mp3`);
  const infoPath = path.join(opts.tempDir, `${tempId}.json`);

  try {
    // Get video info first
    let title: string | undefined;
    let durationMs: number;
    let thumbnailUrl: string | undefined;

    try {
      await execAsync(
        `yt-dlp --dump-json "${trimmedUrl}" > "${infoPath}"`,
        { timeout: opts.infoTimeout }
      );

      // Read and parse the JSON file
      const infoContent = await readFile(infoPath, 'utf-8');
      const infoJson = JSON.parse(infoContent);
      title = infoJson.title;
      durationMs = Math.round((infoJson.duration || 0) * 1000);
      thumbnailUrl = infoJson.thumbnail;
    } catch (error) {
      // Check if it's a timeout
      if (error instanceof Error && error.message.includes('TIMEOUT')) {
        throw new ExtractionError(
          'Timed out while fetching video information',
          'TIMEOUT',
          error
        );
      }
      
      // Check for common yt-dlp errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Video unavailable') ||
        errorMessage.includes('Private video') ||
        errorMessage.includes('This video is not available') ||
        errorMessage.includes('ERROR:')
      ) {
        throw new ExtractionError(
          'Video is unavailable or private',
          'VIDEO_UNAVAILABLE',
          error instanceof Error ? error : undefined
        );
      }

      throw new ExtractionError(
        'Failed to fetch video information',
        'EXTRACTION_FAILED',
        error instanceof Error ? error : undefined
      );
    }

    // Extract audio
    try {
      await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${trimmedUrl}"`,
        { timeout: opts.extractionTimeout }
      );
    } catch (error) {
      // Check if it's a timeout
      if (error instanceof Error && error.message.includes('TIMEOUT')) {
        throw new ExtractionError(
          'Timed out while extracting audio',
          'TIMEOUT',
          error
        );
      }

      throw new ExtractionError(
        'Failed to extract audio from video',
        'EXTRACTION_FAILED',
        error instanceof Error ? error : undefined
      );
    }

    return {
      audioPath: outputPath,
      durationMs,
      title,
      platform,
      thumbnailUrl,
    };
  } finally {
    // Cleanup info file (but not the audio file - caller is responsible for that)
    await unlink(infoPath).catch(() => {});
  }
}

/**
 * Cleans up an extracted audio file.
 * 
 * @param audioPath - Path to the audio file to delete
 */
export async function cleanupExtractedAudio(audioPath: string): Promise<void> {
  await unlink(audioPath).catch(() => {});
}
