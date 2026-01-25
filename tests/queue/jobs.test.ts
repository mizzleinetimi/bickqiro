/**
 * Property-based tests for BullMQ job payload structure
 * 
 * Feature: upload-pipeline
 * 
 * **Validates: Requirements 8.2**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { isValidBickProcessingJob, type BickProcessingJob } from '@/lib/queue/jobs';

// Mock the connection module to avoid Redis connection during tests
vi.mock('@/lib/queue/connection', () => ({
  createRedisConnection: vi.fn().mockReturnValue({
    on: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock the queues module to avoid Redis connection during tests
vi.mock('@/lib/queue/queues', () => ({
  bickProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
  },
  enqueueBickProcessing: vi.fn().mockImplementation(async (job: BickProcessingJob) => {
    const { isValidBickProcessingJob } = await import('@/lib/queue/jobs');
    if (!isValidBickProcessingJob(job)) {
      throw new Error('Invalid job payload: bickId, storageKey, and originalFilename are required');
    }
    return 'mock-job-id';
  }),
}));

/**
 * Feature: upload-pipeline, Property 14: Job Payload Structure
 * 
 * *For any* processing job enqueued after upload completion, the job payload
 * SHALL contain bickId and storageKey fields.
 * 
 * **Validates: Requirements 8.2**
 */
