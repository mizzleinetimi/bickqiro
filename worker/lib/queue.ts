/**
 * Worker queue connection utilities
 * 
 * Provides Redis connection for the worker process.
 */

import { Redis } from 'ioredis';

/**
 * Creates a Redis connection for the worker
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
