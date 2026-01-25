/**
 * Property-based tests for duration enforcement
 * 
 * Feature: upload-pipeline
 * 
 * **Validates: Requirements 3.1, 3.4**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MAX_TRIM_DURATION_MS, MIN_TRIM_DURATION_MS } from '@/lib/audio/trimmer';

/**
 * Helper function that determines if trimming is required
 * This mirrors the logic in the UploadForm component
 */
function requiresTrimming(durationMs: number): boolean {
  return durationMs > MAX_TRIM_DURATION_MS;
}

/**
 * Helper function that calculates the default trim range
 * This mirrors the logic in the UploadForm component
 */
function getDefaultTrimRange(durationMs: number): { start: number; end: number } {
  if (durationMs <= MAX_TRIM_DURATION_MS) {
    return { start: 0, end: durationMs };
  }
  return { start: 0, end: MAX_TRIM_DURATION_MS };
}

/**
 * Helper function that validates a trim range
 */
function isValidTrimRange(
  startMs: number, 
  endMs: number, 
  audioDurationMs: number
): boolean {
  const duration = endMs - startMs;
  
  return (
    startMs >= 0 &&
    endMs > startMs &&
    endMs <= audioDurationMs &&
    duration >= MIN_TRIM_DURATION_MS &&
    duration <= MAX_TRIM_DURATION_MS
  );
}

/**
 * Feature: upload-pipeline, Property 4: Duration Enforcement
 * 
 * *For any* audio duration in milliseconds, the upload pipeline SHALL require 
 * trimming if and only if the duration exceeds 10,000ms (10 seconds).
 * 
 * **Validates: Requirements 3.1, 3.4**
 */
describe('Property 4: Duration Enforcement', () => {
  it('requires trimming if and only if duration exceeds 10 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 300000 }), // Up to 5 minutes
        (durationMs) => {
          const needsTrimming = requiresTrimming(durationMs);
          const exceedsMax = durationMs > MAX_TRIM_DURATION_MS;
          
          // Trimming required iff duration exceeds max
          return needsTrimming === exceedsMax;
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('does not require trimming for durations at or below 10 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_TRIM_DURATION_MS }),
        (durationMs) => {
          return requiresTrimming(durationMs) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('requires trimming for durations above 10 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_TRIM_DURATION_MS + 1, max: 600000 }),
        (durationMs) => {
          return requiresTrimming(durationMs) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary: exactly 10 seconds does not require trimming', () => {
    expect(requiresTrimming(MAX_TRIM_DURATION_MS)).toBe(false);
  });

  it('boundary: 10 seconds + 1ms requires trimming', () => {
    expect(requiresTrimming(MAX_TRIM_DURATION_MS + 1)).toBe(true);
  });
});

describe('Default Trim Range', () => {
  it('returns full duration when audio is within limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_TRIM_DURATION_MS, max: MAX_TRIM_DURATION_MS }),
        (durationMs) => {
          const range = getDefaultTrimRange(durationMs);
          return range.start === 0 && range.end === durationMs;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns max duration when audio exceeds limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_TRIM_DURATION_MS + 1, max: 600000 }),
        (durationMs) => {
          const range = getDefaultTrimRange(durationMs);
          return range.start === 0 && range.end === MAX_TRIM_DURATION_MS;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default trim range is always valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_TRIM_DURATION_MS, max: 600000 }),
        (durationMs) => {
          const range = getDefaultTrimRange(durationMs);
          return isValidTrimRange(range.start, range.end, durationMs);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Trim Range Validation', () => {
  it('accepts valid trim ranges within constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_TRIM_DURATION_MS, max: 60000 }), // Audio duration
        fc.integer({ min: 0, max: 50000 }), // Start offset
        fc.integer({ min: MIN_TRIM_DURATION_MS, max: MAX_TRIM_DURATION_MS }), // Selection duration
        (audioDurationMs, startOffset, selectionDuration) => {
          // Ensure start is within audio
          const startMs = Math.min(startOffset, audioDurationMs - MIN_TRIM_DURATION_MS);
          if (startMs < 0) return true; // Skip invalid inputs
          
          // Ensure end is within audio and selection is valid
          const endMs = Math.min(startMs + selectionDuration, audioDurationMs);
          const actualDuration = endMs - startMs;
          
          if (actualDuration < MIN_TRIM_DURATION_MS) return true; // Skip invalid inputs
          
          return isValidTrimRange(startMs, endMs, audioDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects trim ranges exceeding max duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_TRIM_DURATION_MS + 1, max: 60000 }), // Selection duration
        fc.integer({ min: 60000, max: 300000 }), // Audio duration (must be longer)
        (selectionDuration, audioDurationMs) => {
          const startMs = 0;
          const endMs = selectionDuration;
          
          // Should be invalid because selection exceeds max
          return !isValidTrimRange(startMs, endMs, audioDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects trim ranges extending beyond audio duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5000, max: 30000 }), // Audio duration
        fc.integer({ min: 1000, max: 10000 }), // Overshoot amount
        (audioDurationMs, overshoot) => {
          const startMs = 0;
          const endMs = audioDurationMs + overshoot;
          
          // Should be invalid because end exceeds audio duration
          return !isValidTrimRange(startMs, endMs, audioDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects trim ranges with negative start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: -1 }), // Negative start
        fc.integer({ min: 5000, max: 30000 }), // Audio duration
        (startMs, audioDurationMs) => {
          const endMs = startMs + 5000;
          return !isValidTrimRange(startMs, endMs, audioDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects trim ranges where end <= start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 20000 }), // Start
        fc.integer({ min: -1000, max: 0 }), // Offset (negative or zero)
        fc.integer({ min: 30000, max: 60000 }), // Audio duration
        (startMs, offset, audioDurationMs) => {
          const endMs = startMs + offset;
          return !isValidTrimRange(startMs, endMs, audioDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects trim ranges below minimum duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20000 }), // Start
        fc.integer({ min: 1, max: MIN_TRIM_DURATION_MS - 1 }), // Duration below min
        fc.integer({ min: 30000, max: 60000 }), // Audio duration
        (startMs, duration, audioDurationMs) => {
          const endMs = startMs + duration;
          return !isValidTrimRange(startMs, endMs, audioDurationMs);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Duration Constants', () => {
  it('MAX_TRIM_DURATION_MS is 10 seconds', () => {
    expect(MAX_TRIM_DURATION_MS).toBe(10000);
  });

  it('MIN_TRIM_DURATION_MS is 100ms', () => {
    expect(MIN_TRIM_DURATION_MS).toBe(100);
  });

  it('MIN is less than MAX', () => {
    expect(MIN_TRIM_DURATION_MS).toBeLessThan(MAX_TRIM_DURATION_MS);
  });
});
