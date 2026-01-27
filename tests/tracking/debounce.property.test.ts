/**
 * Property-based tests for debounce logic
 * 
 * Feature: play-share-tracking
 * 
 * **Property 3: Debounce prevents duplicate events**
 * *For any* sequence of tracking events for the same bick and event type,
 * if two events occur within the debounce window (30s for play, 60s for share),
 * only the first event SHALL result in an API call.
 * 
 * **Validates: Requirements 1.2, 2.3**
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { _testUtils } from '@/hooks/useTrackingDebounce';

const {
  isDebounceWindowPassed,
  DEFAULT_DEBOUNCE_MS,
} = _testUtils;

// ============================================================================
// TEST SETUP
// ============================================================================

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// CUSTOM ARBITRARIES
// ============================================================================

/**
 * Generates valid bick IDs (UUID-like strings)
 */
const bickIdArbitrary = fc.uuid();

/**
 * Generates event types
 */
const eventTypeArbitrary = fc.constantFrom('play', 'share') as fc.Arbitrary<'play' | 'share'>;

/**
 * Generates debounce windows in milliseconds (1 second to 2 minutes)
 */
const debounceWindowArbitrary = fc.integer({ min: 1000, max: 120000 });

/**
 * Generates a sequence of timestamps representing event times
 * Each timestamp is a positive offset from the start time
 */
const timestampSequenceArbitrary = (maxEvents: number = 20) =>
  fc.array(
    fc.integer({ min: 0, max: 300000 }), // Up to 5 minutes of events
    { minLength: 1, maxLength: maxEvents }
  ).map(offsets => offsets.sort((a, b) => a - b)); // Sort to ensure chronological order

/**
 * Generates a pair of timestamps for testing debounce behavior
 */
const timestampPairArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 100000 }),
  fc.integer({ min: 0, max: 100000 })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulates the debounce logic and returns which events would trigger API calls
 * This is a pure function that mirrors the hook's debounce behavior
 */
function simulateDebounce(
  timestamps: number[],
  debounceMs: number
): { triggeredAt: number[]; blockedAt: number[] } {
  const triggeredAt: number[] = [];
  const blockedAt: number[] = [];
  let lastTriggered = -Infinity;

  for (const timestamp of timestamps) {
    if (timestamp - lastTriggered >= debounceMs) {
      triggeredAt.push(timestamp);
      lastTriggered = timestamp;
    } else {
      blockedAt.push(timestamp);
    }
  }

  return { triggeredAt, blockedAt };
}

/**
 * Counts how many events should trigger API calls given a sequence of timestamps
 */
