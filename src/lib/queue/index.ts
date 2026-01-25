/**
 * Queue module exports
 * 
 * Provides BullMQ queue functionality for async job processing.
 * 
 * @module lib/queue
 */

export { createRedisConnection } from './connection';
export { bickProcessingQueue, enqueueBickProcessing } from './queues';
export { 
  type BickProcessingJob, 
  isValidBickProcessingJob,
} from './jobs';
