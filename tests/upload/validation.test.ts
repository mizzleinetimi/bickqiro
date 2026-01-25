/**
 * Property-based tests for upload validation utilities
 * 
 * Feature: upload-pipeline
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 5.1, 5.2, 5.4, 5.5**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isValidMimeType,
  isValidFileSize,
  validateTitle,
  validateDescription,
  validateTags,
  isValidTagFormat,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_TAGS,
} from '@/lib/upload/validation';

/**
 * Feature: upload-pipeline, Property 1: MIME Type Validation
 * 
 * *For any* file with a MIME type, the validation function SHALL accept the file
 * if and only if the MIME type is one of: audio/mpeg, audio/wav, audio/ogg, audio/mp4.
 * 
 * **Validates: Requirements 1.1, 1.3**
 */
describe('Property 1: MIME Type Validation', () => {
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];

  it('accepts valid MIME types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTypes),
        (mimeType) => isValidMimeType(mimeType) === true
      ),
      { numRuns: 100 }
    );
  });

  it('rejects invalid MIME types', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !validTypes.includes(s)),
        (mimeType) => isValidMimeType(mimeType) === false
      ),
      { numRuns: 100 }
    );
  });

  it('rejects common non-media MIME types', () => {
    const invalidTypes = [
      'text/plain',
      'application/json',
      'image/png',
      'image/jpeg',
      'audio/x-wav', // Close but not exact
      'audio/mp3',   // Common mistake, should be audio/mpeg
    ];
    
    for (const mimeType of invalidTypes) {
      expect(isValidMimeType(mimeType)).toBe(false);
    }
  });

  it('accepts video MIME types for audio extraction', () => {
    const validVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];
    
    for (const mimeType of validVideoTypes) {
      expect(isValidMimeType(mimeType)).toBe(true);
    }
  });

  it('is case-sensitive', () => {
    // MIME types should be case-sensitive per RFC
    expect(isValidMimeType('AUDIO/MPEG')).toBe(false);
    expect(isValidMimeType('Audio/Mpeg')).toBe(false);
  });
});

/**
 * Feature: upload-pipeline, Property 2: File Size Validation
 * 
 * *For any* file size in bytes, the validation function SHALL reject the file
 * if and only if the size exceeds 10,485,760 bytes (10MB).
 * 
 * **Validates: Requirements 1.2**
 */
describe('Property 2: File Size Validation', () => {
  it('accepts files within size limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_FILE_SIZE }),
        (size) => isValidFileSize(size) === true
      ),
      { numRuns: 100 }
    );
  });

  it('rejects files exceeding size limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 }),
        (size) => isValidFileSize(size) === false
      ),
      { numRuns: 100 }
    );
  });

  it('accepts exactly 10MB', () => {
    expect(isValidFileSize(MAX_FILE_SIZE)).toBe(true);
  });

  it('rejects 10MB + 1 byte', () => {
    expect(isValidFileSize(MAX_FILE_SIZE + 1)).toBe(false);
  });

  it('accepts zero-byte files', () => {
    expect(isValidFileSize(0)).toBe(true);
  });

  it('rejects negative sizes', () => {
    expect(isValidFileSize(-1)).toBe(false);
    expect(isValidFileSize(-1000)).toBe(false);
  });
});

/**
 * Feature: upload-pipeline, Property 6: Title Validation
 * 
 * *For any* string, the title validation function SHALL accept the string
 * if and only if its length is between 1 and 100 characters inclusive.
 * 
 * **Validates: Requirements 5.1**
 */
describe('Property 6: Title Validation', () => {
  it('accepts titles with valid length (1-100 characters)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: TITLE_MIN_LENGTH, maxLength: TITLE_MAX_LENGTH }),
        (title) => validateTitle(title).valid === true
      ),
      { numRuns: 100 }
    );
  });

  it('rejects empty titles', () => {
    const result = validateTitle('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects titles exceeding 100 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: TITLE_MAX_LENGTH + 1, maxLength: TITLE_MAX_LENGTH + 100 }),
        (title) => validateTitle(title).valid === false
      ),
      { numRuns: 100 }
    );
  });

  it('accepts exactly 1 character', () => {
    expect(validateTitle('a').valid).toBe(true);
  });

  it('accepts exactly 100 characters', () => {
    const title = 'a'.repeat(100);
    expect(validateTitle(title).valid).toBe(true);
  });

  it('rejects 101 characters', () => {
    const title = 'a'.repeat(101);
    expect(validateTitle(title).valid).toBe(false);
  });

  it('accepts titles with unicode characters', () => {
    // Unicode characters count as their string length
    expect(validateTitle('🎵 Music').valid).toBe(true);
    expect(validateTitle('日本語タイトル').valid).toBe(true);
  });
});

