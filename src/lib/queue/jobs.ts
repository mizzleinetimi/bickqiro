/**
 * Job type definitions for BullMQ
 * 
 * Defines the structure of job payloads for async processing.
 * 
 * @module lib/queue/jobs
 * @requirements 8.2
 */

/**
 * Job payload for bick processing.
 * Contains all information needed to process an uploaded bick.
 * 
 * @requirements 8.2 - Include bick ID and storage key in job payload
 */
export interface BickProcessingJob {
  /** Unique identifier of the bick to process */
  bickId: string;
  /** R2 storage key where the original audio is stored */
  storageKey: string;
  /** Original filename of the uploaded audio */
  originalFilename: string;
  /** Thumbnail URL from source video (TikTok, YouTube, etc.) */
  sourceThumbnailUrl?: string;
}

/**
 * Validates that a job payload has the required structure.
 * 
 * @param job - The job payload to validate
 * @returns true if the job has valid structure
 */
export function isValidBickProcessingJob(job: unknown): job is BickProcessingJob {
  if (typeof job !== 'object' || job === null) {
    return false;
  }
  
  const payload = job as Record<string, unknown>;
  
  return (
    typeof payload.bickId === 'string' &&
    payload.bickId.length > 0 &&
    typeof payload.storageKey === 'string' &&
    payload.storageKey.length > 0 &&
    typeof payload.originalFilename === 'string' &&
    payload.originalFilename.length > 0
  );
}

/**
 * Job payload for trending score calculation.
 * This job has no payload - it processes all live bicks.
 * 
 * @requirements 7.1 - Trending calculator job type
 */
export interface TrendingCalculatorJob {
  /** Job type identifier */
  type: 'calculate-trending';
  /** Optional: force recalculation even if recently computed */
  force?: boolean;
}

/**
 * Validates that a job payload is a valid trending calculator job.
 * 
 * @param job - The job payload to validate
 * @returns true if the job has valid structure
 */
export function isValidTrendingCalculatorJob(job: unknown): job is TrendingCalculatorJob {
  if (typeof job !== 'object' || job === null) {
    return false;
  }
  
  const payload = job as Record<string, unknown>;
  
  return payload.type === 'calculate-trending';
}
