/**
 * Unit tests for tracking API route
 * 
 * Feature: play-share-tracking
 * 
 * Tests the POST /api/bicks/[id]/track endpoint for:
 * - Valid play event increments play_count
 * - Valid share event increments share_count
 * - 404 for non-existent bick
 * - 400 for invalid event type
 * - 400 for missing event type
 * - 400 for invalid JSON body
 * 
 * **Validates: Requirements 1.3, 1.4, 2.4, 2.5**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock bick storage for testing
const mockBicks = new Map<string, { id: string; play_count: number; share_count: number }>();

// Track RPC calls for verification
const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];

// Mock the rate limiter to always allow requests in tests
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    success: true,
    remaining: 99,
    resetAt: Math.floor(Date.now() / 1000) + 60,
  }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'bicks') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((field: string, value: string) => ({
              single: vi.fn().mockImplementation(async () => {
                const bick = mockBicks.get(value);
                if (bick) {
                  return { data: { id: bick.id }, error: null };
                }
                return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
              }),
            })),
          }),
        };
      }
      return {};
    }),
    rpc: vi.fn().mockImplementation(async (fnName: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn: fnName, args });
      const bickId = args.bick_id as string;
      const bick = mockBicks.get(bickId);
      
      if (!bick) {
        return { data: null, error: { message: 'Bick not found' } };
      }
      
      if (fnName === 'increment_play_count') {
        bick.play_count += 1;
        return { data: bick.play_count, error: null };
      }
      
      if (fnName === 'increment_share_count') {
        bick.share_count += 1;
        return { data: bick.share_count, error: null };
      }
      
      return { data: null, error: { message: 'Unknown function' } };
    }),
  })),
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a mock bick in the test store
 */
function createMockBick(id: string, playCount = 0, shareCount = 0): void {
  mockBicks.set(id, { id, play_count: playCount, share_count: shareCount });
}

/**
 * Creates a NextRequest for the tracking endpoint
 */
