/**
 * BullMQ Worker Entry Point
 * 
 * This worker processes bick uploads. In this placeholder implementation,
 * it simply marks bicks as 'live'. The full FFmpeg processing will be
 * implemented in Spec 4.
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

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

// Create Supabase admin client
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Process a bick upload job
 * 
 * Placeholder implementation that marks the bick as 'live'.
 * Full implementation in Spec 4 will:
 * 1. Download audio from R2
 * 2. Validate mime type, size, duration
 * 3. Generate waveform JSON
 * 4. Generate OG image
 * 5. Generate teaser MP4
 * 6. Upload derived assets to R2
 * 7. Create bick_assets records
 * 8. Update bick status to 'live'
 */
async function processBick(job: Job<BickProcessingJob>): Promise<void> {
  const { bickId, storageKey } = job.data;
  
  console.log(`[Worker] Processing bick ${bickId} from ${storageKey}`);

  // Placeholder: Just mark as live
  // In Spec 4, this will do actual FFmpeg processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('bicks') as any)
    .update({ 
      status: 'live',
      // In Spec 4, we'll also update:
      // duration_ms: actualDuration,
      // and create bick_assets records
    })
    .eq('id', bickId);

  if (error) {
    console.error(`[Worker] Failed to update bick ${bickId}:`, error);
    throw new Error(`Failed to update bick status: ${error.message}`);
  }

  console.log(`[Worker] Bick ${bickId} marked as live`);
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
