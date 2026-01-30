/**
 * Platform detection utilities for Bickqr
 * 
 * This module provides client-safe platform detection functions
 * that can be used in both client and server components.
 * 
 * Requirements:
 * - 2.1: Detect TikTok, Instagram, YouTube, Twitter/X URLs
 * - 2.2: Display error for unsupported platforms
 */

/**
 * Supported platform types
 */
export type SupportedPlatform = 'youtube' | 'tiktok' | 'instagram' | 'twitter';

/**
 * Regex patterns for supported platforms
 * 
 * These patterns match URLs from:
 * - YouTube: youtube.com, youtu.be
 * - TikTok: tiktok.com, vm.tiktok.com, vt.tiktok.com (short links)
 * - Instagram: instagram.com/p/, instagram.com/reel/, instagram.com/reels/
 * - Twitter/X: twitter.com, x.com with /status/
 */
export const SUPPORTED_PLATFORMS: Record<SupportedPlatform, RegExp> = {
  youtube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
  tiktok: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
  instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|reels)\/.+/i,
  twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+\/status\/.+/i,
};

/**
 * List of supported platform names for error messages
 */
export const SUPPORTED_PLATFORM_NAMES = ['YouTube', 'TikTok', 'Instagram', 'Twitter/X'] as const;

/**
 * Detects the platform from a URL.
 * 
 * @param url - The URL to detect the platform from
 * @returns The platform name if supported, null otherwise
 * 
 * **Validates: Requirements 2.1, 2.2**
 */
export function detectPlatform(url: string): SupportedPlatform | null {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }

  const trimmedUrl = url.trim();

  // Check each platform pattern
  for (const [platform, pattern] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (pattern.test(trimmedUrl)) {
      return platform as SupportedPlatform;
    }
  }

  return null;
}

/**
 * Checks if a URL is from a supported platform.
 * 
 * @param url - The URL to check
 * @returns true if the URL is from a supported platform
 */
export function isSupportedUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}
