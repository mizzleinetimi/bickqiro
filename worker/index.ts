/**
 * BullMQ Worker Entry Point
 * 
 * This worker processes bick uploads using FFmpeg to generate:
 * - Waveform JSON for client-side visualization
 * - OG image (1200x630) for social sharing
 * - Teaser MP4 (1280x720) for social media embeds
 * 
 * Also provides an HTTP API for URL extraction (yt-dlp)
 * 
 * **Validates: Requirements 8.1, 8.4**
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types';
import type { BickProcessingJob } from '../src/lib/queue/jobs';
import { processBick } from './processors/bick-processor';
import { startApiServer } from './api';

// Environment validation
const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

// Validate required environment variables
const requiredEnvVars = [
  'REDIS_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'NEXT_PUBLIC_CDN_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is required`);
  }
}

// Create Supabase admin client
const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

// Create the worker
const worker = new Worker<BickProcessingJob>(
  'bick-processing',
  async (job: Job<BickProcessingJob>) => {
    console.log(`[Worker] Starting job ${job.id}: bick ${job.data.bickId}`);
    await processBick(job.data, supabase);
  },
  {
    connection: {
      url: REDIS_URL,
    },
    concurrency: WORKER_CONCURRENCY,
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
  console.log(`[Worker] Concurrency: ${WORKER_CONCURRENCY}`);
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
console.log('[Worker] FFmpeg asset generation enabled');

// Start the HTTP API server for URL extraction
console.log('[Worker] About to start API server...');
try {
  startApiServer();
  console.log('[Worker] API server start called');
} catch (err) {
  console.error('[Worker] Failed to start API server:', err);
}
