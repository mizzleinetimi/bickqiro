/**
 * Rate Limiter Utility
 * 
 * In-memory sliding window rate limiter for API endpoints.
 * Tracks requests per IP address and enforces rate limits.
 * 
 * @requirements 5.1, 5.2
 */

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (seconds) when the rate limit resets */
  resetAt: number;
}

/**
 * Configuration for the rate limiter
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Internal entry tracking requests for an IP
 */
interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[];
}

/**
 * Default configuration: 100 requests per 60 seconds
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 60 seconds
};

/**
 * In-memory storage for rate limit entries
 * Maps IP address to request timestamps
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup interval to prevent memory leaks
 * Removes expired entries every 5 minutes
 */
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Starts the cleanup interval if not already running
 */
function ensureCleanupInterval(windowMs: number): void {
  if (cleanupInterval === null) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      const ipsToDelete: string[] = [];
      
      rateLimitStore.forEach((entry, ip) => {
        // Remove timestamps older than the window
        entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);
        // Mark entry for deletion if no timestamps remain
        if (entry.timestamps.length === 0) {
          ipsToDelete.push(ip);
        }
      });
      
      // Delete marked entries
      ipsToDelete.forEach(ip => rateLimitStore.delete(ip));
    }, 5 * 60 * 1000); // Run every 5 minutes
    
    // Don't prevent Node.js from exiting
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

/**
 * Checks if a request from the given IP is allowed under the rate limit.
 * Uses a sliding window algorithm to track requests.
 * 
 * @param ip - The IP address to check
 * @param config - Rate limit configuration (optional, uses defaults)
 * @returns RateLimitResult indicating if request is allowed
 * 
 * @example
 * ```typescript
 * const result = checkRateLimit('192.168.1.1');
 * if (!result.success) {
 *   return new Response('Too Many Requests', {
 *     status: 429,
 *     headers: { 'Retry-After': String(result.resetAt - Math.floor(Date.now() / 1000)) }
 *   });
 * }
 * ```
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Ensure cleanup is running
  ensureCleanupInterval(config.windowMs);
  
  // Get or create entry for this IP
  let entry = rateLimitStore.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(ip, entry);
  }
  
  // Remove timestamps outside the current window (sliding window)
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
  
  // Calculate reset time (when the oldest request in window expires)
  const oldestTimestamp = entry.timestamps.length > 0 
    ? entry.timestamps[0] 
    : now;
  const resetAt = Math.ceil((oldestTimestamp + config.windowMs) / 1000);
  
  // Check if limit exceeded
  if (entry.timestamps.length >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }
  
  // Add current request timestamp
  entry.timestamps.push(now);
  
  // Calculate remaining requests
  const remaining = config.maxRequests - entry.timestamps.length;
  
  return {
    success: true,
    remaining,
    resetAt,
  };
}

/**
 * Resets the rate limit for a specific IP address.
 * Useful for testing or administrative purposes.
 * 
 * @param ip - The IP address to reset
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Clears all rate limit entries.
 * Useful for testing.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Gets the current request count for an IP.
 * Useful for testing and debugging.
 * 
 * @param ip - The IP address to check
 * @param config - Rate limit configuration (optional, uses defaults)
 * @returns Current request count within the window
 */
export function getRateLimitCount(
  ip: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): number {
  const entry = rateLimitStore.get(ip);
  if (!entry) {
    return 0;
  }
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Count only timestamps within the current window
  return entry.timestamps.filter(ts => ts > windowStart).length;
}

/**
 * Extracts the client IP address from a Next.js request.
 * Checks common headers used by proxies and load balancers.
 * 
 * @param request - The incoming request
 * @returns The client IP address or 'unknown'
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (common for proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) {
      return ips[0];
    }
  }
  
  // Check X-Real-IP header (used by some proxies)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Check CF-Connecting-IP header (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }
  
  // Fallback to unknown
  return 'unknown';
}
