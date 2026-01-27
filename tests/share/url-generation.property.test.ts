/**
 * Property-based tests for social share URL generation
 * 
 * Feature: play-share-tracking
 * 
 * **Property 6: Social share URLs are correctly formatted**
 * *For any* bick with a title and URL, the generated Twitter share URL SHALL contain
 * the encoded bick URL and title as query parameters, and the Facebook share URL
 * SHALL contain the encoded bick URL.
 * 
 * **Validates: Requirements 4.2, 4.3**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateTwitterShareUrl } from '@/components/share/TwitterShareButton';
import { generateFacebookShareUrl } from '@/components/share/FacebookShareButton';

// ============================================================================
// CUSTOM ARBITRARIES
// ============================================================================

/**
 * Generates valid bick URLs (HTTPS URLs with various paths)
 */
const bickUrlArbitrary = fc.tuple(
  fc.uuid(),
  fc.option(fc.webSegment(), { nil: undefined })
).map(([id, slug]) => {
  const path = slug ? `${slug}-${id}` : id;
  return `https://bickqr.com/bick/${path}`;
});

/**
 * Generates valid bick titles (non-empty strings with various characters)
 */
const bickTitleArbitrary = fc.string({ minLength: 1, maxLength: 280 })
  .filter(s => s.trim().length > 0);

/**
 * Generates titles with special characters that need URL encoding
 */
const specialCharTitleArbitrary = fc.constantFrom(
  'Hello & Goodbye',
  'Test #hashtag',
  'Question? Answer!',
  'Spaces   and   tabs',
  'Unicode: 🎵🎶🎤',
  'Quotes "double" and \'single\'',
  'Slashes / and \\ backslashes',
  'Percent % sign',
  'Plus + sign',
  'Equals = sign',
  'At @ symbol',
  'Ampersand & symbol',
  'Less < and > greater',
  'Brackets [square] and {curly}',
  'Pipe | character',
  'Newline\ncharacter',
  'Tab\tcharacter',
);

/**
 * Generates URLs with special characters
 */
