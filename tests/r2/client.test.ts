/**
 * Unit tests for R2 storage client
 *
 * Feature: upload-pipeline
 *
 * **Validates: Requirements 6.1**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// Mock the AWS SDK modules before importing the client
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return { send: vi.fn() };
    }),
    PutObjectCommand: vi.fn().mockImplementation(function (params) {
      return params;
    }),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-r2.example.com/signed-url'),
}));

// Import after mocking
import { generateStorageKey, generatePresignedPutUrl, getCdnUrl } from '@/lib/r2/client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('R2 Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables for each test
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: 'test-account-id',
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
      R2_BUCKET_NAME: 'test-bucket',
      NEXT_PUBLIC_CDN_URL: 'https://cdn.bickqr.com',
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Tests for generateStorageKey function
   *
   * The storage key format should be: uploads/{bickId}/original.{extension}
   */
  describe('generateStorageKey', () => {
    it('generates correct key format for mp3 files', () => {
      const key = generateStorageKey('abc123', 'my-audio.mp3');
      expect(key).toBe('uploads/abc123/original.mp3');
    });

    it('generates correct key format for wav files', () => {
      const key = generateStorageKey('def456', 'recording.wav');
      expect(key).toBe('uploads/def456/original.wav');
    });

    it('generates correct key format for ogg files', () => {
      const key = generateStorageKey('ghi789', 'sound.ogg');
      expect(key).toBe('uploads/ghi789/original.ogg');
    });

    it('generates correct key format for m4a files', () => {
      const key = generateStorageKey('jkl012', 'audio.m4a');
      expect(key).toBe('uploads/jkl012/original.m4a');
    });

    it('defaults to mp3 extension when filename has no extension', () => {
      const key = generateStorageKey('mno345', 'audiofile');
      expect(key).toBe('uploads/mno345/original.mp3');
    });

    it('handles filenames with multiple dots', () => {
      const key = generateStorageKey('pqr678', 'my.audio.file.wav');
      expect(key).toBe('uploads/pqr678/original.wav');
    });

    it('converts extension to lowercase', () => {
      const key = generateStorageKey('stu901', 'audio.MP3');
      expect(key).toBe('uploads/stu901/original.mp3');
    });

    it('handles UUID-style bick IDs', () => {
      const key = generateStorageKey('550e8400-e29b-41d4-a716-446655440000', 'test.mp3');
      expect(key).toBe('uploads/550e8400-e29b-41d4-a716-446655440000/original.mp3');
    });

    /**
     * Property test: Storage key format
     *
     * For any valid bickId and filename, the generated key should:
     * 1. Start with 'uploads/'
     * 2. Contain the bickId
     * 3. End with '/original.{ext}'
     * 4. Have a valid extension
     */
    it('always produces valid storage key format (property test)', () => {
      // Generator for valid bick IDs (must start with alphanumeric, can contain hyphens)
      const bickIdArb = fc
        .tuple(
          fc.stringMatching(/^[a-zA-Z0-9]$/), // First char must be alphanumeric
          fc.stringMatching(/^[a-zA-Z0-9-]*$/) // Rest can include hyphens
        )
        .map(([first, rest]) => first + rest)
        .filter((s) => s.length > 0 && s.length <= 50);

      // Generator for valid filenames with extension (e.g., "audio.mp3")
      const filenameArb = fc
        .tuple(
          fc.stringMatching(/^[a-zA-Z0-9_-]+$/), // Base name
          fc.constantFrom('mp3', 'wav', 'ogg', 'm4a', 'MP3', 'WAV') // Extension
        )
        .map(([base, ext]) => `${base}.${ext}`)
        .filter((s) => s.length > 2 && s.length <= 50);

      fc.assert(
        fc.property(bickIdArb, filenameArb, (bickId, filename) => {
          const key = generateStorageKey(bickId, filename);

          // Key should start with 'uploads/'
          expect(key.startsWith('uploads/')).toBe(true);

          // Key should contain the bickId
          expect(key.includes(bickId)).toBe(true);

          // Key should contain '/original.'
          expect(key.includes('/original.')).toBe(true);

          // Key should match the expected pattern (extension is lowercase)
          const pattern = /^uploads\/[a-zA-Z0-9-]+\/original\.[a-z0-9]+$/;
          expect(pattern.test(key)).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Tests for generatePresignedPutUrl function
   */
  describe('generatePresignedPutUrl', () => {
    it('generates presigned URL with correct parameters', async () => {
      const result = await generatePresignedPutUrl({
        key: 'uploads/abc123/original.mp3',
        contentType: 'audio/mpeg',
      });

      expect(result.url).toBe('https://mock-r2.example.com/signed-url');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('uses default expiration of 3600 seconds', async () => {
      const beforeTime = Date.now();
      const result = await generatePresignedPutUrl({
        key: 'uploads/abc123/original.mp3',
        contentType: 'audio/mpeg',
      });
      const afterTime = Date.now();

      // expiresAt should be approximately 1 hour from now
      const expectedMinExpiry = beforeTime + 3600 * 1000;
      const expectedMaxExpiry = afterTime + 3600 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('respects custom expiration time', async () => {
      const customExpiresIn = 1800; // 30 minutes
      const beforeTime = Date.now();

      const result = await generatePresignedPutUrl({
        key: 'uploads/abc123/original.mp3',
        contentType: 'audio/mpeg',
        expiresIn: customExpiresIn,
      });

      const afterTime = Date.now();
      const expectedMinExpiry = beforeTime + customExpiresIn * 1000;
      const expectedMaxExpiry = afterTime + customExpiresIn * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('calls getSignedUrl with correct parameters', async () => {
      await generatePresignedPutUrl({
        key: 'uploads/test123/original.wav',
        contentType: 'audio/wav',
        expiresIn: 7200,
      });

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(), // S3Client instance
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'uploads/test123/original.wav',
          ContentType: 'audio/wav',
        }),
        { expiresIn: 7200 }
      );
    });

    it('throws error when R2_BUCKET_NAME is not set', async () => {
      delete process.env.R2_BUCKET_NAME;

      await expect(
        generatePresignedPutUrl({
          key: 'uploads/abc123/original.mp3',
          contentType: 'audio/mpeg',
        })
      ).rejects.toThrow('R2_BUCKET_NAME environment variable is not set');
    });
  });

  /**
   * Tests for getCdnUrl function
   */
  describe('getCdnUrl', () => {
    it('generates correct CDN URL', () => {
      const url = getCdnUrl('uploads/abc123/original.mp3');
      expect(url).toBe('https://cdn.bickqr.com/uploads/abc123/original.mp3');
    });

    it('handles CDN URL with trailing slash', () => {
      process.env.NEXT_PUBLIC_CDN_URL = 'https://cdn.bickqr.com/';
      const url = getCdnUrl('uploads/abc123/original.mp3');
      expect(url).toBe('https://cdn.bickqr.com/uploads/abc123/original.mp3');
    });

    it('throws error when NEXT_PUBLIC_CDN_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_CDN_URL;

      expect(() => getCdnUrl('uploads/abc123/original.mp3')).toThrow(
        'NEXT_PUBLIC_CDN_URL environment variable is not set'
      );
    });

    /**
     * Property test: CDN URL format
     *
     * For any valid storage key, the CDN URL should:
     * 1. Start with the CDN base URL
     * 2. Contain the storage key
     * 3. Not have double slashes (except in protocol)
     */
    it('always produces valid CDN URL format (property test)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.startsWith('/')),
          (key) => {
            const url = getCdnUrl(key);

            // URL should start with CDN base
            expect(url.startsWith('https://cdn.bickqr.com/')).toBe(true);

            // URL should contain the key
            expect(url.endsWith(key)).toBe(true);

            // URL should not have double slashes (except in https://)
            const urlWithoutProtocol = url.replace('https://', '');
            expect(urlWithoutProtocol.includes('//')).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Integration-style tests for the full upload URL flow
 */
describe('R2 Upload URL Flow', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: 'test-account-id',
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
      R2_BUCKET_NAME: 'test-bucket',
      NEXT_PUBLIC_CDN_URL: 'https://cdn.bickqr.com',
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('generates storage key and presigned URL for upload flow', async () => {
    const bickId = 'test-bick-123';
    const filename = 'my-audio.mp3';

    // Step 1: Generate storage key
    const storageKey = generateStorageKey(bickId, filename);
    expect(storageKey).toBe('uploads/test-bick-123/original.mp3');

    // Step 2: Generate presigned URL
    const { url, expiresAt } = await generatePresignedPutUrl({
      key: storageKey,
      contentType: 'audio/mpeg',
    });

    expect(url).toBeDefined();
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Step 3: Generate CDN URL for later access
    const cdnUrl = getCdnUrl(storageKey);
    expect(cdnUrl).toBe('https://cdn.bickqr.com/uploads/test-bick-123/original.mp3');
  });

  it('handles various audio file types in upload flow', async () => {
    const testCases = [
      { filename: 'audio.mp3', contentType: 'audio/mpeg', expectedExt: 'mp3' },
      { filename: 'audio.wav', contentType: 'audio/wav', expectedExt: 'wav' },
      { filename: 'audio.ogg', contentType: 'audio/ogg', expectedExt: 'ogg' },
      { filename: 'audio.m4a', contentType: 'audio/mp4', expectedExt: 'm4a' },
    ];

    for (const { filename, contentType, expectedExt } of testCases) {
      const bickId = `bick-${expectedExt}`;
      const storageKey = generateStorageKey(bickId, filename);

      expect(storageKey).toBe(`uploads/${bickId}/original.${expectedExt}`);

      const { url } = await generatePresignedPutUrl({
        key: storageKey,
        contentType,
      });

      expect(url).toBeDefined();
    }
  });
});
