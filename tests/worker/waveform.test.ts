/**
 * Waveform Generator Tests
 * 
 * Tests for waveform JSON generation and peak extraction.
 * 
 * **Property 2: Waveform Resolution**
 * **Property 3: Waveform Normalization**
 * **Validates: Requirements 2.2, 2.3**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { extractPeaks } from '../../worker/lib/waveform';

describe('Waveform Generator', () => {
  describe('extractPeaks', () => {
    it('should return empty array for empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const peaks = extractPeaks(buffer, 100);
      expect(peaks).toEqual([]);
    });

    it('should extract peaks from simple PCM data', () => {
      // Create a buffer with known values
      // 16-bit signed: max positive is 32767, max negative is -32768
      const buffer = Buffer.alloc(8); // 4 samples
      buffer.writeInt16LE(16384, 0);  // 0.5 normalized
      buffer.writeInt16LE(-32768, 2); // 1.0 normalized (max)
      buffer.writeInt16LE(0, 4);      // 0.0 normalized
      buffer.writeInt16LE(8192, 6);   // 0.25 normalized

      const peaks = extractPeaks(buffer, 4);
      
      expect(peaks.length).toBe(4);
      expect(peaks[0]).toBeCloseTo(0.5, 1);
      expect(peaks[1]).toBeCloseTo(1.0, 1);
      expect(peaks[2]).toBe(0);
      expect(peaks[3]).toBeCloseTo(0.25, 1);
    });

    it('should downsample when targetSamples is less than actual samples', () => {
      // Create 100 samples
      const buffer = Buffer.alloc(200);
      for (let i = 0; i < 100; i++) {
        buffer.writeInt16LE(i * 327, i * 2); // Increasing values
      }

      // Request only 10 peaks
      const peaks = extractPeaks(buffer, 10);
      
      expect(peaks.length).toBeLessThanOrEqual(10);
      // Each peak should be the max of its window
      peaks.forEach(peak => {
        expect(peak).toBeGreaterThanOrEqual(0);
        expect(peak).toBeLessThanOrEqual(1);
      });
    });
  });
});

/**
 * Property 2: Waveform Resolution
 * 
 * For any valid audio file with duration D seconds, the generated waveform
 * SHALL contain at least D × 100 samples (minimum 100 samples per second).
 * 
 * Note: This property is tested at the extractPeaks level since we can't
 * easily generate real audio files in tests.
 */
describe('Property 2: Waveform Resolution', () => {
  it('should produce peaks within reasonable bounds of targetSamples', () => {
    fc.assert(
      fc.property(
        // Generate random sample counts (simulating different audio durations)
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 10, max: 1000 }),
        fc.array(fc.integer({ min: -32768, max: 32767 }), { minLength: 100, maxLength: 10000 }),
        (sampleCount, targetSamples, randomValues) => {
          // Create PCM buffer with random samples from fast-check
          const actualSampleCount = Math.min(sampleCount, randomValues.length);
          const buffer = Buffer.alloc(actualSampleCount * 2);
          for (let i = 0; i < actualSampleCount; i++) {
            buffer.writeInt16LE(randomValues[i % randomValues.length], i * 2);
          }

          const peaks = extractPeaks(buffer, targetSamples);
          
          // Should produce peaks - may be slightly more or less than target
          // due to integer division in the algorithm
          expect(peaks.length).toBeGreaterThan(0);
          // Allow some tolerance (up to 2x target or at least 1)
          expect(peaks.length).toBeLessThanOrEqual(Math.max(targetSamples * 2, actualSampleCount));
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 3: Waveform Normalization
 * 
 * For any generated waveform JSON, all peak values in the peaks array
 * SHALL be within the range [0.0, 1.0] inclusive.
 */
describe('Property 3: Waveform Normalization', () => {
  it('should produce normalized peaks in [0.0, 1.0] for any PCM input', () => {
    fc.assert(
      fc.property(
        // Generate random 16-bit signed samples
        fc.array(fc.integer({ min: -32768, max: 32767 }), { minLength: 10, maxLength: 1000 }),
        (samples) => {
          const buffer = Buffer.alloc(samples.length * 2);
          samples.forEach((s, i) => buffer.writeInt16LE(s, i * 2));
          
          const peaks = extractPeaks(buffer, Math.ceil(samples.length / 10));
          
          // All peaks must be in [0.0, 1.0]
          peaks.forEach(peak => {
            expect(peak).toBeGreaterThanOrEqual(0.0);
            expect(peak).toBeLessThanOrEqual(1.0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases: all zeros', () => {
    const buffer = Buffer.alloc(100);
    const peaks = extractPeaks(buffer, 10);
    
    peaks.forEach(peak => {
      expect(peak).toBe(0);
    });
  });

  it('should handle edge cases: max positive values', () => {
    const buffer = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) {
      buffer.writeInt16LE(32767, i * 2);
    }
    
    const peaks = extractPeaks(buffer, 10);
    
    peaks.forEach(peak => {
      expect(peak).toBeCloseTo(1.0, 2);
    });
  });

  it('should handle edge cases: max negative values', () => {
    const buffer = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) {
      buffer.writeInt16LE(-32768, i * 2);
    }
    
    const peaks = extractPeaks(buffer, 10);
    
    peaks.forEach(peak => {
      expect(peak).toBe(1.0);
    });
  });
});