const specialCharUrlArbitrary = fc.constantFrom(
  'https://bickqr.com/bick/test-123',
  'https://bickqr.com/bick/hello-world-abc',
  'https://bickqr.com/bick/special%20chars',
  'https://bickqr.com/bick/unicode-🎵',
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses a URL and extracts query parameters
 */
function parseUrlParams(url: string): URLSearchParams {
  const urlObj = new URL(url);
  return urlObj.searchParams;
}

/**
 * Checks if a string is properly URL encoded
 */
function isProperlyEncoded(original: string, encoded: string): boolean {
  try {
    return decodeURIComponent(encoded) === original;
  } catch {
    return false;
  }
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

/**
 * Property 6: Social share URLs are correctly formatted
 * 
 * *For any* bick with a title and URL, the generated Twitter share URL SHALL contain
 * the encoded bick URL and title as query parameters, and the Facebook share URL
 * SHALL contain the encoded bick URL.
 * 
 * **Validates: Requirements 4.2, 4.3**
 */
describe('Property 6: Social share URLs are correctly formatted', () => {
  describe('Twitter share URL generation', () => {
    /**
     * Twitter URL should always start with the correct base URL
     */
    it('generates URLs with correct Twitter intent base', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            expect(shareUrl.startsWith('https://twitter.com/intent/tweet?')).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Twitter URL should contain the bick URL as a query parameter
     */
    it('includes encoded bick URL in query parameters', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            const params = parseUrlParams(shareUrl);
            
            expect(params.has('url')).toBe(true);
            expect(params.get('url')).toBe(url);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Twitter URL should contain the bick title as a query parameter
     */
    it('includes encoded bick title in query parameters', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            const params = parseUrlParams(shareUrl);
            
            expect(params.has('text')).toBe(true);
            expect(params.get('text')).toBe(title);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Twitter URL should be a valid URL
     */
    it('generates valid URLs for any input', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            
            // Should not throw when parsing
            expect(() => new URL(shareUrl)).not.toThrow();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Twitter URL should properly encode special characters
     */
    it('properly encodes special characters in title', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          specialCharTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            const params = parseUrlParams(shareUrl);
            
            // The decoded value should match the original
            expect(params.get('text')).toBe(title);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Twitter URL should properly encode special characters in URL
     */
    it('properly encodes special characters in URL', () => {
      fc.assert(
        fc.property(
          specialCharUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            const params = parseUrlParams(shareUrl);
            
            // The decoded value should match the original
            expect(params.get('url')).toBe(url);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Twitter URL should have exactly two query parameters
     */
    it('has exactly url and text query parameters', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const shareUrl = generateTwitterShareUrl(url, title);
            const params = parseUrlParams(shareUrl);
            
            const paramKeys = Array.from(params.keys());
            expect(paramKeys.sort()).toEqual(['text', 'url']);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Facebook share URL generation', () => {
    /**
     * Facebook URL should always start with the correct base URL
     */
    it('generates URLs with correct Facebook sharer base', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          (url) => {
            const shareUrl = generateFacebookShareUrl(url);
            expect(shareUrl.startsWith('https://www.facebook.com/sharer/sharer.php?')).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Facebook URL should contain the bick URL as a query parameter
     */
    it('includes encoded bick URL in query parameters', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          (url) => {
            const shareUrl = generateFacebookShareUrl(url);
            const params = parseUrlParams(shareUrl);
            
            expect(params.has('u')).toBe(true);
            expect(params.get('u')).toBe(url);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Facebook URL should be a valid URL
     */
    it('generates valid URLs for any input', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          (url) => {
            const shareUrl = generateFacebookShareUrl(url);
            
            // Should not throw when parsing
            expect(() => new URL(shareUrl)).not.toThrow();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Facebook URL should properly encode special characters
     */
    it('properly encodes special characters in URL', () => {
      fc.assert(
        fc.property(
          specialCharUrlArbitrary,
          (url) => {
            const shareUrl = generateFacebookShareUrl(url);
            const params = parseUrlParams(shareUrl);
            
            // The decoded value should match the original
            expect(params.get('u')).toBe(url);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Facebook URL should have exactly one query parameter
     */
    it('has exactly u query parameter', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          (url) => {
            const shareUrl = generateFacebookShareUrl(url);
            const params = parseUrlParams(shareUrl);
            
            const paramKeys = Array.from(params.keys());
            expect(paramKeys).toEqual(['u']);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-platform consistency', () => {
    /**
     * Both platforms should receive the same URL for the same bick
     */
    it('both platforms receive the same bick URL', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const twitterUrl = generateTwitterShareUrl(url, title);
            const facebookUrl = generateFacebookShareUrl(url);
            
            const twitterParams = parseUrlParams(twitterUrl);
            const facebookParams = parseUrlParams(facebookUrl);
            
            expect(twitterParams.get('url')).toBe(facebookParams.get('u'));
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Generated URLs should be deterministic (same input = same output)
     */
    it('URL generation is deterministic', () => {
      fc.assert(
        fc.property(
          bickUrlArbitrary,
          bickTitleArbitrary,
          (url, title) => {
            const twitter1 = generateTwitterShareUrl(url, title);
            const twitter2 = generateTwitterShareUrl(url, title);
            const facebook1 = generateFacebookShareUrl(url);
            const facebook2 = generateFacebookShareUrl(url);
            
            expect(twitter1).toBe(twitter2);
            expect(facebook1).toBe(facebook2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// UNIT TESTS - Specific Edge Cases
// ============================================================================

describe('Social share URL generation - Edge cases', () => {
  describe('Twitter', () => {
    it('handles empty title', () => {
      const url = 'https://bickqr.com/bick/test-123';
      const shareUrl = generateTwitterShareUrl(url, '');
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('text')).toBe('');
      expect(params.get('url')).toBe(url);
    });

    it('handles very long title', () => {
      const url = 'https://bickqr.com/bick/test-123';
      const title = 'A'.repeat(500);
      const shareUrl = generateTwitterShareUrl(url, title);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('text')).toBe(title);
    });

    it('handles URL with query parameters', () => {
      const url = 'https://bickqr.com/bick/test-123?ref=share';
      const title = 'Test Bick';
      const shareUrl = generateTwitterShareUrl(url, title);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('url')).toBe(url);
    });

    it('handles URL with hash fragment', () => {
      const url = 'https://bickqr.com/bick/test-123#section';
      const title = 'Test Bick';
      const shareUrl = generateTwitterShareUrl(url, title);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('url')).toBe(url);
    });

    it('handles emoji in title', () => {
      const url = 'https://bickqr.com/bick/test-123';
      const title = '🎵 Cool Sound 🎶';
      const shareUrl = generateTwitterShareUrl(url, title);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('text')).toBe(title);
    });

    it('handles newlines in title', () => {
      const url = 'https://bickqr.com/bick/test-123';
      const title = 'Line 1\nLine 2';
      const shareUrl = generateTwitterShareUrl(url, title);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('text')).toBe(title);
    });
  });

  describe('Facebook', () => {
    it('handles URL with query parameters', () => {
      const url = 'https://bickqr.com/bick/test-123?ref=share';
      const shareUrl = generateFacebookShareUrl(url);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('u')).toBe(url);
    });

    it('handles URL with hash fragment', () => {
      const url = 'https://bickqr.com/bick/test-123#section';
      const shareUrl = generateFacebookShareUrl(url);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('u')).toBe(url);
    });

    it('handles URL with special characters', () => {
      const url = 'https://bickqr.com/bick/test%20space';
      const shareUrl = generateFacebookShareUrl(url);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('u')).toBe(url);
    });

    it('handles very long URL', () => {
      const url = `https://bickqr.com/bick/${'a'.repeat(500)}`;
      const shareUrl = generateFacebookShareUrl(url);
      const params = parseUrlParams(shareUrl);
      
      expect(params.get('u')).toBe(url);
    });
  });
});
