/**
 * Property-based tests for API validation errors
 * 
 * Feature: upload-pipeline
 * 
 * Tests Property 15: API Validation Errors
 * 
 * **Validates: Requirements 9.4**
 */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import 'dotenv/config';

// Mock the R2 client to avoid actual R2 calls
vi.mock('@/lib/r2/client', () => ({
  generatePresignedPutUrl: vi.fn().mockResolvedValue({
    url: 'https://mock-r2.example.com/upload',
    expiresAt: new Date(Date.now() + 3600000),
  }),
  generateStorageKey: vi.fn().mockImplementation((bickId: string, filename: string) => {
    const ext = filename.split('.').pop() || 'mp3';
    return `uploads/${bickId}/original.${ext}`;
  }),
  getCdnUrl: vi.fn().mockImplementation((key: string) => `https://cdn.example.com/${key}`),
}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', async () => {
  return {
    createClient: vi.fn().mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }),
    createAdminClient: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'mock-bick-id' }, 
              error: null 
            }),
          }),
        }),
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'mock-tag-id' }, 
              error: null 
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'mock-bick-id', status: 'processing', original_filename: 'test.mp3' }, 
              error: null 
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  };
});

// Mock the queue
vi.mock('@/lib/queue/queues', () => ({
  enqueueBickProcessing: vi.fn().mockResolvedValue('mock-job-id'),
}));

/**
 * Helper to call the extract-url API
 */
