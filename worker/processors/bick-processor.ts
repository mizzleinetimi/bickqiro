/**
 * Bick Processor
 * 
 * Orchestrates the complete processing pipeline for a bick:
 * 1. Download audio from R2
 * 2. Generate waveform JSON
 * 3. Generate OG image
 * 4. Generate teaser MP4
 * 5. Upload all assets to R2
 * 6. Create bick_asset records
 * 7. Validate all required assets exist
 * 8. Update bick status to 'live' with published_at timestamp
 * 
 * **Validates: Requirements 2.5, 3.6, 4.6, 5.4, 5.5, 6.1, 6.2, 6.4**
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';
import type { BickProcessingJob } from '../../src/lib/queue/jobs';
import type { ProcessingResult, AssetType } from '../types';
import { ProcessingError, ProcessingErrorType } from '../types';
import { downloadAudio, cleanupTempFiles } from '../lib/downloader';
import { generateWaveformJson } from '../lib/waveform';
import { generateOgImage } from '../lib/og-image';
import { generateTeaser } from '../lib/teaser';
import { uploadAsset, generateStorageKey } from '../lib/uploader';
import { validateAudio } from '../lib/ffmpeg';
import { stat } from 'fs/promises';

/**
 * MIME types for each asset type.
 */
const MIME_TYPES: Record<AssetType, string> = {
  original: 'audio/mpeg',
  waveform_json: 'application/json',
  og_image: 'image/png',
  teaser_mp4: 'video/mp4',
};

/**
 * Required asset types that must exist before a bick can be marked as live.
 */
const REQUIRED_ASSETS: AssetType[] = ['waveform_json', 'og_image', 'teaser_mp4'];

/**
 * Validates that all required assets exist for a bick.
 * 
 * **Validates: Requirements 6.1, 6.2**
 * 
 * @param supabase - Supabase client
 * @param bickId - The bick ID to validate
 * @returns true if all required assets exist
 */
async function validateAllAssetsExist(
  supabase: SupabaseClient<Database>,
  bickId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assets, error } = await (supabase.from('bick_assets') as any)
    .select('asset_type')
    .eq('bick_id', bickId);

  if (error) {
    console.error(`[Processor] Failed to fetch assets for validation: ${error.message}`);
    return false;
  }

  const existingTypes = new Set(assets?.map((a: { asset_type: string }) => a.asset_type) || []);
  return REQUIRED_ASSETS.every(type => existingTypes.has(type));
}

/**
 * Creates an asset record in the database.
 */
async function createAssetRecord(
  supabase: SupabaseClient<Database>,
  bickId: string,
  assetType: AssetType,
  storageKey: string,
  cdnUrl: string,
  filePath: string
): Promise<void> {
  const fileStats = await stat(filePath);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('bick_assets') as any).insert({
    bick_id: bickId,
    asset_type: assetType,
    storage_key: storageKey,
    cdn_url: cdnUrl,
    mime_type: MIME_TYPES[assetType],
    size_bytes: fileStats.size,
  });

  if (error) {
    throw new ProcessingError(
      ProcessingErrorType.DATABASE_ERROR,
      `Failed to create asset record: ${error.message}`,
      bickId,
      'createAssetRecord'
    );
  }
}

/**
 * Processes a bick upload job.
 * 
 * Downloads the audio, generates all assets, uploads them to R2,
 * creates database records, and marks the bick as live.
 * 
 * @param job - The processing job data
 * @param supabase - Supabase client for database operations
 * @returns Processing result with asset URLs
 * @throws ProcessingError if any step fails
 */
export async function processBick(
  job: BickProcessingJob,
  supabase: SupabaseClient<Database>
): Promise<ProcessingResult> {
  const { bickId, storageKey } = job;
  const tempDir = `/tmp/bick-${bickId}`;

  try {
    // 1. Download audio from R2
    console.log(`[Processor] Downloading audio for bick ${bickId}`);
    const audioPath = await downloadAudio(storageKey, tempDir);

    // 2. Validate audio
    console.log(`[Processor] Validating audio for bick ${bickId}`);
    const isValid = await validateAudio(audioPath);
    if (!isValid) {
      throw new ProcessingError(
        ProcessingErrorType.INVALID_AUDIO,
        'File is not a valid audio format',
        bickId,
        'validateAudio'
      );
    }

    // 3. Generate waveform JSON
    console.log(`[Processor] Generating waveform for bick ${bickId}`);
    const waveformPath = await generateWaveformJson(audioPath, tempDir);
    const waveformKey = generateStorageKey(bickId, 'waveform.json');
    const waveformResult = await uploadAsset(waveformPath, waveformKey, MIME_TYPES.waveform_json);
    await createAssetRecord(supabase, bickId, 'waveform_json', waveformKey, waveformResult.cdnUrl, waveformPath);

    // 4. Generate OG image
    console.log(`[Processor] Generating OG image for bick ${bickId}`);
    const ogPath = await generateOgImage(audioPath, tempDir);
    const ogKey = generateStorageKey(bickId, 'og.png');
    const ogResult = await uploadAsset(ogPath, ogKey, MIME_TYPES.og_image);
    await createAssetRecord(supabase, bickId, 'og_image', ogKey, ogResult.cdnUrl, ogPath);

    // 5. Generate teaser MP4
    console.log(`[Processor] Generating teaser for bick ${bickId}`);
    const teaserPath = await generateTeaser(audioPath, tempDir);
    const teaserKey = generateStorageKey(bickId, 'teaser.mp4');
    const teaserResult = await uploadAsset(teaserPath, teaserKey, MIME_TYPES.teaser_mp4);
    await createAssetRecord(supabase, bickId, 'teaser_mp4', teaserKey, teaserResult.cdnUrl, teaserPath);

    // 6. Validate all assets exist before marking as live
    console.log(`[Processor] Validating assets for bick ${bickId}`);
    const allAssetsExist = await validateAllAssetsExist(supabase, bickId);
    if (!allAssetsExist) {
      throw new ProcessingError(
        ProcessingErrorType.DATABASE_ERROR,
        'Not all required assets were created',
        bickId,
        'validateAssets'
      );
    }

    // 7. Mark bick as live with published_at timestamp
    console.log(`[Processor] Marking bick ${bickId} as live`);
    const publishedAt = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('bicks') as any)
      .update({
        status: 'live',
        published_at: publishedAt,
      })
      .eq('id', bickId);

    if (updateError) {
      throw new ProcessingError(
        ProcessingErrorType.DATABASE_ERROR,
        `Failed to update bick status: ${updateError.message}`,
        bickId,
        'updateStatus'
      );
    }

    console.log(`[Processor] Successfully processed bick ${bickId}`);

    return {
      bickId,
      waveformUrl: waveformResult.cdnUrl,
      ogImageUrl: ogResult.cdnUrl,
      teaserUrl: teaserResult.cdnUrl,
    };

  } catch (error) {
    console.error(`[Processor] Failed to process bick ${bickId}:`, error);

    // Mark bick as failed
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('bicks') as any)
        .update({ status: 'failed' })
        .eq('id', bickId);
    } catch (updateError) {
      console.error(`[Processor] Failed to mark bick ${bickId} as failed:`, updateError);
    }

    throw error;

  } finally {
    // Cleanup temp files
    await cleanupTempFiles(tempDir);
  }
}
