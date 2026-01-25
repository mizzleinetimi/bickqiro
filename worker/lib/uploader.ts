/**
 * Asset Uploader
 * 
 * Uploads generated assets to R2 and returns CDN URLs.
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile, stat } from 'fs/promises';
import { ProcessingError, ProcessingErrorType } from '../types';

/**
 * Lazily initialized R2 client.
 */
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured');
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

/**
 * Result of uploading an asset.
 */
export interface UploadResult {
  cdnUrl: string;
  storageKey: string;
  sizeBytes: number;
}

/**
 * Uploads a file to R2 and returns the CDN URL.
 * 
 * @param filePath - Local path to the file to upload
 * @param storageKey - R2 storage key (path in bucket)
 * @param contentType - MIME type of the file
 * @returns Upload result with CDN URL and metadata
 * @throws ProcessingError if upload fails
 */
export async function uploadAsset(
  filePath: string,
  storageKey: string,
  contentType: string
): Promise<UploadResult> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

  if (!bucketName) {
    throw new ProcessingError(
      ProcessingErrorType.UPLOAD_FAILED,
      'R2_BUCKET_NAME not configured'
    );
  }

  if (!cdnUrl) {
    throw new ProcessingError(
      ProcessingErrorType.UPLOAD_FAILED,
      'NEXT_PUBLIC_CDN_URL not configured'
    );
  }

  try {
    // Read file and get size
    const [fileBuffer, fileStats] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await getR2Client().send(command);

    // Build CDN URL
    const baseUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    const assetCdnUrl = `${baseUrl}/${storageKey}`;

    console.log(`[Uploader] Uploaded ${storageKey} (${fileStats.size} bytes)`);

    return {
      cdnUrl: assetCdnUrl,
      storageKey,
      sizeBytes: fileStats.size,
    };
  } catch (error) {
    if (error instanceof ProcessingError) {
      throw error;
    }
    throw new ProcessingError(
      ProcessingErrorType.UPLOAD_FAILED,
      `Failed to upload ${storageKey}: ${error}`,
      undefined,
      'upload',
      error as Error
    );
  }
}

/**
 * Generates a storage key for a bick asset.
 * 
 * @param bickId - The bick ID
 * @param assetName - Name of the asset file (e.g., 'waveform.json', 'og.png')
 * @returns Storage key in format `uploads/{bickId}/{assetName}`
 */
export function generateStorageKey(bickId: string, assetName: string): string {
  return `uploads/${bickId}/${assetName}`;
}
