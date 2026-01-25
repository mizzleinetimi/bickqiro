/**
 * Upload validation utilities for Bickqr
 * 
 * Validates file uploads, metadata, and tags according to platform requirements.
 * 
 * Requirements:
 * - 1.1: Accept audio/mpeg, audio/wav, audio/ogg, audio/mp4
 * - 1.2: Reject files > 10MB
 * - 1.3: Reject unsupported MIME types
 * - 5.1: Title 1-100 characters
 * - 5.2: Description max 500 characters
 * - 5.4: Tags alphanumeric and hyphens only
 * - 5.5: Max 10 tags per bick
 */

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types for audio uploads */
export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
] as const;

/** Allowed MIME types for video uploads (audio will be extracted) */
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
] as const;

/** All allowed MIME types (audio + video) */
export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_AUDIO_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

/** Title constraints */
export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 100;

/** Description constraints */
export const DESCRIPTION_MAX_LENGTH = 500;

/** Tag constraints */
export const MAX_TAGS = 10;

/** Tag format regex: alphanumeric and hyphens only */
export const TAG_FORMAT_REGEX = /^[a-zA-Z0-9-]+$/;

/**
 * Validates if a MIME type is allowed for upload.
 * 
 * @param mimeType - The MIME type to validate
 * @returns true if the MIME type is allowed, false otherwise
 * 
 * **Validates: Requirements 1.1, 1.3**
 */
export function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number]);
}

/**
 * Checks if a MIME type is a video type.
 * 
 * @param mimeType - The MIME type to check
 * @returns true if the MIME type is a video type
 */
export function isVideoMimeType(mimeType: string): boolean {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as typeof ALLOWED_VIDEO_MIME_TYPES[number]);
}

/**
 * Checks if a MIME type is an audio type.
 * 
 * @param mimeType - The MIME type to check
 * @returns true if the MIME type is an audio type
 */
export function isAudioMimeType(mimeType: string): boolean {
  return ALLOWED_AUDIO_MIME_TYPES.includes(mimeType as typeof ALLOWED_AUDIO_MIME_TYPES[number]);
}

/**
 * Validates if a file size is within the allowed limit.
 * 
 * @param sizeBytes - The file size in bytes
 * @returns true if the file size is valid (≤ 10MB), false otherwise
 * 
 * **Validates: Requirements 1.2**
 */
export function isValidFileSize(sizeBytes: number): boolean {
  return sizeBytes >= 0 && sizeBytes <= MAX_FILE_SIZE;
}

/**
 * Validation result type for detailed error reporting
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a bick title.
 * 
 * @param title - The title to validate
 * @returns ValidationResult with valid status and optional error message
 * 
 * **Validates: Requirements 5.1**
 */
export function validateTitle(title: string): ValidationResult {
  if (typeof title !== 'string') {
    return { valid: false, error: 'Title must be a string' };
  }
  
  if (title.length < TITLE_MIN_LENGTH) {
    return { valid: false, error: `Title must be at least ${TITLE_MIN_LENGTH} character` };
  }
  
  if (title.length > TITLE_MAX_LENGTH) {
    return { valid: false, error: `Title must be at most ${TITLE_MAX_LENGTH} characters` };
  }
  
  return { valid: true };
}

/**
 * Validates a bick description.
 * 
 * @param description - The description to validate (can be undefined/null for optional)
 * @returns ValidationResult with valid status and optional error message
 * 
 * **Validates: Requirements 5.2**
 */
export function validateDescription(description: string | undefined | null): ValidationResult {
  // Description is optional, so undefined/null is valid
  if (description === undefined || description === null) {
    return { valid: true };
  }
  
  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }
  
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { valid: false, error: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters` };
  }
  
  return { valid: true };
}

/**
 * Validates a single tag format.
 * 
 * @param tag - The tag to validate
 * @returns true if the tag contains only alphanumeric characters and hyphens
 * 
 * **Validates: Requirements 5.4**
 */
export function isValidTagFormat(tag: string): boolean {
  if (typeof tag !== 'string' || tag.length === 0) {
    return false;
  }
  return TAG_FORMAT_REGEX.test(tag);
}

/**
 * Validates an array of tags.
 * 
 * @param tags - The array of tags to validate
 * @returns ValidationResult with valid status and optional error message
 * 
 * **Validates: Requirements 5.4, 5.5**
 */
export function validateTags(tags: string[] | undefined | null): ValidationResult {
  // Tags are optional, so undefined/null is valid
  if (tags === undefined || tags === null) {
    return { valid: true };
  }
  
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }
  
  // Check tag count
  if (tags.length > MAX_TAGS) {
    return { valid: false, error: `Maximum ${MAX_TAGS} tags allowed` };
  }
  
  // Check each tag format
  for (const tag of tags) {
    if (!isValidTagFormat(tag)) {
      return { 
        valid: false, 
        error: `Invalid tag format: "${tag}". Tags must contain only alphanumeric characters and hyphens` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validates all upload metadata at once.
 * 
 * @param metadata - Object containing title, description, and tags
 * @returns ValidationResult with valid status and optional error message
 */
export function validateUploadMetadata(metadata: {
  title: string;
  description?: string | null;
  tags?: string[] | null;
}): ValidationResult {
  const titleResult = validateTitle(metadata.title);
  if (!titleResult.valid) {
    return titleResult;
  }
  
  const descriptionResult = validateDescription(metadata.description);
  if (!descriptionResult.valid) {
    return descriptionResult;
  }
  
  const tagsResult = validateTags(metadata.tags);
  if (!tagsResult.valid) {
    return tagsResult;
  }
  
  return { valid: true };
}

/**
 * Validates a file for upload.
 * 
 * @param file - Object containing mimeType and size
 * @returns ValidationResult with valid status and optional error message
 */
export function validateFile(file: { mimeType: string; size: number }): ValidationResult {
  if (!isValidMimeType(file.mimeType)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` 
    };
  }
  
  if (!isValidFileSize(file.size)) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    };
  }
  
  return { valid: true };
}
