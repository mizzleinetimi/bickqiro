/**
 * Property-based tests for upload-session API route
 * 
 * Feature: upload-pipeline
 * 
 * Tests Properties 11, 12, 13 for bick creation through the upload-session endpoint.
 * 
 * **Validates: Requirements 7.1, 7.4, 7.5, 7.6**
 */
import { describe, it, expect, beforeEach, afterAll, vi, beforeAll } from 'vitest';
import fc from 'fast-check';
import 'dotenv/config';

// Check if we have real database connection
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_DB_CONNECTION = !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// Track created bicks for cleanup
const createdBickIds: string[] = [];
let mockBickId = 0;

// Create mock database storage
const mockBicks: Map<string, {
  id: string;
  status: string;
  owner_id: string | null;
  source_url: string | null;
  original_filename: string | null;
  duration_ms: number | null;
  original_duration_ms: number | null;
  slug: string;
  title: string;
}> = new Map();

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
}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', async () => {
  return {
    createClient: vi.fn().mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }),
    createAdminClient: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'bicks') {
          return {
            insert: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  const id = `mock-bick-${++mockBickId}`;
                  const bick = {
                    id,
                    status: data.status || 'processing',
                    owner_id: data.owner_id ?? null,
                    source_url: data.source_url ?? null,
                    original_filename: data.original_filename ?? null,
                    duration_ms: data.duration_ms ?? null,
                    original_duration_ms: data.original_duration_ms ?? null,
                    slug: data.slug as string,
                    title: data.title as string,
                  };
                  mockBicks.set(id, bick);
                  createdBickIds.push(id);
                  return Promise.resolve({ data: { id }, error: null });
                }),
              }),
            })),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'tags') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ 
                  data: { id: `mock-tag-${Date.now()}` }, 
                  error: null 
                }),
              }),
            }),
          };
        }
        if (table === 'bick_tags') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }),
    })),
  };
});

/**
 * Helper to create a valid upload session request body
 */
function createValidRequest(overrides: Partial<{
  title: string;
  description: string;
  tags: string[];
  filename: string;
  contentType: string;
  durationMs: number;
  originalDurationMs: number;
  sourceUrl: string;
}> = {}) {
  return {
    title: 'Test Bick',
    filename: 'test-audio.mp3',
    contentType: 'audio/mpeg',
    durationMs: 5000,
    ...overrides,
  };
}

/**
 * Helper to call the upload-session API
 */
