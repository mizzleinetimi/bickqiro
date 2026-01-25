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
