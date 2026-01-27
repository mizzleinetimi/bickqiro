/**
 * Property-based tests for rate limiting
 * 
 * Feature: play-share-tracking
 * 
 * **Property 7: Rate limiting enforces threshold**
 * *For any* IP address, after 100 requests within a 60-second window,
 * subsequent requests SHALL receive a 429 status code until the window resets.
 * 
 * **Validates: Requirements 5.1**
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  checkRateLimit,
  clearAllRateLimits,
  RateLimitConfig,
} from '@/lib/rate-limit';

// ============================================================================
// TEST SETUP
// ============================================================================

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 60 seconds
};

beforeEach(() => {
  clearAllRateLimits();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// CUSTOM ARBITRARIES
// ============================================================================

/**
 * Generates valid IPv4 addresses
 */
const ipv4Arbitrary = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/**
 * Generates valid IPv6 addresses (simplified)
 * Uses integer-based hex generation
 */
const ipv6Arbitrary = fc.tuple(
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff }),
  fc.integer({ min: 0, max: 0xffff })
).map(parts => parts.map(p => p.toString(16)).join(':'));

/**
 * Generates any valid IP address (IPv4 or IPv6)
 */
const ipArbitrary = fc.oneof(ipv4Arbitrary, ipv6Arbitrary);

// ============================================================================
// PROPERTY TESTS
// ============================================================================

/**
 * Property 7: Rate limiting enforces threshold
 * 
 * *For any* IP address, after 100 requests within a 60-second window,
 * subsequent requests SHALL receive a 429 status code until the window resets.
 * 
 * **Validates: Requirements 5.1**
 */