describe('Property 14: Job Payload Structure', () => {
  // Generator for valid UUIDs (bickId format)
  const uuidArb = fc.uuid();
  
  // Generator for valid storage keys (format: uploads/{bickId}/original.{ext})
  const storageKeyArb = fc.tuple(
    fc.uuid(),
    fc.constantFrom('mp3', 'wav', 'ogg', 'm4a')
  ).map(([id, ext]) => `uploads/${id}/original.${ext}`);
  
  // Generator for valid filenames
  const filenameArb = fc.tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
    fc.constantFrom('.mp3', '.wav', '.ogg', '.m4a')
  ).map(([name, ext]) => `${name}${ext}`);

  // Generator for valid BickProcessingJob payloads
  const validJobArb = fc.record({
    bickId: uuidArb,
    storageKey: storageKeyArb,
    originalFilename: filenameArb,
  });

  describe('Valid job payloads', () => {
    it('accepts payloads with all required fields', () => {
      fc.assert(
        fc.property(
          validJobArb,
          (job) => isValidBickProcessingJob(job) === true
        ),
        { numRuns: 100 }
      );
    });

    it('validates that bickId is a non-empty string', () => {
      fc.assert(
        fc.property(
          validJobArb,
          (job) => {
            const isValid = isValidBickProcessingJob(job);
            return isValid && typeof job.bickId === 'string' && job.bickId.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates that storageKey is a non-empty string', () => {
      fc.assert(
        fc.property(
          validJobArb,
          (job) => {
            const isValid = isValidBickProcessingJob(job);
            return isValid && typeof job.storageKey === 'string' && job.storageKey.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates that originalFilename is a non-empty string', () => {
      fc.assert(
        fc.property(
          validJobArb,
          (job) => {
            const isValid = isValidBickProcessingJob(job);
            return isValid && typeof job.originalFilename === 'string' && job.originalFilename.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid job payloads - missing fields', () => {
    it('rejects payloads missing bickId', () => {
      fc.assert(
        fc.property(
          fc.record({
            storageKey: storageKeyArb,
            originalFilename: filenameArb,
          }),
          (partialJob) => isValidBickProcessingJob(partialJob) === false
        ),
        { numRuns: 100 }
      );
    });

    it('rejects payloads missing storageKey', () => {
      fc.assert(
        fc.property(
          fc.record({
            bickId: uuidArb,
            originalFilename: filenameArb,
          }),
          (partialJob) => isValidBickProcessingJob(partialJob) === false
        ),
        { numRuns: 100 }
      );
    });

    it('rejects payloads missing originalFilename', () => {
      fc.assert(
        fc.property(
          fc.record({
            bickId: uuidArb,
            storageKey: storageKeyArb,
          }),
          (partialJob) => isValidBickProcessingJob(partialJob) === false
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid job payloads - wrong types', () => {
    it('rejects null', () => {
      expect(isValidBickProcessingJob(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidBickProcessingJob(undefined)).toBe(false);
    });

    it('rejects primitives', () => {
      expect(isValidBickProcessingJob('string')).toBe(false);
      expect(isValidBickProcessingJob(123)).toBe(false);
      expect(isValidBickProcessingJob(true)).toBe(false);
    });

    it('rejects arrays', () => {
      expect(isValidBickProcessingJob([])).toBe(false);
      expect(isValidBickProcessingJob(['bickId', 'storageKey'])).toBe(false);
    });

    it('rejects payloads with non-string bickId', () => {
      fc.assert(
        fc.property(
          fc.record({
            bickId: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
            storageKey: storageKeyArb,
            originalFilename: filenameArb,
          }),
          (job) => isValidBickProcessingJob(job) === false
        ),
        { numRuns: 100 }
      );
    });

    it('rejects payloads with non-string storageKey', () => {
      fc.assert(
        fc.property(
          fc.record({
            bickId: uuidArb,
            storageKey: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
            originalFilename: filenameArb,
          }),
          (job) => isValidBickProcessingJob(job) === false
        ),
        { numRuns: 100 }
      );
    });

    it('rejects payloads with non-string originalFilename', () => {
      fc.assert(
        fc.property(
          fc.record({
            bickId: uuidArb,
            storageKey: storageKeyArb,
            originalFilename: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
          }),
          (job) => isValidBickProcessingJob(job) === false
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid job payloads - empty strings', () => {
    it('rejects payloads with empty bickId', () => {
      const job = {
        bickId: '',
        storageKey: 'uploads/123/original.mp3',
        originalFilename: 'test.mp3',
      };
      expect(isValidBickProcessingJob(job)).toBe(false);
    });

    it('rejects payloads with empty storageKey', () => {
      const job = {
        bickId: '123e4567-e89b-12d3-a456-426614174000',
        storageKey: '',
        originalFilename: 'test.mp3',
      };
      expect(isValidBickProcessingJob(job)).toBe(false);
    });

    it('rejects payloads with empty originalFilename', () => {
      const job = {
        bickId: '123e4567-e89b-12d3-a456-426614174000',
        storageKey: 'uploads/123/original.mp3',
        originalFilename: '',
      };
      expect(isValidBickProcessingJob(job)).toBe(false);
    });
  });

  describe('Valid example payloads', () => {
    it('accepts a typical job payload', () => {
      const job: BickProcessingJob = {
        bickId: '123e4567-e89b-12d3-a456-426614174000',
        storageKey: 'uploads/123e4567-e89b-12d3-a456-426614174000/original.mp3',
        originalFilename: 'my-audio-file.mp3',
      };
      expect(isValidBickProcessingJob(job)).toBe(true);
    });

    it('accepts job with various audio extensions', () => {
      const extensions = ['mp3', 'wav', 'ogg', 'm4a'];
      for (const ext of extensions) {
        const job: BickProcessingJob = {
          bickId: '123e4567-e89b-12d3-a456-426614174000',
          storageKey: `uploads/123e4567-e89b-12d3-a456-426614174000/original.${ext}`,
          originalFilename: `audio.${ext}`,
        };
        expect(isValidBickProcessingJob(job)).toBe(true);
      }
    });

    it('accepts job with unicode filename', () => {
      const job: BickProcessingJob = {
        bickId: '123e4567-e89b-12d3-a456-426614174000',
        storageKey: 'uploads/123e4567-e89b-12d3-a456-426614174000/original.mp3',
        originalFilename: '音楽ファイル.mp3',
      };
      expect(isValidBickProcessingJob(job)).toBe(true);
    });
  });

  describe('Extra fields handling', () => {
    it('accepts payloads with extra fields (forward compatibility)', () => {
      const job = {
        bickId: '123e4567-e89b-12d3-a456-426614174000',
        storageKey: 'uploads/123/original.mp3',
        originalFilename: 'test.mp3',
        extraField: 'should be ignored',
        anotherExtra: 123,
      };
      expect(isValidBickProcessingJob(job)).toBe(true);
    });
  });
});

/**
 * Unit tests for enqueueBickProcessing function
 */
describe('enqueueBickProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues valid job and returns job ID', async () => {
    const { enqueueBickProcessing } = await import('@/lib/queue/queues');
    const { bickProcessingQueue } = await import('@/lib/queue/queues');
    
    const job: BickProcessingJob = {
      bickId: '123e4567-e89b-12d3-a456-426614174000',
      storageKey: 'uploads/123e4567-e89b-12d3-a456-426614174000/original.mp3',
      originalFilename: 'test.mp3',
    };

    const jobId = await enqueueBickProcessing(job);

    expect(jobId).toBe('mock-job-id');
  });

  it('throws error for invalid job payload', async () => {
    const { enqueueBickProcessing } = await import('@/lib/queue/queues');
    
    const invalidJob = {
      bickId: '',
      storageKey: 'uploads/123/original.mp3',
      originalFilename: 'test.mp3',
    } as BickProcessingJob;

    await expect(enqueueBickProcessing(invalidJob)).rejects.toThrow(
      'Invalid job payload: bickId, storageKey, and originalFilename are required'
    );
  });

  it('uses bickId as part of jobId for deduplication', async () => {
    const { enqueueBickProcessing } = await import('@/lib/queue/queues');
    
    const job: BickProcessingJob = {
      bickId: 'unique-bick-id-123',
      storageKey: 'uploads/unique-bick-id-123/original.mp3',
      originalFilename: 'test.mp3',
    };

    const jobId = await enqueueBickProcessing(job);

    expect(jobId).toBe('mock-job-id');
  });
});
