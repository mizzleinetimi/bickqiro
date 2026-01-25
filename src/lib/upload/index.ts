/**
 * Upload utilities for Bickqr
 * 
 * This module exports validation and slug generation utilities
 * for the upload pipeline.
 */

export {
  // Validation functions
  isValidMimeType,
  isValidFileSize,
  validateTitle,
  validateDescription,
  validateTags,
  isValidTagFormat,
  validateUploadMetadata,
  validateFile,
  // Validation constants
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_TAGS,
  TAG_FORMAT_REGEX,
  // Types
  type ValidationResult,
} from './validation';

export {
  // Slug functions
  generateSlug,
  generateUniqueSlug,
  isValidSlug,
} from './slug';
