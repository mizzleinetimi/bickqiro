/**
 * Unit tests for rate limiter utility
 * 
 * Tests the in-memory sliding window rate limiter.
 * 
 * @requirements 5.1, 5.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  getRateLimitCount,
  getClientIp,
  RateLimitConfig,
} from '@/lib/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
    // Reset timers
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
      const ip = '192.168.1.1';
      const config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 };

      // First request should succeed
      const result1 = checkRateLimit(ip, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);

      // Second request should succeed
      const result2 = checkRateLimit(ip, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests when limit is exceeded', () => {
      const ip = '192.168.1.2';
      const config: RateLimitConfig = { maxRequests: 3, windowMs: 60000 };

      // Make 3 requests (at limit)
      checkRateLimit(ip, config);
      checkRateLimit(ip, config);
      const result3 = checkRateLimit(ip, config);
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(0);

      // 4th request should be blocked
      const result4 = checkRateLimit(ip, config);
      expect(result4.success).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('should return correct resetAt timestamp', () => {
      const ip = '192.168.1.3';
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

      const beforeTime = Math.floor(Date.now() / 1000);
      const result = checkRateLimit(ip, config);
      const afterTime = Math.floor(Date.now() / 1000);

      // resetAt should be approximately now + windowMs
      expect(result.resetAt).toBeGreaterThanOrEqual(beforeTime + 60);
      expect(result.resetAt).toBeLessThanOrEqual(afterTime + 61);
    });

    it('should track different IPs separately', () => {
      const ip1 = '192.168.1.10';
      const ip2 = '192.168.1.11';
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

      // Exhaust limit for ip1
      checkRateLimit(ip1, config);
      checkRateLimit(ip1, config);
      const result1 = checkRateLimit(ip1, config);
      expect(result1.success).toBe(false);

      // ip2 should still have full quota
      const result2 = checkRateLimit(ip2, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should use default config when not provided', () => {
      const ip = '192.168.1.20';

      const result = checkRateLimit(ip);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99); // Default is 100 requests
    });

    it('should allow requests after window expires', async () => {
      vi.useFakeTimers();
      const ip = '192.168.1.30';
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 1000 }; // 1 second window

      // Exhaust limit
      checkRateLimit(ip, config);
      checkRateLimit(ip, config);
      const blockedResult = checkRateLimit(ip, config);
      expect(blockedResult.success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1100);

      // Should be allowed again
      const allowedResult = checkRateLimit(ip, config);
      expect(allowedResult.success).toBe(true);
      expect(allowedResult.remaining).toBe(1);
    });

    it('should implement sliding window correctly', async () => {
      vi.useFakeTimers();
      const ip = '192.168.1.40';
      const config: RateLimitConfig = { maxRequests: 3, windowMs: 1000 };

      // Make 2 requests at t=0
      checkRateLimit(ip, config);
      checkRateLimit(ip, config);

      // Advance 500ms
      vi.advanceTimersByTime(500);

      // Make 1 more request at t=500ms
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
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific IP', () => {
      const ip = '192.168.1.50';
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

      // Exhaust limit
      checkRateLimit(ip, config);
      checkRateLimit(ip, config);
      expect(checkRateLimit(ip, config).success).toBe(false);

      // Reset
      resetRateLimit(ip);

      // Should be allowed again
      const result = checkRateLimit(ip, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should not affect other IPs', () => {
      const ip1 = '192.168.1.60';
      const ip2 = '192.168.1.61';
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

      // Use some quota for both
      checkRateLimit(ip1, config);
      checkRateLimit(ip2, config);

      // Reset only ip1
      resetRateLimit(ip1);

      // ip1 should have full quota
      expect(getRateLimitCount(ip1, config)).toBe(0);

      // ip2 should still have 1 request counted
      expect(getRateLimitCount(ip2, config)).toBe(1);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

      // Add some requests for multiple IPs
      checkRateLimit('ip1', config);
      checkRateLimit('ip2', config);
      checkRateLimit('ip3', config);

      // Clear all
      clearAllRateLimits();

      // All should have 0 count
      expect(getRateLimitCount('ip1', config)).toBe(0);
      expect(getRateLimitCount('ip2', config)).toBe(0);
      expect(getRateLimitCount('ip3', config)).toBe(0);
    });
  });

  describe('getRateLimitCount', () => {
    it('should return 0 for unknown IP', () => {
      expect(getRateLimitCount('unknown-ip')).toBe(0);
    });

    it('should return correct count', () => {
      const ip = '192.168.1.70';
      const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };

      checkRateLimit(ip, config);
      checkRateLimit(ip, config);
      checkRateLimit(ip, config);

      expect(getRateLimitCount(ip, config)).toBe(3);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      });

      expect(getClientIp(request)).toBe('203.0.113.195');
    });

    it('should extract IP from X-Real-IP header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '203.0.113.100' },
      });

      expect(getClientIp(request)).toBe('203.0.113.100');
    });

    it('should extract IP from CF-Connecting-IP header', () => {
      const request = new Request('http://localhost', {
        headers: { 'cf-connecting-ip': '203.0.113.200' },
      });

      expect(getClientIp(request)).toBe('203.0.113.200');
    });

    it('should prefer X-Forwarded-For over other headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '203.0.113.2',
          'cf-connecting-ip': '203.0.113.3',
        },
      });

      expect(getClientIp(request)).toBe('203.0.113.1');
    });

    it('should return "unknown" when no IP headers present', () => {
      const request = new Request('http://localhost');

      expect(getClientIp(request)).toBe('unknown');
    });

    it('should handle single IP in X-Forwarded-For', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should trim whitespace from IPs', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '  192.168.1.1  ,  10.0.0.1  ' },
      });

      expect(getClientIp(request)).toBe('192.168.1.1');
    });
  });

  describe('Rate limit with 100 requests per 60 seconds (default)', () => {
    it('should allow exactly 100 requests', () => {
      const ip = '192.168.1.100';

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(ip);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(99 - i);
      }

      // 101st request should be blocked
      const blocked = checkRateLimit(ip);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });
  });
});
