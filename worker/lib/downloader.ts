/**
 * Audio Downloader
 * 
 * Downloads audio files from R2 to local temp directory for processing.
 * 
 * **Validates: Requirements 1.1, 1.3**
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
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
 * Downloads audio file from R2 to local temp directory.
 * 
 * @param storageKey - The R2 storage key for the audio file
 * @param tempDir - Local directory to store the downloaded file
 * @returns Path to the downloaded file
 * @throws ProcessingError if download fails
 */
export async function downloadAudio(
  storageKey: string,
  tempDir: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new ProcessingError(
      ProcessingErrorType.DOWNLOAD_FAILED,
      'R2_BUCKET_NAME not configured'
    );
  }

  // Create temp directory
  await mkdir(tempDir, { recursive: true });

  // Determine file extension from storage key
  const ext = path.extname(storageKey) || '.mp3';
  const localPath = path.join(tempDir, `original${ext}`);

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });

    const response = await getR2Client().send(command);

    if (!response.Body) {
      throw new ProcessingError(
        ProcessingErrorType.DOWNLOAD_FAILED,
        `Empty response for ${storageKey}`
      );
    }

    // Stream to local file
    const writeStream = createWriteStream(localPath);
    await pipeline(response.Body as Readable, writeStream);

    console.log(`[Downloader] Downloaded ${storageKey} to ${localPath}`);
    return localPath;
  } catch (error) {
    if (error instanceof ProcessingError) {
      throw error;
    }
    throw new ProcessingError(
      ProcessingErrorType.DOWNLOAD_FAILED,
      `Failed to download ${storageKey}: ${error}`,
      undefined,
      'download',
      error as Error
    );
  }
}

/**
 * Cleans up temporary files after processing.
 * 
 * @param tempDir - Directory to remove
 */
export async function cleanupTempFiles(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
    console.log(`[Downloader] Cleaned up ${tempDir}`);
  } catch (error) {
    console.warn(`[Downloader] Failed to cleanup ${tempDir}:`, error);
  }
}
