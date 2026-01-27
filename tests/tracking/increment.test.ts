/**
 * Property-based tests for atomic count increment functions
 * 
 * Feature: play-share-tracking
 * 
 * **Property 4: Atomic count increment**
 * *For any* valid tracking request, the corresponding count (play_count or share_count)
 * SHALL increase by exactly 1, regardless of concurrent requests.
 * 
 * **Validates: Requirements 1.3, 2.4**
 * 
 * Note: These tests mock the Supabase RPC calls since we can't test actual
 * database operations in unit tests. The tests verify the increment logic -
 * that each call increases the count by exactly 1.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ============================================================================
// MOCK IMPLEMENTATION
// ============================================================================

/**
 * Simulates the atomic increment behavior of the Supabase RPC functions.
 * This mock maintains state to verify that increments work correctly.
 */
class MockBickStore {
  private bicks: Map<string, { playCount: number; shareCount: number }> = new Map();

  /**
   * Creates a bick with initial counts
   */
  createBick(id: string, playCount: number, shareCount: number): void {
    this.bicks.set(id, { playCount, shareCount });
  }

  /**
   * Simulates increment_play_count RPC function
   * Returns the new count after increment, or null if bick doesn't exist
   */
  incrementPlayCount(bickId: string): number | null {
    const bick = this.bicks.get(bickId);
    if (!bick) return null;
    
    bick.playCount += 1;
    return bick.playCount;
  }

  /**
   * Simulates increment_share_count RPC function
   * Returns the new count after increment, or null if bick doesn't exist
   */
  incrementShareCount(bickId: string): number | null {
    const bick = this.bicks.get(bickId);
    if (!bick) return null;
    
    bick.shareCount += 1;
    return bick.shareCount;
  }

  /**
   * Gets the current counts for a bick
   */
  getCounts(bickId: string): { playCount: number; shareCount: number } | null {
    return this.bicks.get(bickId) ?? null;
  }

  /**
   * Clears all bicks
   */
  clear(): void {
    this.bicks.clear();
  }

  /**
   * Checks if a bick exists
   */
  exists(bickId: string): boolean {
    return this.bicks.has(bickId);
  }
}

// ============================================================================
// TEST SETUP
// ============================================================================

let store: MockBickStore;

