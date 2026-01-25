/**
 * BullMQ Worker Entry Point
 * 
 * This worker processes bick uploads. In this placeholder implementation,
 * it creates the original audio asset record and marks bicks as 'live'.
 * The full FFmpeg processing will be implemented in Spec 4.
 * 
 * **Validates: Requirements 8.4**
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types';
import type { BickProcessingJob } from '../src/lib/queue/jobs';

// Environment validation
const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

if (!CDN_URL) {
  throw new Error('NEXT_PUBLIC_CDN_URL environment variable is required');
}

// Create Supabase admin client
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Get the public CDN URL for a storage key
 */
function getCdnUrl(key: string): string {
  const baseUrl = CDN_URL!.endsWith('/') ? CDN_URL!.slice(0, -1) : CDN_URL!;
  return `${baseUrl}/${key}`;
}

/**
 * Process a bick upload job
 * 
 * Creates the original audio asset record and marks the bick as 'live'.
 * Full implementation in Spec 4 will also:
 * 1. Download audio from R2
 * 2. Validate mime type, size, duration
 * 3. Generate waveform JSON
 * 4. Generate OG image
 * 5. Generate teaser MP4
 * 6. Upload derived assets to R2
 */
async function processBick(job: Job<BickProcessingJob>): Promise<void> {
  const { bickId, storageKey } = job.data;
  
  console.log(`[Worker] Processing bick ${bickId} from ${storageKey}`);

  // Create the original audio asset record
  const cdnUrl = getCdnUrl(storageKey);
  console.log(`[Worker] Creating asset record with CDN URL: ${cdnUrl}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: assetError } = await (supabase
    .from('bick_assets') as any)
    .insert({
      bick_id: bickId,
      asset_type: 'original',
      cdn_url: cdnUrl,
      storage_key: storageKey,
    });

  if (assetError) {
    console.error(`[Worker] Failed to create asset for bick ${bickId}:`, assetError);
    throw new Error(`Failed to create asset record: ${assetError.message}`);
  }

  // Mark bick as live
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase
    .from('bicks') as any)
    .update({ 
      status: 'live',
      published_at: new Date().toISOString(),
    })
    .eq('id', bickId);

  if (updateError) {
    console.error(`[Worker] Failed to update bick ${bickId}:`, updateError);
    throw new Error(`Failed to update bick status: ${updateError.message}`);
  }

  console.log(`[Worker] Bick ${bickId} marked as live with audio at ${cdnUrl}`);
}

// Create the worker
const worker = new Worker<BickProcessingJob>(
  'bick-processing',
  async (job) => {
    console.log(`[Worker] Starting job ${job.id}: ${job.name}`);
    await processBick(job);
  },
  {
    connection: {
      url: REDIS_URL,
    },
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1000 },
  }
);

// Event handlers
worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

worker.on('ready', () => {
  console.log('[Worker] Worker is ready and listening for jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Received SIGINT, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

console.log('[Worker] Bick processing worker started');
