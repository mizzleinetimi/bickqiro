/**
 * Property-based tests for audio extraction utilities
 * 
 * Feature: upload-pipeline
 * 
 * **Validates: Requirements 2.1, 2.2**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  detectPlatform,
  isSupportedUrl,
  SUPPORTED_PLATFORMS,
  SUPPORTED_PLATFORM_NAMES,
  type SupportedPlatform,
} from '@/lib/audio/extractor';

/**
 * Feature: upload-pipeline, Property 3: URL Platform Detection
 * 
 * *For any* URL string, the platform detection function SHALL return a supported
 * platform name if and only if the URL matches the pattern for YouTube, TikTok,
 * Instagram, or Twitter/X.
 * 
 * **Validates: Requirements 2.1, 2.2**
 */
describe('Property 3: URL Platform Detection', () => {
  // Generators for valid URLs for each platform
  const youtubeUrlArb = fc.oneof(
    // youtube.com/watch?v=...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constantFrom('www.', ''),
      fc.constant('youtube.com/watch?v='),
      fc.stringMatching(/^[a-zA-Z0-9_-]{11}$/)
    ).map(([protocol, www, domain, videoId]) => `${protocol}${www}${domain}${videoId}`),
    // youtu.be/...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constant('youtu.be/'),
      fc.stringMatching(/^[a-zA-Z0-9_-]{11}$/)
    ).map(([protocol, domain, videoId]) => `${protocol}${domain}${videoId}`),
    // youtube.com/shorts/...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constantFrom('www.', ''),
      fc.constant('youtube.com/shorts/'),
      fc.stringMatching(/^[a-zA-Z0-9_-]{11}$/)
    ).map(([protocol, www, domain, videoId]) => `${protocol}${www}${domain}${videoId}`)
  );

  const tiktokUrlArb = fc.oneof(
    // tiktok.com/@user/video/...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constantFrom('www.', 'vm.', ''),
      fc.constant('tiktok.com/@'),
      fc.stringMatching(/^[a-zA-Z0-9_.]{1,24}$/),
      fc.constant('/video/'),
      fc.stringMatching(/^[0-9]{19}$/)
    ).map(([protocol, subdomain, domain, user, path, videoId]) => 
      `${protocol}${subdomain}${domain}${user}${path}${videoId}`
    ),
    // vm.tiktok.com/...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constant('vm.tiktok.com/'),
      fc.stringMatching(/^[a-zA-Z0-9]{8,12}$/)
    ).map(([protocol, domain, shortCode]) => `${protocol}${domain}${shortCode}`)
  );

  const instagramUrlArb = fc.oneof(
    // instagram.com/p/...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constantFrom('www.', ''),
      fc.constant('instagram.com/'),
      fc.constantFrom('p', 'reel', 'reels'),
      fc.constant('/'),
      fc.stringMatching(/^[a-zA-Z0-9_-]{11}$/)
    ).map(([protocol, www, domain, type, slash, postId]) => 
      `${protocol}${www}${domain}${type}${slash}${postId}`
    )
  );

  const twitterUrlArb = fc.oneof(
    // twitter.com/user/status/...
    fc.tuple(
      fc.constantFrom('http://', 'https://', ''),
      fc.constantFrom('www.', ''),
      fc.constantFrom('twitter.com', 'x.com'),
      fc.constant('/'),
      fc.stringMatching(/^[a-zA-Z0-9_]{1,15}$/),
      fc.constant('/status/'),
      fc.stringMatching(/^[0-9]{19}$/)
    ).map(([protocol, www, domain, slash, user, status, tweetId]) => 
      `${protocol}${www}${domain}${slash}${user}${status}${tweetId}`
    )
  );

  describe('YouTube URL Detection', () => {
    it('detects YouTube URLs correctly', () => {
      fc.assert(
        fc.property(youtubeUrlArb, (url) => {
          const platform = detectPlatform(url);
          return platform === 'youtube';
        }),
        { numRuns: 100 }
      );
    });

    it('returns true for isSupportedUrl with YouTube URLs', () => {
      fc.assert(
        fc.property(youtubeUrlArb, (url) => {
          return isSupportedUrl(url) === true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('TikTok URL Detection', () => {
    it('detects TikTok URLs correctly', () => {
      fc.assert(
        fc.property(tiktokUrlArb, (url) => {
          const platform = detectPlatform(url);
          return platform === 'tiktok';
        }),
        { numRuns: 100 }
      );
    });

    it('returns true for isSupportedUrl with TikTok URLs', () => {
      fc.assert(
        fc.property(tiktokUrlArb, (url) => {
          return isSupportedUrl(url) === true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Instagram URL Detection', () => {
    it('detects Instagram URLs correctly', () => {
      fc.assert(
        fc.property(instagramUrlArb, (url) => {
          const platform = detectPlatform(url);
          return platform === 'instagram';
        }),
        { numRuns: 100 }
      );
    });

    it('returns true for isSupportedUrl with Instagram URLs', () => {
      fc.assert(
        fc.property(instagramUrlArb, (url) => {
          return isSupportedUrl(url) === true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Twitter/X URL Detection', () => {
    it('detects Twitter/X URLs correctly', () => {
      fc.assert(
        fc.property(twitterUrlArb, (url) => {
          const platform = detectPlatform(url);
          return platform === 'twitter';
        }),
        { numRuns: 100 }
      );
    });

    it('returns true for isSupportedUrl with Twitter/X URLs', () => {
      fc.assert(
        fc.property(twitterUrlArb, (url) => {
          return isSupportedUrl(url) === true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Unsupported URL Detection', () => {
    // Generator for URLs that don't match any supported platform
    const unsupportedUrlArb = fc.oneof(
      // Random domain URLs
      fc.tuple(
        fc.constantFrom('http://', 'https://'),
        fc.stringMatching(/^[a-z]{3,10}$/),
        fc.constant('.com/'),
        fc.stringMatching(/^[a-z0-9]{5,20}$/)
      ).map(([protocol, domain, tld, path]) => `${protocol}${domain}${tld}${path}`),
      // Known unsupported platforms
      fc.constantFrom(
        'https://facebook.com/video/123456',
        'https://vimeo.com/123456789',
        'https://dailymotion.com/video/x123456',
        'https://soundcloud.com/artist/track',
        'https://spotify.com/track/123',
        'https://example.com/video',
        'https://reddit.com/r/videos/comments/abc123',
        'https://twitch.tv/videos/123456789'
      )
    );

    it('returns null for unsupported URLs', () => {
      fc.assert(
        fc.property(unsupportedUrlArb, (url) => {
          const platform = detectPlatform(url);
          return platform === null;
        }),
        { numRuns: 100 }
      );
    });

    it('returns false for isSupportedUrl with unsupported URLs', () => {
      fc.assert(
        fc.property(unsupportedUrlArb, (url) => {
          return isSupportedUrl(url) === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('returns null for empty strings', () => {
      expect(detectPlatform('')).toBe(null);
      expect(isSupportedUrl('')).toBe(false);
    });

    it('returns null for whitespace-only strings', () => {
      expect(detectPlatform('   ')).toBe(null);
      expect(detectPlatform('\t\n')).toBe(null);
      expect(isSupportedUrl('   ')).toBe(false);
    });

    it('returns null for non-string inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(detectPlatform(null)).toBe(null);
      // @ts-expect-error Testing invalid input
      expect(detectPlatform(undefined)).toBe(null);
      // @ts-expect-error Testing invalid input
      expect(detectPlatform(123)).toBe(null);
    });

    it('handles URLs with extra whitespace', () => {
      expect(detectPlatform('  https://youtube.com/watch?v=dQw4w9WgXcQ  ')).toBe('youtube');
      expect(detectPlatform('\thttps://tiktok.com/@user/video/1234567890123456789\n')).toBe('tiktok');
    });
  });
});

describe('Platform Detection - Specific URL Examples', () => {
  describe('YouTube URLs', () => {
    const validYouTubeUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'http://youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'http://youtu.be/dQw4w9WgXcQ',
      'youtube.com/watch?v=dQw4w9WgXcQ',
      'www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/abc123def45',
      'https://youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/v/dQw4w9WgXcQ',
    ];

    it.each(validYouTubeUrls)('detects %s as YouTube', (url) => {
      expect(detectPlatform(url)).toBe('youtube');
    });
  });

  describe('TikTok URLs', () => {
    const validTikTokUrls = [
      'https://www.tiktok.com/@username/video/1234567890123456789',
      'http://tiktok.com/@user/video/1234567890123456789',
      'https://vm.tiktok.com/ZMRxyz123/',
      'tiktok.com/@user/video/1234567890123456789',
      'www.tiktok.com/@user/video/1234567890123456789',
      'https://tiktok.com/@user.name/video/1234567890123456789',
    ];

    it.each(validTikTokUrls)('detects %s as TikTok', (url) => {
      expect(detectPlatform(url)).toBe('tiktok');
    });
  });

  describe('Instagram URLs', () => {
    const validInstagramUrls = [
      'https://www.instagram.com/p/ABC123def45/',
      'http://instagram.com/p/ABC123def45/',
      'https://www.instagram.com/reel/ABC123def45/',
      'https://instagram.com/reels/ABC123def45/',
      'instagram.com/p/ABC123def45/',
      'www.instagram.com/reel/ABC123def45/',
    ];

    it.each(validInstagramUrls)('detects %s as Instagram', (url) => {
      expect(detectPlatform(url)).toBe('instagram');
    });

    const invalidInstagramUrls = [
      'https://www.instagram.com/username/',
      'https://instagram.com/stories/username/',
      'https://instagram.com/',
    ];

    it.each(invalidInstagramUrls)('does not detect %s as Instagram (not a post/reel)', (url) => {
      expect(detectPlatform(url)).toBe(null);
    });
  });

  describe('Twitter/X URLs', () => {
    const validTwitterUrls = [
      'https://twitter.com/username/status/1234567890123456789',
      'http://twitter.com/user/status/1234567890123456789',
      'https://www.twitter.com/user/status/1234567890123456789',
      'https://x.com/username/status/1234567890123456789',
      'http://x.com/user/status/1234567890123456789',
      'https://www.x.com/user/status/1234567890123456789',
      'twitter.com/user/status/1234567890123456789',
      'x.com/user/status/1234567890123456789',
    ];

    it.each(validTwitterUrls)('detects %s as Twitter', (url) => {
      expect(detectPlatform(url)).toBe('twitter');
    });

    const invalidTwitterUrls = [
      'https://twitter.com/username',
      'https://twitter.com/',
      'https://x.com/username',
      'https://twitter.com/username/likes',
    ];

    it.each(invalidTwitterUrls)('does not detect %s as Twitter (not a status)', (url) => {
      expect(detectPlatform(url)).toBe(null);
    });
  });

  describe('Unsupported Platforms', () => {
    const unsupportedUrls = [
      'https://facebook.com/video/123456',
      'https://vimeo.com/123456789',
      'https://dailymotion.com/video/x123456',
      'https://soundcloud.com/artist/track',
      'https://spotify.com/track/123',
      'https://example.com/video',
      'https://reddit.com/r/videos/comments/abc123',
      'https://twitch.tv/videos/123456789',
      'not-a-url',
      'ftp://youtube.com/watch?v=123',
    ];

    it.each(unsupportedUrls)('returns null for %s', (url) => {
      expect(detectPlatform(url)).toBe(null);
    });
  });
});

describe('SUPPORTED_PLATFORMS constant', () => {
  it('contains all expected platforms', () => {
    expect(Object.keys(SUPPORTED_PLATFORMS)).toEqual(['youtube', 'tiktok', 'instagram', 'twitter']);
  });

  it('all patterns are RegExp instances', () => {
    for (const pattern of Object.values(SUPPORTED_PLATFORMS)) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

describe('SUPPORTED_PLATFORM_NAMES constant', () => {
  it('contains human-readable platform names', () => {
    expect(SUPPORTED_PLATFORM_NAMES).toEqual(['YouTube', 'TikTok', 'Instagram', 'Twitter/X']);
  });
});