function createTrackingRequest(bickId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/bicks/${bickId}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Creates a NextRequest with invalid JSON
 */
function createInvalidJsonRequest(bickId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/bicks/${bickId}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not valid json {{{',
  });
}

/**
 * Calls the tracking API route handler
 */
async function callTrackingApi(bickId: string, body: unknown) {
  // Import the route handler dynamically to get fresh mocks
  const { POST } = await import('@/app/api/bicks/[id]/track/route');
  
  const request = createTrackingRequest(bickId, body);
  const context = { params: Promise.resolve({ id: bickId }) };
  
  const response = await POST(request, context);
  const data = await response.json();
  
  return { response, data };
}

/**
 * Calls the tracking API with invalid JSON
 */
async function callTrackingApiWithInvalidJson(bickId: string) {
  const { POST } = await import('@/app/api/bicks/[id]/track/route');
  
  const request = createInvalidJsonRequest(bickId);
  const context = { params: Promise.resolve({ id: bickId }) };
  
  const response = await POST(request, context);
  const data = await response.json();
  
  return { response, data };
}

// ============================================================================
// TEST SETUP
// ============================================================================

beforeEach(() => {
  // Clear mock data before each test
  mockBicks.clear();
  rpcCalls.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// UNIT TESTS
// ============================================================================

describe('Tracking API - POST /api/bicks/[id]/track', () => {
  /**
   * Test: Valid play event increments play_count
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Valid play event', () => {
    it('should increment play_count and return success', async () => {
      const bickId = 'test-bick-play-1';
      createMockBick(bickId, 5, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'play' });
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newCount).toBe(6);
      
      // Verify the correct RPC was called
      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].fn).toBe('increment_play_count');
      expect(rpcCalls[0].args.bick_id).toBe(bickId);
    });

    it('should increment play_count from zero', async () => {
      const bickId = 'test-bick-play-zero';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'play' });
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newCount).toBe(1);
    });

    it('should include rate limit headers in response', async () => {
      const bickId = 'test-bick-play-headers';
      createMockBick(bickId, 0, 0);
      
      const { response } = await callTrackingApi(bickId, { eventType: 'play' });
      
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  /**
   * Test: Valid share event increments share_count
   * 
   * **Validates: Requirements 2.4**
   */
  describe('Valid share event', () => {
    it('should increment share_count and return success', async () => {
      const bickId = 'test-bick-share-1';
      createMockBick(bickId, 0, 10);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'share' });
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newCount).toBe(11);
      
      // Verify the correct RPC was called
      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].fn).toBe('increment_share_count');
      expect(rpcCalls[0].args.bick_id).toBe(bickId);
    });

    it('should increment share_count from zero', async () => {
      const bickId = 'test-bick-share-zero';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'share' });
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newCount).toBe(1);
    });
  });

  /**
   * Test: 404 for non-existent bick
   * 
   * **Validates: Requirements 1.4, 2.5**
   */
  describe('Non-existent bick', () => {
    it('should return 404 for non-existent bick with play event', async () => {
      const nonExistentId = 'non-existent-bick-id';
      
      const { response, data } = await callTrackingApi(nonExistentId, { eventType: 'play' });
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bick not found');
    });

    it('should return 404 for non-existent bick with share event', async () => {
      const nonExistentId = 'another-non-existent-id';
      
      const { response, data } = await callTrackingApi(nonExistentId, { eventType: 'share' });
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bick not found');
    });

    it('should not call RPC for non-existent bick', async () => {
      const nonExistentId = 'no-rpc-call-bick';
      
      await callTrackingApi(nonExistentId, { eventType: 'play' });
      
      // RPC should not be called since bick doesn't exist
      expect(rpcCalls).toHaveLength(0);
    });
  });

  /**
   * Test: 400 for invalid event type
   * 
   * **Validates: Requirements 1.3, 2.4**
   */
  describe('Invalid event type', () => {
    it('should return 400 for invalid event type "click"', async () => {
      const bickId = 'test-bick-invalid-event';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'click' });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });

    it('should return 400 for invalid event type "view"', async () => {
      const bickId = 'test-bick-view-event';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'view' });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });

    it('should return 400 for numeric event type', async () => {
      const bickId = 'test-bick-numeric-event';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 123 });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });

    it('should return 400 for null event type', async () => {
      const bickId = 'test-bick-null-event';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: null });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });

    it('should return 400 for empty string event type', async () => {
      const bickId = 'test-bick-empty-event';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: '' });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });

    it('should not call RPC for invalid event type', async () => {
      const bickId = 'test-bick-no-rpc-invalid';
      createMockBick(bickId, 0, 0);
      
      await callTrackingApi(bickId, { eventType: 'invalid' });
      
      // RPC should not be called for invalid event type
      expect(rpcCalls).toHaveLength(0);
    });
  });

  /**
   * Test: 400 for missing event type
   */
  describe('Missing event type', () => {
    it('should return 400 when eventType is missing', async () => {
      const bickId = 'test-bick-missing-event';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, {});
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });

    it('should return 400 when body has other fields but no eventType', async () => {
      const bickId = 'test-bick-other-fields';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { 
        someOtherField: 'value',
        anotherField: 123 
      });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid event type');
    });
  });

  /**
   * Test: 400 for invalid JSON body
   */
  describe('Invalid JSON body', () => {
    it('should return 400 for invalid JSON', async () => {
      const bickId = 'test-bick-invalid-json';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApiWithInvalidJson(bickId);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });
  });

  /**
   * Test: Event type case sensitivity
   */
  describe('Event type case sensitivity', () => {
    it('should return 400 for uppercase PLAY', async () => {
      const bickId = 'test-bick-uppercase-play';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'PLAY' });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for uppercase SHARE', async () => {
      const bickId = 'test-bick-uppercase-share';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'SHARE' });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for mixed case Play', async () => {
      const bickId = 'test-bick-mixed-play';
      createMockBick(bickId, 0, 0);
      
      const { response, data } = await callTrackingApi(bickId, { eventType: 'Play' });
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  /**
   * Test: Multiple sequential events
   */
  describe('Multiple sequential events', () => {
    it('should correctly increment play_count multiple times', async () => {
      const bickId = 'test-bick-multi-play';
      createMockBick(bickId, 0, 0);
      
      // First play
      const { data: data1 } = await callTrackingApi(bickId, { eventType: 'play' });
      expect(data1.newCount).toBe(1);
      
      // Second play
      const { data: data2 } = await callTrackingApi(bickId, { eventType: 'play' });
      expect(data2.newCount).toBe(2);
      
      // Third play
      const { data: data3 } = await callTrackingApi(bickId, { eventType: 'play' });
      expect(data3.newCount).toBe(3);
    });

    it('should correctly increment share_count multiple times', async () => {
      const bickId = 'test-bick-multi-share';
      createMockBick(bickId, 0, 0);
      
      // First share
      const { data: data1 } = await callTrackingApi(bickId, { eventType: 'share' });
      expect(data1.newCount).toBe(1);
      
      // Second share
      const { data: data2 } = await callTrackingApi(bickId, { eventType: 'share' });
      expect(data2.newCount).toBe(2);
    });

    it('should track play and share independently', async () => {
      const bickId = 'test-bick-independent';
      createMockBick(bickId, 0, 0);
      
      // Play event
      const { data: playData } = await callTrackingApi(bickId, { eventType: 'play' });
      expect(playData.newCount).toBe(1);
      
      // Share event
      const { data: shareData } = await callTrackingApi(bickId, { eventType: 'share' });
      expect(shareData.newCount).toBe(1);
      
      // Another play event
      const { data: playData2 } = await callTrackingApi(bickId, { eventType: 'play' });
      expect(playData2.newCount).toBe(2);
      
      // Verify the mock bick has correct counts
      const bick = mockBicks.get(bickId);
      expect(bick?.play_count).toBe(2);
      expect(bick?.share_count).toBe(1);
    });
  });

  /**
   * Test: Different bicks are tracked independently
   */
  describe('Independent bick tracking', () => {
    it('should track different bicks independently', async () => {
      const bickId1 = 'test-bick-1';
      const bickId2 = 'test-bick-2';
      createMockBick(bickId1, 10, 5);
      createMockBick(bickId2, 20, 15);
      
      // Increment bick1 play
      const { data: data1 } = await callTrackingApi(bickId1, { eventType: 'play' });
      expect(data1.newCount).toBe(11);
      
      // Increment bick2 share
      const { data: data2 } = await callTrackingApi(bickId2, { eventType: 'share' });
      expect(data2.newCount).toBe(16);
      
      // Verify bick1 share count unchanged
      expect(mockBicks.get(bickId1)?.share_count).toBe(5);
      
      // Verify bick2 play count unchanged
      expect(mockBicks.get(bickId2)?.play_count).toBe(20);
    });
  });
});
