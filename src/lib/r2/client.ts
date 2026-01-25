/**
 * R2 Storage Client
 *
 * Provides presigned URL generation for direct client-to-R2 uploads.
 * Cloudflare R2 is S3-compatible, so we use the AWS SDK.
 *
 * @module lib/r2/client
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Get the R2 endpoint URL from the account ID.
 * Format: https://{accountId}.r2.cloudflarestorage.com
 */
function getR2Endpoint(): string {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID environment variable is not set');
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

/**
 * Create an S3Client configured for Cloudflare R2.
 * Uses lazy initialization to avoid errors when env vars are not set during build.
 */
let r2ClientInstance: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2ClientInstance) {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables must be set'
      );
    }

    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: getR2Endpoint(),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2ClientInstance;
}

/**
 * Options for generating a presigned PUT URL.
 */
export interface PresignedUrlOptions {
  /** The storage key (path) for the object in R2 */
  key: string;
  /** The MIME type of the content being uploaded */
  contentType: string;
  /** URL expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
}

/**
 * Result of generating a presigned PUT URL.
 */
export interface PresignedUrlResult {
  /** The presigned URL for uploading */
  url: string;
  /** When the URL expires */
  expiresAt: Date;
}

/**
 * Generate a presigned PUT URL for direct upload to R2.
 *
 * This allows clients to upload files directly to R2 without
 * going through the API server, reducing server load and latency.
 *
 * @param options - Configuration for the presigned URL
 * @returns The presigned URL and expiration time
 *
 * @example
 * ```typescript
 * const { url, expiresAt } = await generatePresignedPutUrl({
 *   key: 'uploads/abc123/original.mp3',
 *   contentType: 'audio/mpeg',
 *   expiresIn: 3600,
 * });
 * ```
 *
 * @throws Error if R2 environment variables are not configured
 *
 * **Validates: Requirements 6.1, 6.2**
 */
export async function generatePresignedPutUrl(
  options: PresignedUrlOptions
): Promise<PresignedUrlResult> {
  const { key, contentType, expiresIn = 3600 } = options;

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const r2Client = getR2Client();
  const url = await getSignedUrl(r2Client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return { url, expiresAt };
}

/**
 * Generate a storage key for a bick's original audio file.
 *
 * The key format is: uploads/{bickId}/original.{extension}
 *
 * This provides a consistent, predictable path structure for
 * organizing uploaded files in R2.
 *
 * @param bickId - The unique identifier for the bick
 * @param filename - The original filename (used to extract extension)
 * @returns The storage key for R2
 *
 * @example
 * ```typescript
 * const key = generateStorageKey('abc123', 'my-audio.mp3');
 * // Returns: 'uploads/abc123/original.mp3'
 *
 * const key2 = generateStorageKey('def456', 'recording.wav');
 * // Returns: 'uploads/def456/original.wav'
 * ```
 *
 * **Validates: Requirements 6.1, 6.2**
 */
export function generateStorageKey(bickId: string, filename: string): string {
  // Extract extension from filename, default to 'mp3' if none found
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'mp3';

  return `uploads/${bickId}/original.${ext}`;
}

/**
 * Get the public CDN URL for a storage key.
 *
 * This converts an R2 storage key to a publicly accessible CDN URL.
 *
 * @param key - The storage key in R2
 * @returns The public CDN URL
 *
 * @example
 * ```typescript
 * const cdnUrl = getCdnUrl('uploads/abc123/original.mp3');
 * // Returns: 'https://cdn.bickqr.com/uploads/abc123/original.mp3'
 * ```
 */
export function getCdnUrl(key: string): string {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdnUrl) {
    throw new Error('NEXT_PUBLIC_CDN_URL environment variable is not set');
  }

  // Remove trailing slash from CDN URL if present
  const baseUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;

  return `${baseUrl}/${key}`;
}

// Export the client getter for testing purposes
export { getR2Client };
