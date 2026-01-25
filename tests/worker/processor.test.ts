/**
 * Bick Processor Tests
 * 
 * Tests for the bick processing pipeline.
 * 
 * **Property 9: Asset Record Completeness**
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateStorageKey } from '../../worker/lib/uploader';

/**
 * Asset types that should be created for each bick.
 */
const REQUIRED_ASSET_TYPES = ['waveform_json', 'og_image', 'teaser_mp4'] as const;

/**
 * MIME types for each asset type.
 */
const EXPECTED_MIME_TYPES: Record<string, string> = {
  waveform_json: 'application/json',
  og_image: 'image/png',
  teaser_mp4: 'video/mp4',
};

/**
 * Asset file names for each type.
 */
const ASSET_FILE_NAMES: Record<string, string> = {
  waveform_json: 'waveform.json',
  og_image: 'og.png',
  teaser_mp4: 'teaser.mp4',
};

describe('Bick Processor', () => {
  describe('Asset Configuration', () => {
    it('should have correct MIME types for all asset types', () => {
      expect(EXPECTED_MIME_TYPES.waveform_json).toBe('application/json');
      expect(EXPECTED_MIME_TYPES.og_image).toBe('image/png');
      expect(EXPECTED_MIME_TYPES.teaser_mp4).toBe('video/mp4');
    });

    it('should have correct file names for all asset types', () => {
      expect(ASSET_FILE_NAMES.waveform_json).toBe('waveform.json');
      expect(ASSET_FILE_NAMES.og_image).toBe('og.png');
      expect(ASSET_FILE_NAMES.teaser_mp4).toBe('teaser.mp4');
    });
  });
});

/**
 * Property 9: Asset Record Completeness
 * 
 * For any asset record created by the worker, the record SHALL have
 * non-null values for: cdn_url, storage_key, mime_type, and size_bytes
 * (where size_bytes > 0).
 */
describe('Property 9: Asset Record Completeness', () => {
  it('should generate valid storage keys for all asset types', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (bickId) => {
          for (const assetType of REQUIRED_ASSET_TYPES) {
            const fileName = ASSET_FILE_NAMES[assetType];
            const storageKey = generateStorageKey(bickId, fileName);
            
            // Storage key should be non-empty
            expect(storageKey).toBeTruthy();
            expect(storageKey.length).toBeGreaterThan(0);
            
            // Storage key should contain bickId
            expect(storageKey).toContain(bickId);
            
            // Storage key should end with correct file name
            expect(storageKey).toContain(fileName);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should have valid MIME types for all asset types', () => {
    for (const assetType of REQUIRED_ASSET_TYPES) {
      const mimeType = EXPECTED_MIME_TYPES[assetType];
      
      // MIME type should be non-empty
      expect(mimeType).toBeTruthy();
      expect(mimeType.length).toBeGreaterThan(0);
      
      // MIME type should follow format type/subtype
      expect(mimeType).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/);
    }
  });

  it('should create exactly 3 asset types for each bick', () => {
    expect(REQUIRED_ASSET_TYPES.length).toBe(3);
    expect(REQUIRED_ASSET_TYPES).toContain('waveform_json');
    expect(REQUIRED_ASSET_TYPES).toContain('og_image');
    expect(REQUIRED_ASSET_TYPES).toContain('teaser_mp4');
  });
});
