/**
 * Redis connection factory for BullMQ
 * 
 * Creates Redis connections configured for BullMQ queue operations.
 * Uses ioredis with maxRetriesPerRequest set to null as required by BullMQ.
 * 
 * @module lib/queue/connection
 * @requirements 8.1
 */

import { Redis } from 'ioredis';

/**
 * Creates a new Redis connection for BullMQ.
 * 
 * BullMQ requires maxRetriesPerRequest to be null to properly handle
 * blocking operations used by workers.
 * 
 * @returns A configured Redis client instance
 * @throws Error if REDIS_URL environment variable is not set
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }
  
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}
