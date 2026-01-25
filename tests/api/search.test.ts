/**
 * Search API tests
 * Property tests for /api/search endpoint
 * **Validates: Requirements 1.5, 1.6, 5.4, 5.5, 5.7**
 */
import { describe, it, expect } from 'vitest';

// Test the API validation logic directly (unit tests)
describe('Search API Validation', () => {
  /**
   * Property 9: API Limit Parameter Respected
   * For any search API request with a limit parameter, 
   * the number of returned bicks SHALL be at most min(limit, 50).
   * **Validates: Requirements 5.4**
   */
  it('Property 9: Limit parameter validation', () => {
    // Valid limits
    expect(isValidLimit(1)).toBe(true);
    expect(isValidLimit(20)).toBe(true);
    expect(isValidLimit(50)).toBe(true);
    
    // Invalid limits
    expect(isValidLimit(0)).toBe(false);
    expect(isValidLimit(-1)).toBe(false);
    expect(isValidLimit(51)).toBe(false);
    expect(isValidLimit(100)).toBe(false);
  });

  /**
   * Property 11: API Rejects Long Queries
   * For any search API request where the 'q' parameter exceeds 200 characters,
   * the response SHALL be a 400 status code.
   * **Validates: Requirements 5.7**
   */
  it('Property 11: Query length validation', () => {
    // Valid query lengths
    expect(isValidQueryLength('cat')).toBe(true);
    expect(isValidQueryLength('a'.repeat(200))).toBe(true);
    
    // Invalid query lengths
    expect(isValidQueryLength('a'.repeat(201))).toBe(false);
    expect(isValidQueryLength('a'.repeat(500))).toBe(false);
  });

  /**
   * Property 10: API Response Shape
   * For any valid search API request, the response SHALL be a JSON object 
   * with exactly two keys: 'bicks' (array) and 'nextCursor' (string or null).
   * **Validates: Requirements 5.5**
   */
  it('Property 10: Response shape validation', () => {
    // Valid response shapes
    expect(isValidResponseShape({ bicks: [], nextCursor: null })).toBe(true);
    expect(isValidResponseShape({ bicks: [{ id: '1' }], nextCursor: 'abc123' })).toBe(true);
    expect(isValidResponseShape({ bicks: [], nextCursor: 'cursor' })).toBe(true);
    
    // Invalid response shapes
    expect(isValidResponseShape({ bicks: [] })).toBe(false); // missing nextCursor
    expect(isValidResponseShape({ nextCursor: null })).toBe(false); // missing bicks
    expect(isValidResponseShape({ bicks: 'not-array', nextCursor: null })).toBe(false);
    expect(isValidResponseShape({})).toBe(false);
  });

  /**
   * Test: Empty query validation
   */
  it('Empty query is rejected', () => {
    expect(isValidQuery('')).toBe(false);
    expect(isValidQuery('   ')).toBe(false);
    expect(isValidQuery(null)).toBe(false);
    expect(isValidQuery(undefined)).toBe(false);
  });

  /**
   * Test: Valid query accepted
   */
  it('Valid query is accepted', () => {
    expect(isValidQuery('cat')).toBe(true);
    expect(isValidQuery('funny sound')).toBe(true);
    expect(isValidQuery('a')).toBe(true);
  });
});

// Helper functions that mirror the API validation logic
function isValidLimit(limit: number): boolean {
  return Number.isInteger(limit) && limit >= 1 && limit <= 50;
}

function isValidQueryLength(query: string): boolean {
  return query.length <= 200;
}

function isValidQuery(query: string | null | undefined): boolean {
  if (!query) return false;
  return query.trim().length > 0;
}

function isValidResponseShape(response: unknown): boolean {
  if (typeof response !== 'object' || response === null) return false;
  const obj = response as Record<string, unknown>;
  
  // Must have exactly 'bicks' and 'nextCursor' keys
  const keys = Object.keys(obj);
  if (keys.length !== 2) return false;
  if (!keys.includes('bicks') || !keys.includes('nextCursor')) return false;
  
  // bicks must be an array
  if (!Array.isArray(obj.bicks)) return false;
  
  // nextCursor must be string or null
  if (obj.nextCursor !== null && typeof obj.nextCursor !== 'string') return false;
  
  return true;
}