async function callExtractUrl(body: unknown) {
  const { POST } = await import('@/app/api/bicks/extract-url/route');
  
  const request = new Request('http://localhost:3000/api/bicks/extract-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const response = await POST(request as any);
  const data = await response.json();
  
  return { response, data, status: response.status };
}

/**
 * Helper to call the upload-session API
 */
async function callUploadSession(body: unknown) {
  const { POST } = await import('@/app/api/bicks/upload-session/route');
  
  const request = new Request('http://localhost:3000/api/bicks/upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const response = await POST(request as any);
  const data = await response.json();
  
  return { response, data, status: response.status };
}

/**
 * Helper to call the complete API
 */
async function callComplete(bickId: string, body: unknown) {
  const { POST } = await import('@/app/api/bicks/[id]/complete/route');
  
  const request = new Request(`http://localhost:3000/api/bicks/${bickId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const response = await POST(request as any, { params: Promise.resolve({ id: bickId }) });
  const data = await response.json();
  
  return { response, data, status: response.status };
}

/**
 * Feature: upload-pipeline, Property 15: API Validation Errors
 * 
 * *For any* API request with invalid data, the response SHALL have status 400
 * and include a JSON body with error details.
 * 
 * **Validates: Requirements 9.4**
 */
describe('Property 15: API Validation Errors', () => {
  describe('POST /api/bicks/extract-url', () => {
    it('returns 400 for missing URL', async () => {
      const { status, data } = await callExtractUrl({});
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.code).toBeDefined();
    });

    it('returns 400 for empty URL', async () => {
      const { status, data } = await callExtractUrl({ url: '' });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('returns 400 for unsupported platform URLs', async () => {
      const unsupportedUrls = [
        'https://www.facebook.com/video/123',
        'https://www.vimeo.com/123456',
        'https://www.dailymotion.com/video/abc',
        'https://www.example.com/video',
      ];
      
      for (const url of unsupportedUrls) {
        const { status, data } = await callExtractUrl({ url });
        
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('UNSUPPORTED_PLATFORM');
      }
    });

    it('returns 400 with error details for any invalid URL string', async () => {
      // Generate random strings that are not valid platform URLs
      const invalidUrlArb = fc.string().filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 0 && 
          !trimmed.includes('youtube') && 
          !trimmed.includes('youtu.be') &&
          !trimmed.includes('tiktok') &&
          !trimmed.includes('instagram') &&
          !trimmed.includes('twitter') &&
          !trimmed.includes('x.com');
      });
      
      await fc.assert(
        fc.asyncProperty(
          invalidUrlArb,
          async (url) => {
            const { status, data } = await callExtractUrl({ url });
            
            // Should return 400 for invalid/unsupported URLs
            expect(status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBeDefined();
            expect(typeof data.error).toBe('string');
            expect(data.code).toBeDefined();
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('POST /api/bicks/upload-session', () => {
    it('returns 400 for missing title', async () => {
      const { status, data } = await callUploadSession({
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.title).toBeDefined();
    });

    it('returns 400 for empty title', async () => {
      const { status, data } = await callUploadSession({
        title: '',
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for title exceeding 100 characters', async () => {
      const longTitle = 'a'.repeat(101);
      const { status, data } = await callUploadSession({
        title: longTitle,
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.title).toBeDefined();
    });

    it('returns 400 for description exceeding 500 characters', async () => {
      const longDescription = 'a'.repeat(501);
      const { status, data } = await callUploadSession({
        title: 'Valid Title',
        description: longDescription,
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.description).toBeDefined();
    });

    it('returns 400 for more than 10 tags', async () => {
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const { status, data } = await callUploadSession({
        title: 'Valid Title',
        tags: tooManyTags,
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.tags).toBeDefined();
    });

    it('returns 400 for invalid tag format', async () => {
      const { status, data } = await callUploadSession({
        title: 'Valid Title',
        tags: ['valid-tag', 'invalid tag with spaces'],
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.tags).toBeDefined();
    });

    it('returns 400 for missing filename', async () => {
      const { status, data } = await callUploadSession({
        title: 'Valid Title',
        contentType: 'audio/mpeg',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.filename).toBeDefined();
    });

    it('returns 400 for missing contentType', async () => {
      const { status, data } = await callUploadSession({
        title: 'Valid Title',
        filename: 'test.mp3',
        durationMs: 5000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.contentType).toBeDefined();
    });

    it('returns 400 for invalid durationMs', async () => {
      const invalidDurations = [0, -1, -1000];
      
      for (const durationMs of invalidDurations) {
        const { status, data } = await callUploadSession({
          title: 'Valid Title',
          filename: 'test.mp3',
          contentType: 'audio/mpeg',
          durationMs,
        });
        
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns 400 with structured error response for any invalid request', async () => {
      // Generate invalid titles (empty or too long)
      const invalidTitleArb = fc.oneof(
        fc.constant(''),
        fc.string({ minLength: 101, maxLength: 200 })
      );
      
      await fc.assert(
        fc.asyncProperty(
          invalidTitleArb,
          async (title) => {
            const { status, data } = await callUploadSession({
              title,
              filename: 'test.mp3',
              contentType: 'audio/mpeg',
              durationMs: 5000,
            });
            
            expect(status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBeDefined();
            expect(typeof data.error).toBe('string');
            expect(data.code).toBe('VALIDATION_ERROR');
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('POST /api/bicks/[id]/complete', () => {
    it('returns 400 for missing storageKey', async () => {
      const { status, data } = await callComplete('test-bick-id', {
        sizeBytes: 1000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for empty storageKey', async () => {
      const { status, data } = await callComplete('test-bick-id', {
        storageKey: '',
        sizeBytes: 1000,
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing sizeBytes', async () => {
      const { status, data } = await callComplete('test-bick-id', {
        storageKey: 'uploads/test/original.mp3',
      });
      
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid sizeBytes', async () => {
      const invalidSizes = [0, -1, -1000];
      
      for (const sizeBytes of invalidSizes) {
        const { status, data } = await callComplete('test-bick-id', {
          storageKey: 'uploads/test/original.mp3',
          sizeBytes,
        });
        
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns 400 for invalid JSON body', async () => {
      const { POST } = await import('@/app/api/bicks/[id]/complete/route');
      
      const request = new Request('http://localhost:3000/api/bicks/test-id/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });
      
      const response = await POST(request as any, { params: Promise.resolve({ id: 'test-id' }) });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Response Structure', () => {
    it('all validation errors include success: false', async () => {
      const invalidRequests = [
        () => callExtractUrl({}),
        () => callUploadSession({}),
        () => callComplete('test-id', {}),
      ];
      
      for (const makeRequest of invalidRequests) {
        const { data } = await makeRequest();
        expect(data.success).toBe(false);
      }
    });

    it('all validation errors include error message string', async () => {
      const invalidRequests = [
        () => callExtractUrl({}),
        () => callUploadSession({}),
        () => callComplete('test-id', {}),
      ];
      
      for (const makeRequest of invalidRequests) {
        const { data } = await makeRequest();
        expect(typeof data.error).toBe('string');
        expect(data.error.length).toBeGreaterThan(0);
      }
    });

    it('all validation errors include error code', async () => {
      const invalidRequests = [
        () => callExtractUrl({}),
        () => callUploadSession({}),
        () => callComplete('test-id', {}),
      ];
      
      for (const makeRequest of invalidRequests) {
        const { data } = await makeRequest();
        expect(data.code).toBeDefined();
        expect(typeof data.code).toBe('string');
      }
    });
  });
});