/**
 * Feature: upload-pipeline, Property 7: Description Validation
 * 
 * *For any* string, the description validation function SHALL accept the string
 * if and only if its length is at most 500 characters.
 * 
 * **Validates: Requirements 5.2**
 */
describe('Property 7: Description Validation', () => {
  it('accepts descriptions within limit (0-500 characters)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: DESCRIPTION_MAX_LENGTH }),
        (description) => validateDescription(description).valid === true
      ),
      { numRuns: 100 }
    );
  });

  it('rejects descriptions exceeding 500 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: DESCRIPTION_MAX_LENGTH + 1, maxLength: DESCRIPTION_MAX_LENGTH + 200 }),
        (description) => validateDescription(description).valid === false
      ),
      { numRuns: 100 }
    );
  });

  it('accepts empty description', () => {
    expect(validateDescription('').valid).toBe(true);
  });

  it('accepts undefined description (optional field)', () => {
    expect(validateDescription(undefined).valid).toBe(true);
  });

  it('accepts null description (optional field)', () => {
    expect(validateDescription(null).valid).toBe(true);
  });

  it('accepts exactly 500 characters', () => {
    const description = 'a'.repeat(500);
    expect(validateDescription(description).valid).toBe(true);
  });

  it('rejects 501 characters', () => {
    const description = 'a'.repeat(501);
    expect(validateDescription(description).valid).toBe(false);
  });
});

/**
 * Feature: upload-pipeline, Property 8: Tag Format Validation
 * 
 * *For any* string, the tag validation function SHALL accept the string
 * if and only if it contains only alphanumeric characters and hyphens.
 * 
 * **Validates: Requirements 5.4**
 */
describe('Property 8: Tag Format Validation', () => {
  // Generator for valid tags: alphanumeric and hyphens only
  const validTagArb = fc.stringMatching(/^[a-zA-Z0-9-]+$/);

  it('accepts tags with only alphanumeric characters and hyphens', () => {
    fc.assert(
      fc.property(
        validTagArb,
        (tag) => isValidTagFormat(tag) === true
      ),
      { numRuns: 100 }
    );
  });

  it('rejects tags with special characters', () => {
    const invalidTags = [
      'tag with space',
      'tag_underscore',
      'tag.dot',
      'tag@symbol',
      'tag#hash',
      'tag!exclaim',
      'tag$dollar',
      'tag%percent',
    ];
    
    for (const tag of invalidTags) {
      expect(isValidTagFormat(tag)).toBe(false);
    }
  });

  it('rejects empty tags', () => {
    expect(isValidTagFormat('')).toBe(false);
  });

  it('accepts valid example tags', () => {
    const validTags = [
      'funny',
      'trending-2024',
      'music',
      'hip-hop',
      'sound-effect',
      'meme123',
      'ABC',
      'a',
      '123',
    ];
    
    for (const tag of validTags) {
      expect(isValidTagFormat(tag)).toBe(true);
    }
  });

  it('validates tags in array correctly', () => {
    const validResult = validateTags(['funny', 'trending', 'music-2024']);
    expect(validResult.valid).toBe(true);

    const invalidResult = validateTags(['funny', 'invalid tag', 'music']);
    expect(invalidResult.valid).toBe(false);
  });
});

/**
 * Feature: upload-pipeline, Property 9: Tag Count Validation
 * 
 * *For any* array of tags, the validation function SHALL reject the array
 * if and only if it contains more than 10 elements.
 * 
 * **Validates: Requirements 5.5**
 */
describe('Property 9: Tag Count Validation', () => {
  // Generator for valid tag strings
  const validTagArb = fc.stringMatching(/^[a-zA-Z0-9-]+$/);

  it('accepts arrays with 0-10 valid tags', () => {
    fc.assert(
      fc.property(
        fc.array(validTagArb, { minLength: 0, maxLength: MAX_TAGS }),
        (tags) => validateTags(tags).valid === true
      ),
      { numRuns: 100 }
    );
  });

  it('rejects arrays with more than 10 tags', () => {
    fc.assert(
      fc.property(
        fc.array(validTagArb, { minLength: MAX_TAGS + 1, maxLength: MAX_TAGS + 10 }),
        (tags) => validateTags(tags).valid === false
      ),
      { numRuns: 100 }
    );
  });

  it('accepts empty array', () => {
    expect(validateTags([]).valid).toBe(true);
  });

  it('accepts undefined tags (optional field)', () => {
    expect(validateTags(undefined).valid).toBe(true);
  });

  it('accepts null tags (optional field)', () => {
    expect(validateTags(null).valid).toBe(true);
  });

  it('accepts exactly 10 tags', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    expect(validateTags(tags).valid).toBe(true);
  });

  it('rejects 11 tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(validateTags(tags).valid).toBe(false);
  });
});