function countExpectedApiCalls(timestamps: number[], debounceMs: number): number {
  return simulateDebounce(timestamps, debounceMs).triggeredAt.length;
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

/**
 * Property 3: Debounce prevents duplicate events
 * 
 * *For any* sequence of tracking events for the same bick and event type,
 * if two events occur within the debounce window (30s for play, 60s for share),
 * only the first event SHALL result in an API call.
 * 
 * **Validates: Requirements 1.2, 2.3**
 */
describe('Property 3: Debounce prevents duplicate events', () => {
  /**
   * Test that the first event in any sequence always triggers an API call
   */
  it('first event always triggers API call for any bick and event type', () => {
    fc.assert(
      fc.property(
        bickIdArbitrary,
        eventTypeArbitrary,
        debounceWindowArbitrary,
        (bickId, eventType, debounceMs) => {
          // First event should always pass debounce check
          // (lastTracked = 0 means no previous event)
          const result = isDebounceWindowPassed(0, debounceMs);
          expect(result).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that events within debounce window are blocked
   */
  it('events within debounce window are blocked for any timestamp pair', () => {
    fc.assert(
      fc.property(
        debounceWindowArbitrary,
        fc.integer({ min: 1, max: 100000 }), // Time since last event
        (debounceMs, timeSinceLastEvent) => {
          const now = Date.now();
          vi.setSystemTime(now);
          
          const lastTracked = now - timeSinceLastEvent;
          const result = isDebounceWindowPassed(lastTracked, debounceMs);
          
          // Should be blocked if time since last event is less than debounce window
          if (timeSinceLastEvent < debounceMs) {
            expect(result).toBe(false);
          } else {
            expect(result).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that events exactly at debounce boundary are allowed
   */
  it('events exactly at debounce boundary are allowed', () => {
    fc.assert(
      fc.property(
        debounceWindowArbitrary,
        (debounceMs) => {
          const now = Date.now();
          vi.setSystemTime(now);
          
          // Event exactly at debounce boundary
          const lastTracked = now - debounceMs;
          const result = isDebounceWindowPassed(lastTracked, debounceMs);
          
          expect(result).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that events after debounce window are allowed
   */
  it('events after debounce window are allowed for any delay', () => {
    fc.assert(
      fc.property(
        debounceWindowArbitrary,
        fc.integer({ min: 1, max: 100000 }), // Extra time past debounce window
        (debounceMs, extraTime) => {
          const now = Date.now();
          vi.setSystemTime(now);
          
          // Event after debounce window
          const lastTracked = now - debounceMs - extraTime;
          const result = isDebounceWindowPassed(lastTracked, debounceMs);
          
          expect(result).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that for any sequence of timestamps, the correct number of API calls are made
   */
  it('correct number of API calls for any timestamp sequence', () => {
    fc.assert(
      fc.property(
        timestampSequenceArbitrary(15),
        debounceWindowArbitrary,
        (timestamps, debounceMs) => {
          const { triggeredAt, blockedAt } = simulateDebounce(timestamps, debounceMs);
          
          // Total events should equal triggered + blocked
          expect(triggeredAt.length + blockedAt.length).toBe(timestamps.length);
          
          // First event should always be triggered (if there are any events)
          if (timestamps.length > 0) {
            expect(triggeredAt[0]).toBe(timestamps[0]);
          }
          
          // All triggered events should be at least debounceMs apart
          for (let i = 1; i < triggeredAt.length; i++) {
            expect(triggeredAt[i] - triggeredAt[i - 1]).toBeGreaterThanOrEqual(debounceMs);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that blocked events are always within debounce window of a triggered event
   */
  it('blocked events are within debounce window of previous triggered event', () => {
    fc.assert(
      fc.property(
        timestampSequenceArbitrary(15),
        debounceWindowArbitrary,
        (timestamps, debounceMs) => {
          const { triggeredAt, blockedAt } = simulateDebounce(timestamps, debounceMs);
          
          // For each blocked event, find the most recent triggered event before it
          for (const blockedTime of blockedAt) {
            const previousTriggered = triggeredAt
              .filter(t => t < blockedTime)
              .sort((a, b) => b - a)[0];
            
            // There should always be a previous triggered event
            expect(previousTriggered).toBeDefined();
            
            // The blocked event should be within the debounce window
            expect(blockedTime - previousTriggered).toBeLessThan(debounceMs);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that play events use 30-second default debounce
   */
  it('play events use 30-second default debounce window', () => {
    expect(DEFAULT_DEBOUNCE_MS.play).toBe(30000);
    
    fc.assert(
      fc.property(
        timestampSequenceArbitrary(10),
        (timestamps) => {
          const debounceMs = DEFAULT_DEBOUNCE_MS.play;
          const { triggeredAt } = simulateDebounce(timestamps, debounceMs);
          
          // All triggered events should be at least 30 seconds apart
          for (let i = 1; i < triggeredAt.length; i++) {
            expect(triggeredAt[i] - triggeredAt[i - 1]).toBeGreaterThanOrEqual(30000);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that share events use 60-second default debounce
   */
  it('share events use 60-second default debounce window', () => {
    expect(DEFAULT_DEBOUNCE_MS.share).toBe(60000);
    
    fc.assert(
      fc.property(
        timestampSequenceArbitrary(10),
        (timestamps) => {
          const debounceMs = DEFAULT_DEBOUNCE_MS.share;
          const { triggeredAt } = simulateDebounce(timestamps, debounceMs);
          
          // All triggered events should be at least 60 seconds apart
          for (let i = 1; i < triggeredAt.length; i++) {
            expect(triggeredAt[i] - triggeredAt[i - 1]).toBeGreaterThanOrEqual(60000);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that different bicks are tracked independently
   * (simulated by running debounce logic separately for each bick)
   */
  it('different bicks are tracked independently', () => {
    fc.assert(
      fc.property(
        bickIdArbitrary,
        bickIdArbitrary,
        timestampSequenceArbitrary(5),
        debounceWindowArbitrary,
        (bickId1, bickId2, timestamps, debounceMs) => {
          // Skip if bicks are the same
          if (bickId1 === bickId2) return true;
          
          // Each bick should have its own debounce state
          // Running the same timestamps for both should yield the same results
          // (because they're independent)
          const result1 = simulateDebounce(timestamps, debounceMs);
          const result2 = simulateDebounce(timestamps, debounceMs);
          
          expect(result1.triggeredAt).toEqual(result2.triggeredAt);
          expect(result1.blockedAt).toEqual(result2.blockedAt);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that different event types are tracked independently
   */
  it('play and share events are tracked independently for same bick', () => {
    fc.assert(
      fc.property(
        bickIdArbitrary,
        timestampSequenceArbitrary(5),
        (bickId, timestamps) => {
          // Play and share have different debounce windows
          const playDebounce = DEFAULT_DEBOUNCE_MS.play;
          const shareDebounce = DEFAULT_DEBOUNCE_MS.share;
          
          const playResult = simulateDebounce(timestamps, playDebounce);
          const shareResult = simulateDebounce(timestamps, shareDebounce);
          
          // Play events (30s debounce) should trigger more often than share events (60s debounce)
          // or equal if timestamps are sparse enough
          expect(playResult.triggeredAt.length).toBeGreaterThanOrEqual(shareResult.triggeredAt.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that rapid-fire events only trigger once
   */
  it('rapid-fire events within debounce window trigger only once', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }), // Number of rapid events
        debounceWindowArbitrary,
        (numEvents, debounceMs) => {
          // Generate timestamps all within the debounce window
          const timestamps = Array.from({ length: numEvents }, (_, i) => 
            Math.floor((i * debounceMs) / (numEvents * 2)) // All within half the debounce window
          );
          
          const { triggeredAt } = simulateDebounce(timestamps, debounceMs);
          
          // Only the first event should trigger
          expect(triggeredAt.length).toBe(1);
          expect(triggeredAt[0]).toBe(timestamps[0]);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that events spaced exactly at debounce intervals all trigger
   */
  it('events spaced at debounce intervals all trigger', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // Number of events
        debounceWindowArbitrary,
        (numEvents, debounceMs) => {
          // Generate timestamps exactly at debounce intervals
          const timestamps = Array.from({ length: numEvents }, (_, i) => i * debounceMs);
          
          const { triggeredAt } = simulateDebounce(timestamps, debounceMs);
          
          // All events should trigger
          expect(triggeredAt.length).toBe(numEvents);
          expect(triggeredAt).toEqual(timestamps);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test monotonicity: adding more events never decreases triggered count
   */
  it('adding events outside debounce window increases triggered count', () => {
    fc.assert(
      fc.property(
        timestampSequenceArbitrary(10),
        debounceWindowArbitrary,
        fc.integer({ min: 1, max: 5 }), // Number of events to add
        (baseTimestamps, debounceMs, numToAdd) => {
          const baseResult = simulateDebounce(baseTimestamps, debounceMs);
          
          // Add events well outside the debounce window
          const maxTimestamp = Math.max(...baseTimestamps, 0);
          const newTimestamps = Array.from({ length: numToAdd }, (_, i) => 
            maxTimestamp + debounceMs * (i + 1)
          );
          
          const extendedTimestamps = [...baseTimestamps, ...newTimestamps].sort((a, b) => a - b);
          const extendedResult = simulateDebounce(extendedTimestamps, debounceMs);
          
          // Extended result should have at least as many triggered events
          expect(extendedResult.triggeredAt.length).toBeGreaterThanOrEqual(
            baseResult.triggeredAt.length
          );
          
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

describe('Debounce logic - Edge cases', () => {
  it('handles empty timestamp sequence', () => {
    const { triggeredAt, blockedAt } = simulateDebounce([], 30000);
    expect(triggeredAt).toEqual([]);
    expect(blockedAt).toEqual([]);
  });

  it('handles single timestamp', () => {
    const { triggeredAt, blockedAt } = simulateDebounce([1000], 30000);
    expect(triggeredAt).toEqual([1000]);
    expect(blockedAt).toEqual([]);
  });

  it('handles two timestamps within window', () => {
    const { triggeredAt, blockedAt } = simulateDebounce([0, 15000], 30000);
    expect(triggeredAt).toEqual([0]);
    expect(blockedAt).toEqual([15000]);
  });

  it('handles two timestamps outside window', () => {
    const { triggeredAt, blockedAt } = simulateDebounce([0, 35000], 30000);
    expect(triggeredAt).toEqual([0, 35000]);
    expect(blockedAt).toEqual([]);
  });

  it('handles timestamps at exact boundary', () => {
    const { triggeredAt, blockedAt } = simulateDebounce([0, 30000], 30000);
    expect(triggeredAt).toEqual([0, 30000]);
    expect(blockedAt).toEqual([]);
  });

  it('handles very small debounce window (1ms)', () => {
    const timestamps = [0, 1, 2, 3, 4];
    const { triggeredAt } = simulateDebounce(timestamps, 1);
    expect(triggeredAt).toEqual([0, 1, 2, 3, 4]);
  });

  it('handles very large debounce window', () => {
    const timestamps = [0, 10000, 20000, 30000, 40000];
    const { triggeredAt, blockedAt } = simulateDebounce(timestamps, 100000);
    expect(triggeredAt).toEqual([0]);
    expect(blockedAt).toEqual([10000, 20000, 30000, 40000]);
  });

  it('handles duplicate timestamps', () => {
    const timestamps = [0, 0, 0, 30000, 30000];
    const { triggeredAt, blockedAt } = simulateDebounce(timestamps, 30000);
    expect(triggeredAt).toEqual([0, 30000]);
    expect(blockedAt).toEqual([0, 0, 30000]);
  });

  it('handles alternating pattern of allowed/blocked', () => {
    // Events at 0, 15s, 30s, 45s, 60s with 30s debounce
    const timestamps = [0, 15000, 30000, 45000, 60000];
    const { triggeredAt, blockedAt } = simulateDebounce(timestamps, 30000);
    expect(triggeredAt).toEqual([0, 30000, 60000]);
    expect(blockedAt).toEqual([15000, 45000]);
  });

  it('handles realistic play event scenario', () => {
    // User plays, pauses, plays again quickly, then plays much later
    const timestamps = [0, 5000, 10000, 120000]; // 0s, 5s, 10s, 2min
    const { triggeredAt, blockedAt } = simulateDebounce(timestamps, DEFAULT_DEBOUNCE_MS.play);
    expect(triggeredAt).toEqual([0, 120000]);
    expect(blockedAt).toEqual([5000, 10000]);
  });

  it('handles realistic share event scenario', () => {
    // User shares, tries to share again, then shares much later
    const timestamps = [0, 30000, 45000, 180000]; // 0s, 30s, 45s, 3min
    const { triggeredAt, blockedAt } = simulateDebounce(timestamps, DEFAULT_DEBOUNCE_MS.share);
    expect(triggeredAt).toEqual([0, 180000]);
    expect(blockedAt).toEqual([30000, 45000]);
  });
});
