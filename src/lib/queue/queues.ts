/**
 * BullMQ queue definitions and enqueue functions
 * 
 * Defines the queues used for async job processing in Bickqr.
 * 
 * @module lib/queue/queues
 * @requirements 8.1, 8.2
 */

import { Queue } from 'bullmq';
import { createRedisConnection } from './connection';
import { type BickProcessingJob, isValidBickProcessingJob } from './jobs';

/**
 * Lazy-initialized queue instance.
 * We use lazy initialization to avoid connecting to Redis at module load time,
 * which would fail during Next.js build when REDIS_URL is not available.
 */
let _bickProcessingQueue: Queue | null = null;

/**
 * Gets or creates the bick processing queue.
 * 
 * Handles async processing of uploaded audio files including:
 * - Audio format conversion
 * - Waveform generation
 * - OG image generation
 * - Teaser MP4 generation
 * 
 * Configuration:
 * - 3 retry attempts with exponential backoff (1s, 2s, 4s)
 * - Keeps last 100 completed jobs for debugging
 * - Keeps last 1000 failed jobs for analysis
 * 
 * @requirements 8.1 - Enqueue processing job in BullMQ when upload completes
 */
export function getBickProcessingQueue(): Queue {
  if (!_bickProcessingQueue) {
    _bickProcessingQueue = new Queue('bick-processing', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });
  }
  return _bickProcessingQueue;
}

/**
 * @deprecated Use getBickProcessingQueue() instead for lazy initialization
 */
export const bickProcessingQueue = {
  get queue() {
    return getBickProcessingQueue();
  },
};

/**
 * Enqueues a bick for async processing.
 * 
 * Creates a job in the bick-processing queue with the provided payload.
 * The job ID is set to `bick-{bickId}` to prevent duplicate processing.
 * 
 * @param job - The job payload containing bick processing information
 * @returns The job ID assigned by BullMQ
 * @throws Error if the job payload is invalid or queue operation fails
 * 
 * @requirements 8.1 - Enqueue processing job in BullMQ when upload completes
 * @requirements 8.2 - Include bick ID and storage key in job payload
 */
export async function enqueueBickProcessing(
  job: BickProcessingJob
): Promise<string> {
  if (!isValidBickProcessingJob(job)) {
    throw new Error('Invalid job payload: bickId, storageKey, and originalFilename are required');
  }
  
  const queue = getBickProcessingQueue();
  const result = await queue.add('process-bick', job, {
    jobId: `bick-${job.bickId}`,
  });
  
  return result.id!;
}

import { type TrendingCalculatorJob, isValidTrendingCalculatorJob } from './jobs';

/**
 * Lazy-initialized trending calculator queue instance.
 */
let _trendingCalculatorQueue: Queue | null = null;

/**
 * Gets or creates the trending calculator queue.
 * 
 * Handles periodic calculation of trending scores for all live bicks.
 * 
 * Configuration:
 * - 3 retry attempts with exponential backoff
 * - Keeps last 10 completed jobs
 * - Keeps last 100 failed jobs
 * 
 * @requirements 7.1 - Trending calculator job queue
 */
export function getTrendingCalculatorQueue(): Queue {
  if (!_trendingCalculatorQueue) {
    _trendingCalculatorQueue = new Queue('trending-calculator', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 10,
        removeOnFail: 100,
      },
    });
  }
  return _trendingCalculatorQueue;
}

/**
 * Enqueues a trending calculation job.
 * 
 * Creates a job to recalculate trending scores for all live bicks.
 * Uses a fixed job ID to prevent duplicate concurrent calculations.
 * 
 * @param job - The job payload (optional force flag)
 * @returns The job ID assigned by BullMQ
 * @throws Error if the job payload is invalid or queue operation fails
 * 
 * @requirements 7.1 - Trending calculator job
 */
export async function enqueueTrendingCalculation(
  job: TrendingCalculatorJob = { type: 'calculate-trending' }
): Promise<string> {
  if (!isValidTrendingCalculatorJob(job)) {
    throw new Error('Invalid job payload: type must be "calculate-trending"');
  }
  
  const queue = getTrendingCalculatorQueue();
  const result = await queue.add('calculate-trending', job, {
    jobId: 'trending-calculation', // Fixed ID to prevent duplicates
  });
  
  return result.id!;
}

/**
 * Schedules recurring trending calculation.
 * 
 * Sets up a repeating job that runs every 15 minutes.
 * 
 * @requirements 7.1 - Configure 15-minute repeat interval
 */
export async function scheduleTrendingCalculation(): Promise<void> {
  const queue = getTrendingCalculatorQueue();
  
  // Remove any existing repeatable job first
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'calculate-trending') {
      await queue.removeRepeatableByKey(job.key);
    }
  }
  
  // Add new repeatable job - every 15 minutes
  await queue.add(
    'calculate-trending',
    { type: 'calculate-trending' } as TrendingCalculatorJob,
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes in milliseconds
      },
      jobId: 'trending-calculation-scheduled',
    }
  );
  
  console.log('Scheduled trending calculation to run every 15 minutes');
}
