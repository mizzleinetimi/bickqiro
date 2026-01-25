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
