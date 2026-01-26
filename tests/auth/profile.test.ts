import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateUsername } from '@/lib/auth/profile';

/**
 * Property tests for username generation
 * **Validates: Requirements 10.2, 10.3**
 */
describe('Profile Service - Property Tests', () => {
  /**
   * **Property 3: New User Profile Creation**
   * Username derived from email prefix should be valid
   */
  describe('Property 3: Username Generation', () => {
    it('should generate valid username from any email', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const username = generateUsername(email);
            
            // Username should only contain lowercase alphanumeric and underscores
            expect(username).toMatch(/^[a-z0-9_]+$/);
            
            // Username should not be empty
            expect(username.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract email prefix correctly', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
            fc.domain()
          ),
          ([prefix, domain]) => {
            const email = `${prefix}@${domain}`;
            const username = generateUsername(email);
            
            // Username should be derived from prefix (lowercase)
            expect(username).toBe(prefix.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sanitize special characters in email prefix', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.domain()
          ),
          ([prefix, domain]) => {
            const email = `${prefix}@${domain}`;
            const username = generateUsername(email);
            
            // Username should never contain special characters
            expect(username).not.toMatch(/[^a-z0-9_]/);
            
            // Username should not be empty (fallback to 'user')
            expect(username.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case emails gracefully', () => {
      // Empty prefix should fallback to 'user'
      expect(generateUsername('@example.com')).toBe('user');
      
      // Special characters only should fallback to 'user'
      expect(generateUsername('!!!@example.com')).toBe('user');
      
      // Mixed should extract valid parts
      expect(generateUsername('john.doe@example.com')).toBe('johndoe');
      expect(generateUsername('user+tag@example.com')).toBe('usertag');
    });
  });

  /**
   * **Property 12: Username Uniqueness**
   * Generated usernames should be deterministic for same input
   */
  describe('Property 12: Username Determinism', () => {
    it('should generate same username for same email', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const username1 = generateUsername(email);
            const username2 = generateUsername(email);
            
            // Same email should always produce same base username
            expect(username1).toBe(username2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
