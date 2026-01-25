/**
 * R2 Storage Module
 *
 * Exports utilities for interacting with Cloudflare R2 storage.
 *
 * @module lib/r2
 */

export {
  generatePresignedPutUrl,
  generateStorageKey,
  getCdnUrl,
  type PresignedUrlOptions,
  type PresignedUrlResult,
} from './client';
