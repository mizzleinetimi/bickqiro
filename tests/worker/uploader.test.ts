/**
 * Asset Uploader Tests
 * 
 * Tests for storage key generation and upload utilities.
 * 
 * **Property 4: Storage Key Format**
 * **Validates: Requirements 2.4, 3.5, 4.5**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateStorageKey } from '../../worker/lib/uploader';

describe('Storage Key Generation', () => {
  describe('generateStorageKey', () => {
    it('should generate correct key for waveform.json', () => {
      const key = generateStorageKey('abc123', 'waveform.json');
      expect(key).toBe('uploads/abc123/waveform.json');
    });

    it('should generate correct key for og.png', () => {
      const key = generateStorageKey('def456', 'og.png');
      expect(key).toBe('uploads/def456/og.png');
    });

    it('should generate correct key for teaser.mp4', () => {
      const key = generateStorageKey('ghi789', 'teaser.mp4');
      expect(key).toBe('uploads/ghi789/teaser.mp4');
    });

    it('should handle UUID-style bickIds', () => {
      const uuid = 'e8fc7f3c-b51d-47df-8855-725ec6d88a23';
      const key = generateStorageKey(uuid, 'og.png');
      expect(key).toBe(`uploads/${uuid}/og.png`);
    });
  });
});

/**
 * Property 4: Storage Key Format
 * 
 * For any bickId and asset type, the generated storage key SHALL match
 * the pattern `uploads/{bickId}/{assetName}` where assetName is one of:
 * `waveform.json`, `og.png`, `teaser.mp4`.
 */
describe('Property 4: Storage Key Format', () => {
  const VALID_ASSET_NAMES = ['waveform.json', 'og.png', 'teaser.mp4'];
  const STORAGE_KEY_PATTERN = /^uploads\/[a-zA-Z0-9-]+\/(waveform\.json|og\.png|teaser\.mp4)$/;

  it('should always match the expected pattern for valid asset names', () => {
    fc.assert(
      fc.property(
        // Generate UUID-like strings for bickId
        fc.uuid(),
        fc.constantFrom(...VALID_ASSET_NAMES),
        (bickId, assetName) => {
          const key = generateStorageKey(bickId, assetName);
          
          // Verify pattern match
          expect(key).toMatch(STORAGE_KEY_PATTERN);
          
          // Verify structure
          expect(key.startsWith('uploads/')).toBe(true);
          expect(key.includes(bickId)).toBe(true);
          expect(key.endsWith(assetName)).toBe(true);
          
          // Verify exact format
          expect(key).toBe(`uploads/${bickId}/${assetName}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce unique keys for different bickIds', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom(...VALID_ASSET_NAMES),
        (bickId1, bickId2, assetName) => {
          fc.pre(bickId1 !== bickId2);
          
          const key1 = generateStorageKey(bickId1, assetName);
          const key2 = generateStorageKey(bickId2, assetName);
          
          expect(key1).not.toBe(key2);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should produce different keys for different asset types', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (bickId) => {
          const waveformKey = generateStorageKey(bickId, 'waveform.json');
          const ogKey = generateStorageKey(bickId, 'og.png');
          const teaserKey = generateStorageKey(bickId, 'teaser.mp4');
          
          // All keys should be different
          expect(waveformKey).not.toBe(ogKey);
          expect(waveformKey).not.toBe(teaserKey);
          expect(ogKey).not.toBe(teaserKey);
          
          // But all should share the same bickId prefix
          const prefix = `uploads/${bickId}/`;
          expect(waveformKey.startsWith(prefix)).toBe(true);
          expect(ogKey.startsWith(prefix)).toBe(true);
          expect(teaserKey.startsWith(prefix)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
