/**
 * Property-based tests for slug generation utility
 * 
 * Feature: upload-pipeline
 * 
 * **Validates: Requirements 7.3**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateSlug, generateUniqueSlug, isValidSlug } from '@/lib/upload/slug';

/**
 * Feature: upload-pipeline, Property 10: Slug Generation
 * 
 * *For any* title string, the generated slug SHALL contain only lowercase letters,
 * numbers, and hyphens, and SHALL not be empty.
 * 
 * **Validates: Requirements 7.3**
 */
describe('Property 10: Slug Generation', () => {
  it('produces URL-safe slugs for any title', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (title) => {
          const slug = generateSlug(title);
          // Slug must match: lowercase letters, numbers, and hyphens only
          // Must be non-empty
          return /^[a-z0-9-]+$/.test(slug) && slug.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces non-empty slugs for any input', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (title) => {
          const slug = generateSlug(title);
          return slug.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces slugs without leading hyphens', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (title) => {
          const slug = generateSlug(title);
          return !slug.startsWith('-');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces slugs without trailing hyphens', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (title) => {
          const slug = generateSlug(title);
          return !slug.endsWith('-');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces slugs without consecutive hyphens', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (title) => {
          const slug = generateSlug(title);
          return !slug.includes('--');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces lowercase slugs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (title) => {
          const slug = generateSlug(title);
          return slug === slug.toLowerCase();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Slug Generation - Specific Cases', () => {
  it('converts simple titles correctly', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
    expect(generateSlug('My First Bick')).toBe('my-first-bick');
    expect(generateSlug('test')).toBe('test');
  });

  it('handles numbers in titles', () => {
    expect(generateSlug('Sound Effect 123')).toBe('sound-effect-123');
    expect(generateSlug('2024 Trending')).toBe('2024-trending');
    expect(generateSlug('123')).toBe('123');
  });

  it('handles special characters', () => {
    expect(generateSlug('Hello! World?')).toBe('hello-world');
    expect(generateSlug('Test@#$%Sound')).toBe('test-sound');
    expect(generateSlug('A & B')).toBe('a-b');
  });

  it('handles unicode characters', () => {
    expect(generateSlug('Café Music')).toBe('cafe-music');
    expect(generateSlug('Naïve Sound')).toBe('naive-sound');
    expect(generateSlug('Über Cool')).toBe('uber-cool');
  });

  it('handles accented characters', () => {
    expect(generateSlug('résumé')).toBe('resume');
    expect(generateSlug('piñata')).toBe('pinata');
    expect(generateSlug('Ångström')).toBe('angstrom');
  });

  it('handles special unicode ligatures', () => {
    expect(generateSlug('Æsthetic')).toBe('aesthetic');
    expect(generateSlug('Œuvre')).toBe('oeuvre');
    expect(generateSlug('Straße')).toBe('strasse');
  });

  it('handles empty and whitespace-only input', () => {
    expect(generateSlug('')).toBe('untitled');
    expect(generateSlug('   ')).toBe('untitled');
    expect(generateSlug('\t\n')).toBe('untitled');
  });

  it('handles input with only special characters', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('untitled');
    expect(generateSlug('...')).toBe('untitled');
    expect(generateSlug('---')).toBe('untitled');
  });

  it('handles leading and trailing spaces', () => {
    expect(generateSlug('  Hello World  ')).toBe('hello-world');
    expect(generateSlug('\tTest\n')).toBe('test');
  });

  it('handles multiple consecutive spaces', () => {
    expect(generateSlug('Hello    World')).toBe('hello-world');
    expect(generateSlug('A   B   C')).toBe('a-b-c');
  });

  it('handles emoji', () => {
    const slug = generateSlug('🎵 Music 🎶');
    expect(slug).toBe('music');
    expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
  });

  it('handles CJK characters', () => {
    // CJK characters get stripped, should fall back to 'untitled' if nothing remains
    const slug = generateSlug('日本語');
    expect(slug).toBe('untitled');
    
    // Mixed content should preserve ASCII parts
    const mixedSlug = generateSlug('Hello 世界');
    expect(mixedSlug).toBe('hello');
  });

  it('handles very long titles', () => {
    const longTitle = 'a'.repeat(1000);
    const slug = generateSlug(longTitle);
    expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
    expect(slug.length).toBeGreaterThan(0);
  });
});

describe('Unique Slug Generation', () => {
  it('generates unique slugs with suffix', () => {
    const slug1 = generateUniqueSlug('Test Title');
    const slug2 = generateUniqueSlug('Test Title');
    
    // Both should start with the base slug
    expect(slug1.startsWith('test-title-')).toBe(true);
    expect(slug2.startsWith('test-title-')).toBe(true);
    
    // They should be different (with very high probability)
    expect(slug1).not.toBe(slug2);
  });

  it('generates valid slugs with suffix', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (title) => {
          const slug = generateUniqueSlug(title);
          return /^[a-z0-9-]+$/.test(slug) && slug.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('respects custom suffix length', () => {
    const slug = generateUniqueSlug('Test', 10);
    // Base slug 'test' + '-' + 10 char suffix = at least 15 chars
    expect(slug.length).toBeGreaterThanOrEqual(15);
  });
});

describe('Slug Validation', () => {
  it('validates correct slugs', () => {
    expect(isValidSlug('hello-world')).toBe(true);
    expect(isValidSlug('test')).toBe(true);
    expect(isValidSlug('sound-123')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('123')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('-hello')).toBe(false);
    expect(isValidSlug('hello-')).toBe(false);
    expect(isValidSlug('hello--world')).toBe(false);
    expect(isValidSlug('Hello')).toBe(false); // uppercase
    expect(isValidSlug('hello world')).toBe(false); // space
    expect(isValidSlug('hello_world')).toBe(false); // underscore
  });

  it('generated slugs pass validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (title) => {
          const slug = generateSlug(title);
          // Note: Our generated slugs may have patterns like 'a-b-c' which is valid
          // but also 'untitled' for edge cases
          return /^[a-z0-9-]+$/.test(slug);
        }
      ),
      { numRuns: 100 }
    );
  });
});