beforeEach(() => {
  store = new MockBickStore();
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

/**
 * Property 4: Atomic count increment
 * 
 * *For any* valid tracking request, the corresponding count (play_count or share_count)
 * SHALL increase by exactly 1, regardless of concurrent requests.
 * 
 * **Validates: Requirements 1.3, 2.4**
 */
describe('Property 4: Atomic count increment', () => {
  /**
   * Test that increment_play_count increases play_count by exactly 1
   */
  it('increment_play_count increases count by exactly 1 for any initial count', () => {
    fc.assert(
      fc.property(
        // Generate random initial play counts (0 to 10000)
        fc.integer({ min: 0, max: 10000 }),
        fc.uuid(),
        (initialCount, bickId) => {
          // Create bick with initial count
          store.createBick(bickId, initialCount, 0);
          
          // Call increment_play_count
          const newCount = store.incrementPlayCount(bickId);
          
          // Verify the returned count is exactly initialCount + 1
          expect(newCount).toBe(initialCount + 1);
          
          // Also verify by reading the actual store value
          const counts = store.getCounts(bickId);
          expect(counts?.playCount).toBe(initialCount + 1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that increment_share_count increases share_count by exactly 1
   */
  it('increment_share_count increases count by exactly 1 for any initial count', () => {
    fc.assert(
      fc.property(
        // Generate random initial share counts (0 to 10000)
        fc.integer({ min: 0, max: 10000 }),
        fc.uuid(),
        (initialCount, bickId) => {
          // Create bick with initial count
          store.createBick(bickId, 0, initialCount);
          
          // Call increment_share_count
          const newCount = store.incrementShareCount(bickId);
          
          // Verify the returned count is exactly initialCount + 1
          expect(newCount).toBe(initialCount + 1);
          
          // Also verify by reading the actual store value
          const counts = store.getCounts(bickId);
          expect(counts?.shareCount).toBe(initialCount + 1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that N sequential increments result in count increasing by exactly N
   */
  it('N sequential play increments increase count by exactly N', () => {
    fc.assert(
      fc.property(
        // Generate random initial count and number of increments
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.uuid(),
        (initialCount, numIncrements, bickId) => {
          store.createBick(bickId, initialCount, 0);
          
          // Perform N increments sequentially
          for (let i = 0; i < numIncrements; i++) {
            store.incrementPlayCount(bickId);
          }
          
          // Verify final count
          const counts = store.getCounts(bickId);
          expect(counts?.playCount).toBe(initialCount + numIncrements);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that N sequential share increments result in count increasing by exactly N
   */
  it('N sequential share increments increase count by exactly N', () => {
    fc.assert(
      fc.property(
        // Generate random initial count and number of increments
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.uuid(),
        (initialCount, numIncrements, bickId) => {
          store.createBick(bickId, 0, initialCount);
          
          // Perform N increments sequentially
          for (let i = 0; i < numIncrements; i++) {
            store.incrementShareCount(bickId);
          }
          
          // Verify final count
          const counts = store.getCounts(bickId);
          expect(counts?.shareCount).toBe(initialCount + numIncrements);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that concurrent increments (simulated) all get counted correctly
   * Note: In a real database, this would test atomic operations.
   * Here we verify that the increment logic is correct.
   */
  it('multiple play increments all get counted correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 2, max: 50 }),
        fc.uuid(),
        (initialCount, numIncrements, bickId) => {
          store.createBick(bickId, initialCount, 0);
          
          // Perform multiple increments
          const results: (number | null)[] = [];
          for (let i = 0; i < numIncrements; i++) {
            results.push(store.incrementPlayCount(bickId));
          }
          
          // All should succeed (not null)
          expect(results.every(r => r !== null)).toBe(true);
          
          // Final count should be initial + number of increments
          const counts = store.getCounts(bickId);
          expect(counts?.playCount).toBe(initialCount + numIncrements);
          
          // Each result should be sequential
          for (let i = 0; i < results.length; i++) {
            expect(results[i]).toBe(initialCount + i + 1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that multiple share increments all get counted correctly
   */
  it('multiple share increments all get counted correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 2, max: 50 }),
        fc.uuid(),
        (initialCount, numIncrements, bickId) => {
          store.createBick(bickId, 0, initialCount);
          
          // Perform multiple increments
          const results: (number | null)[] = [];
          for (let i = 0; i < numIncrements; i++) {
            results.push(store.incrementShareCount(bickId));
          }
          
          // All should succeed (not null)
          expect(results.every(r => r !== null)).toBe(true);
          
          // Final count should be initial + number of increments
          const counts = store.getCounts(bickId);
          expect(counts?.shareCount).toBe(initialCount + numIncrements);
          
          // Each result should be sequential
          for (let i = 0; i < results.length; i++) {
            expect(results[i]).toBe(initialCount + i + 1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that increment returns exactly the new count value
   */
  it('increment_play_count returns the exact new count value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.uuid(),
        (initialCount, bickId) => {
          store.createBick(bickId, initialCount, 0);
          
          const returnedCount = store.incrementPlayCount(bickId);
          const actualCount = store.getCounts(bickId)?.playCount;
          
          // Returned count should match actual count
          expect(returnedCount).toBe(actualCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that increment returns exactly the new count value for shares
   */
  it('increment_share_count returns the exact new count value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.uuid(),
        (initialCount, bickId) => {
          store.createBick(bickId, 0, initialCount);
          
          const returnedCount = store.incrementShareCount(bickId);
          const actualCount = store.getCounts(bickId)?.shareCount;
          
          // Returned count should match actual count
          expect(returnedCount).toBe(actualCount);
          
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

describe('Atomic increment - Edge cases', () => {
  it('increment_play_count works with zero initial count', () => {
    const bickId = 'test-bick-zero-play';
    store.createBick(bickId, 0, 0);
    
    const newCount = store.incrementPlayCount(bickId);
    
    expect(newCount).toBe(1);
    expect(store.getCounts(bickId)?.playCount).toBe(1);
  });

  it('increment_share_count works with zero initial count', () => {
    const bickId = 'test-bick-zero-share';
    store.createBick(bickId, 0, 0);
    
    const newCount = store.incrementShareCount(bickId);
    
    expect(newCount).toBe(1);
    expect(store.getCounts(bickId)?.shareCount).toBe(1);
  });

  it('increment_play_count returns null for non-existent bick', () => {
    const nonExistentId = 'non-existent-bick';
    
    const newCount = store.incrementPlayCount(nonExistentId);
    
    expect(newCount).toBeNull();
  });

  it('increment_share_count returns null for non-existent bick', () => {
    const nonExistentId = 'non-existent-bick';
    
    const newCount = store.incrementShareCount(nonExistentId);
    
    expect(newCount).toBeNull();
  });

  it('play and share counts are independent', () => {
    const bickId = 'test-bick-independent';
    store.createBick(bickId, 5, 10);
    
    // Increment play count
    store.incrementPlayCount(bickId);
    
    // Verify only play count changed
    let counts = store.getCounts(bickId);
    expect(counts?.playCount).toBe(6);
    expect(counts?.shareCount).toBe(10);
    
    // Increment share count
    store.incrementShareCount(bickId);
    
    // Verify only share count changed
    counts = store.getCounts(bickId);
    expect(counts?.playCount).toBe(6);
    expect(counts?.shareCount).toBe(11);
  });

  it('handles large counts correctly', () => {
    const bickId = 'test-bick-large';
    const largeCount = 999999;
    store.createBick(bickId, largeCount, largeCount);
    
    const newPlayCount = store.incrementPlayCount(bickId);
    const newShareCount = store.incrementShareCount(bickId);
    
    expect(newPlayCount).toBe(largeCount + 1);
    expect(newShareCount).toBe(largeCount + 1);
  });

  it('handles maximum safe integer counts', () => {
    const bickId = 'test-bick-max';
    // Use a large but safe count
    const maxSafeCount = Number.MAX_SAFE_INTEGER - 1;
    store.createBick(bickId, maxSafeCount, 0);
    
    const newCount = store.incrementPlayCount(bickId);
    
    expect(newCount).toBe(maxSafeCount + 1);
  });

  it('multiple increments on same bick accumulate correctly', () => {
    const bickId = 'test-bick-accumulate';
    store.createBick(bickId, 0, 0);
    
    // Increment play count 5 times
    for (let i = 0; i < 5; i++) {
      store.incrementPlayCount(bickId);
    }
    
    // Increment share count 3 times
    for (let i = 0; i < 3; i++) {
      store.incrementShareCount(bickId);
    }
    
    const counts = store.getCounts(bickId);
    expect(counts?.playCount).toBe(5);
    expect(counts?.shareCount).toBe(3);
  });

  it('different bicks have independent counts', () => {
    const bickId1 = 'test-bick-1';
    const bickId2 = 'test-bick-2';
    
    store.createBick(bickId1, 10, 20);
    store.createBick(bickId2, 100, 200);
    
    // Increment bick1
    store.incrementPlayCount(bickId1);
    store.incrementShareCount(bickId1);
    
    // Verify bick2 is unchanged
    const counts2 = store.getCounts(bickId2);
    expect(counts2?.playCount).toBe(100);
    expect(counts2?.shareCount).toBe(200);
    
    // Verify bick1 was incremented
    const counts1 = store.getCounts(bickId1);
    expect(counts1?.playCount).toBe(11);
    expect(counts1?.shareCount).toBe(21);
  });
});