async function callUploadSession(body: unknown) {
  // Import the route handler dynamically to get fresh mocks
  const { POST } = await import('@/app/api/bicks/upload-session/route');
  
  const request = new Request('http://localhost:3000/api/bicks/upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const response = await POST(request as any);
  const data = await response.json();
  
  return { response, data };
}

/**
 * Helper to get a bick from mock storage
 */
function getMockBick(bickId: string) {
  return mockBicks.get(bickId);
}

/**
 * Cleanup function to remove test data
 */
async function cleanupTestData() {
  mockBicks.clear();
  createdBickIds.length = 0;
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

/**
 * Feature: upload-pipeline, Property 11: Bick Creation Status
 * 
 * *For any* bick created through the upload session endpoint,
 * the initial status SHALL be 'processing'.
 * 
 * **Validates: Requirements 7.1**
 */
describe('Property 11: Bick Creation Status', () => {
  it('creates bicks with processing status for any valid title', async () => {
    // Generate valid titles (1-100 characters)
    const validTitleArb = fc.string({ minLength: 1, maxLength: 100 });
    
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        async (title) => {
          const { data } = await callUploadSession(createValidRequest({ title }));
          
          if (!data.success) {
            // Skip if validation failed (e.g., empty string after trim)
            return true;
          }
          
          // Verify the bick was created with 'processing' status
          const bick = getMockBick(data.bickId);
          
          expect(bick).toBeDefined();
          expect(bick?.status).toBe('processing');
          return true;
        }
      ),
      { numRuns: 20 } // Reduced runs due to database operations
    );
  });

  it('always sets status to processing regardless of other fields', async () => {
    const { data } = await callUploadSession(createValidRequest({
      title: 'Status Test Bick',
      description: 'A test description',
      tags: ['test', 'status'],
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.status).toBe('processing');
  });
});

/**
 * Feature: upload-pipeline, Property 12: Owner Association
 * 
 * *For any* upload session request, the created bick SHALL have owner_id
 * set to the authenticated user's ID if authenticated, or null if not authenticated.
 * 
 * **Validates: Requirements 7.4, 7.5**
 */
describe('Property 12: Owner Association', () => {
  it('sets owner_id to null for anonymous uploads', async () => {
    const { data } = await callUploadSession(createValidRequest({
      title: 'Anonymous Upload Test',
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.owner_id).toBeNull();
  });

  it('sets owner_id to null for any valid request when not authenticated', async () => {
    const validTitleArb = fc.string({ minLength: 1, maxLength: 50 });
    
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        async (title) => {
          const { data } = await callUploadSession(createValidRequest({ title }));
          
          if (!data.success) {
            return true;
          }
          
          const bick = getMockBick(data.bickId);
          
          expect(bick?.owner_id).toBeNull();
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('creates bick with null owner_id when auth check fails', async () => {
    // The mock already returns null user, simulating anonymous upload
    const { data } = await callUploadSession(createValidRequest({
      title: 'Auth Failure Test',
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.owner_id).toBeNull();
  });
});

/**
 * Feature: upload-pipeline, Property 13: Source URL Persistence
 * 
 * *For any* upload session request with a source_url field,
 * the created bick record SHALL have source_url set to that value.
 * 
 * **Validates: Requirements 7.6**
 */
describe('Property 13: Source URL Persistence', () => {
  // Generator for valid URLs
  const validUrlArb = fc.webUrl();

  it('persists source_url when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUrlArb,
        async (sourceUrl) => {
          const { data } = await callUploadSession(createValidRequest({
            title: 'Source URL Test',
            sourceUrl,
          }));
          
          expect(data.success).toBe(true);
          
          const bick = getMockBick(data.bickId);
          
          expect(bick?.source_url).toBe(sourceUrl);
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('sets source_url to null when not provided', async () => {
    const { data } = await callUploadSession(createValidRequest({
      title: 'No Source URL Test',
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.source_url).toBeNull();
  });

  it('persists various URL formats correctly', async () => {
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.tiktok.com/@user/video/123456789',
      'https://www.instagram.com/reel/ABC123/',
      'https://x.com/user/status/123456789',
    ];
    
    for (const sourceUrl of testUrls) {
      const { data } = await callUploadSession(createValidRequest({
        title: `URL Test ${sourceUrl.substring(0, 20)}`,
        sourceUrl,
      }));
      
      expect(data.success).toBe(true);
      
      const bick = getMockBick(data.bickId);
      
      expect(bick?.source_url).toBe(sourceUrl);
    }
  });
});

/**
 * Additional tests for upload-session functionality
 */
describe('Upload Session - Additional Validation', () => {
  it('stores original_filename correctly', async () => {
    const filename = 'my-awesome-audio.mp3';
    const { data } = await callUploadSession(createValidRequest({
      title: 'Filename Test',
      filename,
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.original_filename).toBe(filename);
  });

  it('stores duration_ms correctly', async () => {
    const durationMs = 8500;
    const { data } = await callUploadSession(createValidRequest({
      title: 'Duration Test',
      durationMs,
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.duration_ms).toBe(durationMs);
  });

  it('stores original_duration_ms when provided', async () => {
    const originalDurationMs = 45000;
    const { data } = await callUploadSession(createValidRequest({
      title: 'Original Duration Test',
      durationMs: 10000,
      originalDurationMs,
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    expect(bick?.original_duration_ms).toBe(originalDurationMs);
  });

  it('generates a valid slug from title', async () => {
    const { data } = await callUploadSession(createValidRequest({
      title: 'My Awesome Bick Title!',
    }));
    
    expect(data.success).toBe(true);
    
    const bick = getMockBick(data.bickId);
    
    // Slug should be URL-safe (lowercase, alphanumeric, hyphens)
    expect(bick?.slug).toMatch(/^[a-z0-9-]+$/);
    expect(bick?.slug).toContain('my-awesome-bick-title');
  });

  it('returns upload URL and storage key', async () => {
    const { data } = await callUploadSession(createValidRequest({
      title: 'Upload URL Test',
    }));
    
    expect(data.success).toBe(true);
    expect(data.uploadUrl).toBeDefined();
    expect(data.storageKey).toBeDefined();
    expect(data.expiresAt).toBeDefined();
  });
});