describe('Property 7: Rate limiting enforces threshold', () => {
  /**
   * Test that exactly 100 requests are allowed for any IP address
   */
  it('allows exactly 100 requests for any IP address', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        (ip) => {
          clearAllRateLimits();
          
          // Make exactly 100 requests - all should succeed
          for (let i = 0; i < 100; i++) {
            const result = checkRateLimit(ip, DEFAULT_CONFIG);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(99 - i);
          }
          
          // 101st request should be blocked
          const blockedResult = checkRateLimit(ip, DEFAULT_CONFIG);
          expect(blockedResult.success).toBe(false);
          expect(blockedResult.remaining).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that requests beyond the limit are blocked for any IP
   */
  it('blocks all requests after limit is exceeded for any IP', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        fc.integer({ min: 1, max: 50 }), // Number of extra requests to try
        (ip, extraRequests) => {
          clearAllRateLimits();
          
          // Exhaust the limit
          for (let i = 0; i < 100; i++) {
            checkRateLimit(ip, DEFAULT_CONFIG);
          }
          
          // All subsequent requests should be blocked
          for (let i = 0; i < extraRequests; i++) {
            const result = checkRateLimit(ip, DEFAULT_CONFIG);
            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that different IPs have independent rate limits
   */
  it('maintains independent rate limits for different IPs', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        ipArbitrary,
        (ip1, ip2) => {
          // Skip if IPs are the same
          if (ip1 === ip2) return true;
          
          clearAllRateLimits();
          
          // Exhaust limit for ip1
          for (let i = 0; i < 100; i++) {
            checkRateLimit(ip1, DEFAULT_CONFIG);
          }
          
          // ip1 should be blocked
          const ip1Result = checkRateLimit(ip1, DEFAULT_CONFIG);
          expect(ip1Result.success).toBe(false);
          
          // ip2 should still have full quota
          const ip2Result = checkRateLimit(ip2, DEFAULT_CONFIG);
          expect(ip2Result.success).toBe(true);
          expect(ip2Result.remaining).toBe(99);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that for any number of requests N <= 100, all are allowed
   */
  it('allows any number of requests up to the limit', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        fc.integer({ min: 1, max: 100 }),
        (ip, numRequests) => {
          clearAllRateLimits();
          
          // Make numRequests requests - all should succeed
          for (let i = 0; i < numRequests; i++) {
            const result = checkRateLimit(ip, DEFAULT_CONFIG);
            expect(result.success).toBe(true);
          }
          
          // Verify remaining count is correct
          const lastResult = checkRateLimit(ip, DEFAULT_CONFIG);
          if (numRequests < 100) {
            expect(lastResult.success).toBe(true);
            expect(lastResult.remaining).toBe(100 - numRequests - 1);
          } else {
            // numRequests was exactly 100, so this 101st request should fail
            expect(lastResult.success).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that for any number of requests N > 100, exactly N - 100 are blocked
   */
  it('blocks exactly the correct number of requests over the limit', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        fc.integer({ min: 101, max: 200 }),
        (ip, totalRequests) => {
          clearAllRateLimits();
          
          let allowedCount = 0;
          let blockedCount = 0;
          
          for (let i = 0; i < totalRequests; i++) {
            const result = checkRateLimit(ip, DEFAULT_CONFIG);
            if (result.success) {
              allowedCount++;
            } else {
              blockedCount++;
            }
          }
          
          // Exactly 100 should be allowed
          expect(allowedCount).toBe(100);
          // The rest should be blocked
          expect(blockedCount).toBe(totalRequests - 100);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that rate limit resets after window expires
   */
  it('resets rate limit after window expires for any IP', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        (ip) => {
          vi.useFakeTimers();
          clearAllRateLimits();
          
          // Exhaust the limit
          for (let i = 0; i < 100; i++) {
            checkRateLimit(ip, DEFAULT_CONFIG);
          }
          
          // Should be blocked
          const blockedResult = checkRateLimit(ip, DEFAULT_CONFIG);
          expect(blockedResult.success).toBe(false);
          
          // Advance time past the window (60 seconds + buffer)
          vi.advanceTimersByTime(61000);
          
          // Should be allowed again
          const allowedResult = checkRateLimit(ip, DEFAULT_CONFIG);
          expect(allowedResult.success).toBe(true);
          expect(allowedResult.remaining).toBe(99);
          
          vi.useRealTimers();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that remaining count is always accurate
   */
  it('reports accurate remaining count for any request sequence', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        fc.integer({ min: 1, max: 100 }),
        (ip, numRequests) => {
          clearAllRateLimits();
          
          for (let i = 0; i < numRequests; i++) {
            const result = checkRateLimit(ip, DEFAULT_CONFIG);
            expect(result.remaining).toBe(100 - i - 1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that resetAt timestamp is provided for any request
   */
  it('provides valid resetAt timestamp for any request', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        (ip) => {
          clearAllRateLimits();
          
          const beforeTime = Math.floor(Date.now() / 1000);
          const result = checkRateLimit(ip, DEFAULT_CONFIG);
          const afterTime = Math.floor(Date.now() / 1000);
          
          // resetAt should be approximately now + windowMs (60 seconds)
          expect(result.resetAt).toBeGreaterThanOrEqual(beforeTime + 60);
          expect(result.resetAt).toBeLessThanOrEqual(afterTime + 61);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test with configurable limits - any limit should be enforced correctly
   */
  it('enforces any configured limit correctly', () => {
    fc.assert(
      fc.property(
        ipArbitrary,
        fc.integer({ min: 1, max: 50 }), // Smaller limits for faster tests
        (ip, maxRequests) => {
          clearAllRateLimits();
          
          const config: RateLimitConfig = {
            maxRequests,
            windowMs: 60000,
          };
          
          // Make exactly maxRequests requests - all should succeed
          for (let i = 0; i < maxRequests; i++) {
            const result = checkRateLimit(ip, config);
            expect(result.success).toBe(true);
          }
          
          // Next request should be blocked
          const blockedResult = checkRateLimit(ip, config);
          expect(blockedResult.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// UNIT TESTS - Specific Edge Cases
// ============================================================================

describe('Rate limiting - Edge cases', () => {
  it('handles empty string IP', () => {
    clearAllRateLimits();
    
    const result = checkRateLimit('', DEFAULT_CONFIG);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('handles "unknown" IP (fallback case)', () => {
    clearAllRateLimits();
    
    // Make 100 requests from "unknown"
    for (let i = 0; i < 100; i++) {
      checkRateLimit('unknown', DEFAULT_CONFIG);
    }
    
    // 101st should be blocked
    const result = checkRateLimit('unknown', DEFAULT_CONFIG);
    expect(result.success).toBe(false);
  });

  it('handles very long IP strings', () => {
    clearAllRateLimits();
    
    const longIp = 'a'.repeat(1000);
    const result = checkRateLimit(longIp, DEFAULT_CONFIG);
    expect(result.success).toBe(true);
  });

  it('handles special characters in IP', () => {
    clearAllRateLimits();
    
    const specialIp = '192.168.1.1:8080';
    const result = checkRateLimit(specialIp, DEFAULT_CONFIG);
    expect(result.success).toBe(true);
  });

  it('blocked request still returns valid resetAt', () => {
    clearAllRateLimits();
    
    const ip = '192.168.1.1';
    
    // Exhaust limit
    for (let i = 0; i < 100; i++) {
      checkRateLimit(ip, DEFAULT_CONFIG);
    }
    
    // Blocked request should have valid resetAt
    const beforeTime = Math.floor(Date.now() / 1000);
    const result = checkRateLimit(ip, DEFAULT_CONFIG);
    
    expect(result.success).toBe(false);
    expect(result.resetAt).toBeGreaterThanOrEqual(beforeTime);
    expect(result.resetAt).toBeLessThanOrEqual(beforeTime + 61);
  });

  it('sliding window allows new requests as old ones expire', () => {
    vi.useFakeTimers();
    clearAllRateLimits();
    
    const ip = '192.168.1.1';
    const config: RateLimitConfig = { maxRequests: 3, windowMs: 1000 };
    
    // Make 2 requests at t=0
    checkRateLimit(ip, config);
    checkRateLimit(ip, config);
    
    // Advance 500ms
    vi.advanceTimersByTime(500);
    
    // Make 1 more request at t=500ms (now at limit)
    const result1 = checkRateLimit(ip, config);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(0);
    
    // Should be blocked now
    const blocked = checkRateLimit(ip, config);
    expect(blocked.success).toBe(false);
    
    // Advance another 600ms (t=1100ms) - first 2 requests should expire
    vi.advanceTimersByTime(600);
    
    // Should have 2 slots available (only the t=500ms request is still in window)
    const result2 = checkRateLimit(ip, config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);
    
    vi.useRealTimers();
  });

  it('multiple IPs can each use their full quota', () => {
    clearAllRateLimits();
    
    const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
    const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
    
    // Each IP uses their full quota
    for (const ip of ips) {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(ip, config);
        expect(result.success).toBe(true);
      }
      
      // Each should be blocked after their quota
      const blocked = checkRateLimit(ip, config);
      expect(blocked.success).toBe(false);
    }
  });

  it('handles zero maxRequests config', () => {
    clearAllRateLimits();
    
    const config: RateLimitConfig = { maxRequests: 0, windowMs: 60000 };
    
    // First request should be blocked immediately
    const result = checkRateLimit('192.168.1.1', config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('handles very short window', () => {
    vi.useFakeTimers();
    clearAllRateLimits();
    
    const config: RateLimitConfig = { maxRequests: 2, windowMs: 100 }; // 100ms window
    const ip = '192.168.1.1';
    
    // Exhaust limit
    checkRateLimit(ip, config);
    checkRateLimit(ip, config);
    
    // Should be blocked
    expect(checkRateLimit(ip, config).success).toBe(false);
    
    // Wait for window to expire
    vi.advanceTimersByTime(150);
    
    // Should be allowed again
    expect(checkRateLimit(ip, config).success).toBe(true);
    
    vi.useRealTimers();
  });
});
