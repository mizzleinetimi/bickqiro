/**
 * Audio utilities for Bickqr
 * 
 * This module exports audio extraction, platform detection, and trimming utilities
 * for the upload pipeline.
 * 
 * NOTE: For client components, import platform detection from '@/lib/audio/platform'
 * and trimming from '@/lib/audio/trimmer' directly to avoid bundling Node.js modules.
 */

// Platform detection (client-safe)
export {
  detectPlatform,
  isSupportedUrl,
  SUPPORTED_PLATFORMS,
  SUPPORTED_PLATFORM_NAMES,
  type SupportedPlatform,
} from './platform';

// Audio extraction (server-only - uses Node.js APIs)
export {
  extractAudioFromUrl,
  cleanupExtractedAudio,
  ExtractionError,
  type ExtractionResult,
  type ExtractionErrorCode,
  type ExtractionOptions,
} from './extractor';

// Audio trimming (client-safe)
export {
  trimAudio,
  encodeWav,
  getAudioDuration,
  validateTrimRange,
  calculateTrimDuration,
  TrimError,
  MAX_TRIM_DURATION_MS,
  MIN_TRIM_DURATION_MS,
  type TrimOptions,
  type TrimResult,
  type TrimErrorCode,
} from './trimmer';

// Video-to-audio extraction (client-safe)
export {
  extractAudioFromVideo,
  isVideoFile,
  getVideoDuration,
  VideoExtractError,
  type VideoExtractResult,
  type VideoExtractErrorCode,
} from './video-extractor';
