/**
 * Property-based tests for audio trimming utilities
 * 
 * Feature: upload-pipeline
 * 
 * **Validates: Requirements 3.5**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  trimAudio,
  encodeWav,
  validateTrimRange,
  calculateTrimDuration,
  TrimError,
  MAX_TRIM_DURATION_MS,
  MIN_TRIM_DURATION_MS,
} from '@/lib/audio/trimmer';

/**
 * Mock AudioBuffer implementation for testing
 * Using type assertion to avoid strict ArrayBuffer type issues
 */
class MockAudioBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  readonly duration: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    
    // Initialize channel data with sine wave for realistic audio
    this.channelData = [];
    for (let ch = 0; ch < options.numberOfChannels; ch++) {
      const data = new Float32Array(options.length);
      for (let i = 0; i < options.length; i++) {
        // Generate a simple sine wave at 440Hz
        data[i] = Math.sin((2 * Math.PI * 440 * i) / options.sampleRate) * 0.5;
      }
      this.channelData.push(data);
    }
  }

  getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.numberOfChannels) {
      throw new Error(`Invalid channel index: ${channel}`);
    }
    return this.channelData[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const source = this.getChannelData(channelNumber);
    const offset = bufferOffset || 0;
    for (let i = 0; i < destination.length && i + offset < source.length; i++) {
      destination[i] = source[i + offset];
    }
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const dest = this.getChannelData(channelNumber);
    const offset = bufferOffset || 0;
    for (let i = 0; i < source.length && i + offset < dest.length; i++) {
      dest[i + offset] = source[i];
    }
  }
}

/**
 * Mock AudioContext for testing
 */
class MockAudioContext {
  sampleRate = 44100;

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): unknown {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<unknown> {
    // Simulate decoding - create a buffer based on the input size
    // Assume 16-bit stereo audio at 44100Hz
    const bytesPerSample = 2;
    const channels = 2;
    const headerSize = 44; // WAV header
    const dataSize = Math.max(0, arrayBuffer.byteLength - headerSize);
    const samples = Math.floor(dataSize / (bytesPerSample * channels));
    
    // Minimum 1 sample to avoid empty buffers
    const length = Math.max(1, samples || Math.floor(arrayBuffer.byteLength / 4));
    
    return new MockAudioBuffer({
      numberOfChannels: channels,
      length,
      sampleRate: this.sampleRate,
    });
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

// Store original AudioContext
const originalAudioContext = globalThis.AudioContext;

beforeEach(() => {
  // Mock AudioContext globally
  globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
});

afterEach(() => {
  // Restore original AudioContext
  globalThis.AudioContext = originalAudioContext;
  vi.restoreAllMocks();
});

/**
 * Feature: upload-pipeline, Property 5: Audio Trimming Accuracy
 * 
 * *For any* audio buffer and valid trim range (start, end) where end - start <= 10000ms,
 * the trimmed output SHALL have a duration equal to (end - start) within a tolerance of 100ms.
 * 
 * **Validates: Requirements 3.5**
 */
describe('Property 5: Audio Trimming Accuracy', () => {
  // Generator for valid trim ranges
  const validTrimRangeArb = fc.tuple(
    fc.integer({ min: 0, max: 50000 }), // startMs (up to 50 seconds)
    fc.integer({ min: MIN_TRIM_DURATION_MS, max: MAX_TRIM_DURATION_MS }) // duration
  ).map(([startMs, duration]) => ({
    startMs,
    endMs: startMs + duration,
    expectedDuration: duration,
  }));

  it('produces trimmed audio with duration equal to (end - start) within 100ms tolerance', async () => {
    await fc.assert(
      fc.asyncProperty(
        validTrimRangeArb,
        async ({ startMs, endMs, expectedDuration }) => {
          // Create a mock audio file with sufficient duration
          const totalDurationMs = endMs + 1000; // Add buffer
          const sampleRate = 44100;
          const channels = 2;
          const bytesPerSample = 2;
          const samples = Math.ceil((totalDurationMs / 1000) * sampleRate);
          const headerSize = 44;
          const dataSize = samples * channels * bytesPerSample;
          
          const audioFile = new Blob([new ArrayBuffer(headerSize + dataSize)], { type: 'audio/wav' });
          
          const result = await trimAudio(audioFile, startMs, endMs);
          
          // Check that duration is within 100ms tolerance
          const tolerance = 100;
          const durationDiff = Math.abs(result.durationMs - expectedDuration);
          
          return durationDiff <= tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateTrimDuration returns exact expected duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: MIN_TRIM_DURATION_MS, max: MAX_TRIM_DURATION_MS }),
        (startMs, duration) => {
          const endMs = startMs + duration;
          const calculated = calculateTrimDuration(startMs, endMs);
          return calculated === duration;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('trimmed audio duration matches calculated duration within tolerance', async () => {
    // Test with specific known values
    const testCases = [
      { startMs: 0, endMs: 1000, expectedDuration: 1000 },
      { startMs: 0, endMs: 5000, expectedDuration: 5000 },
      { startMs: 0, endMs: 10000, expectedDuration: 10000 },
      { startMs: 1000, endMs: 3000, expectedDuration: 2000 },
      { startMs: 5000, endMs: 10000, expectedDuration: 5000 },
    ];

    for (const { startMs, endMs, expectedDuration } of testCases) {
      const totalDurationMs = endMs + 1000;
      const sampleRate = 44100;
      const channels = 2;
      const bytesPerSample = 2;
      const samples = Math.ceil((totalDurationMs / 1000) * sampleRate);
      const headerSize = 44;
      const dataSize = samples * channels * bytesPerSample;
      
      const audioFile = new Blob([new ArrayBuffer(headerSize + dataSize)], { type: 'audio/wav' });
      
      const result = await trimAudio(audioFile, startMs, endMs);
      
      const tolerance = 100;
      const durationDiff = Math.abs(result.durationMs - expectedDuration);
      
      expect(durationDiff).toBeLessThanOrEqual(tolerance);
    }
  });
});

describe('validateTrimRange', () => {
  it('accepts valid trim ranges within constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: MIN_TRIM_DURATION_MS, max: MAX_TRIM_DURATION_MS }),
        (startMs, duration) => {
          const endMs = startMs + duration;
          const result = validateTrimRange(startMs, endMs);
          return result.valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects negative start times', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: -1 }),
        fc.integer({ min: 1000, max: 10000 }),
        (startMs, duration) => {
          const endMs = startMs + duration;
          const result = validateTrimRange(startMs, endMs);
          return result.valid === false && result.error?.includes('negative');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when end is before or equal to start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: -1000, max: 0 }),
        (startMs, offset) => {
          const endMs = startMs + offset;
          const result = validateTrimRange(startMs, endMs);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects durations less than minimum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 1, max: MIN_TRIM_DURATION_MS - 1 }),
        (startMs, duration) => {
          const endMs = startMs + duration;
          const result = validateTrimRange(startMs, endMs);
          return result.valid === false && result.error?.includes('at least');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects durations exceeding maximum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: MAX_TRIM_DURATION_MS + 1, max: MAX_TRIM_DURATION_MS + 10000 }),
        (startMs, duration) => {
          const endMs = startMs + duration;
          const result = validateTrimRange(startMs, endMs);
          return result.valid === false && result.error?.includes('exceed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validates against audio duration when provided', () => {
    // Start exceeds audio duration
    expect(validateTrimRange(5000, 6000, 4000).valid).toBe(false);
    
    // End exceeds audio duration
    expect(validateTrimRange(0, 5000, 4000).valid).toBe(false);
    
    // Valid range within audio duration
    expect(validateTrimRange(0, 3000, 4000).valid).toBe(true);
  });
});

describe('encodeWav', () => {
  it('produces valid WAV blob with correct MIME type', () => {
    const buffer = new MockAudioBuffer({
      numberOfChannels: 2,
      length: 44100, // 1 second at 44100Hz
      sampleRate: 44100,
    });

    const blob = encodeWav(buffer as unknown as AudioBuffer);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
  });

  it('produces WAV with correct header structure', async () => {
    const buffer = new MockAudioBuffer({
      numberOfChannels: 2,
      length: 44100,
      sampleRate: 44100,
    });

    const blob = encodeWav(buffer as unknown as AudioBuffer);
    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);
    
    // Check RIFF header
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    expect(riff).toBe('RIFF');
    
    // Check WAVE format
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    );
    expect(wave).toBe('WAVE');
    
    // Check fmt chunk
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15)
    );
    expect(fmt).toBe('fmt ');
    
    // Check data chunk
    const data = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39)
    );
    expect(data).toBe('data');
  });

  it('encodes correct number of channels', async () => {
    for (const numChannels of [1, 2]) {
      const buffer = new MockAudioBuffer({
        numberOfChannels: numChannels,
        length: 44100,
        sampleRate: 44100,
      });

      const blob = encodeWav(buffer as unknown as AudioBuffer);
      const arrayBuffer = await blob.arrayBuffer();
      const view = new DataView(arrayBuffer);
      
      // NumChannels is at offset 22
      expect(view.getUint16(22, true)).toBe(numChannels);
    }
  });

  it('encodes correct sample rate', async () => {
    for (const sampleRate of [22050, 44100, 48000]) {
      const buffer = new MockAudioBuffer({
        numberOfChannels: 2,
        length: sampleRate, // 1 second
        sampleRate,
      });

      const blob = encodeWav(buffer as unknown as AudioBuffer);
      const arrayBuffer = await blob.arrayBuffer();
      const view = new DataView(arrayBuffer);
      
      // SampleRate is at offset 24
      expect(view.getUint32(24, true)).toBe(sampleRate);
    }
  });

  it('supports different bit depths', async () => {
    const buffer = new MockAudioBuffer({
      numberOfChannels: 2,
      length: 44100,
      sampleRate: 44100,
    });

    for (const bitDepth of [16, 24, 32] as const) {
      const blob = encodeWav(buffer as unknown as AudioBuffer, bitDepth);
      const arrayBuffer = await blob.arrayBuffer();
      const view = new DataView(arrayBuffer);
      
      // BitsPerSample is at offset 34
      expect(view.getUint16(34, true)).toBe(bitDepth);
    }
  });

  it('produces correct file size', async () => {
    const numChannels = 2;
    const length = 44100;
    const sampleRate = 44100;
    const bitDepth = 16;
    
    const buffer = new MockAudioBuffer({
      numberOfChannels: numChannels,
      length,
      sampleRate,
    });

    const blob = encodeWav(buffer as unknown as AudioBuffer, bitDepth);
    
    const expectedDataSize = length * numChannels * (bitDepth / 8);
    const expectedFileSize = 44 + expectedDataSize; // 44 byte header + data
    
    expect(blob.size).toBe(expectedFileSize);
  });
});

describe('trimAudio error handling', () => {
  it('throws TrimError for empty audio file', async () => {
    const emptyBlob = new Blob([], { type: 'audio/wav' });
    
    await expect(trimAudio(emptyBlob, 0, 1000)).rejects.toThrow(TrimError);
    await expect(trimAudio(emptyBlob, 0, 1000)).rejects.toMatchObject({
      code: 'INVALID_AUDIO',
    });
  });

  it('throws TrimError for invalid trim range', async () => {
    const audioFile = new Blob([new ArrayBuffer(1000)], { type: 'audio/wav' });
    
    // End before start
    await expect(trimAudio(audioFile, 5000, 1000)).rejects.toThrow(TrimError);
    await expect(trimAudio(audioFile, 5000, 1000)).rejects.toMatchObject({
      code: 'INVALID_RANGE',
    });
    
    // Duration too long
    await expect(trimAudio(audioFile, 0, 15000)).rejects.toThrow(TrimError);
    await expect(trimAudio(audioFile, 0, 15000)).rejects.toMatchObject({
      code: 'INVALID_RANGE',
    });
  });

  it('throws TrimError for negative start time', async () => {
    const audioFile = new Blob([new ArrayBuffer(1000)], { type: 'audio/wav' });
    
    await expect(trimAudio(audioFile, -1000, 1000)).rejects.toThrow(TrimError);
    await expect(trimAudio(audioFile, -1000, 1000)).rejects.toMatchObject({
      code: 'INVALID_RANGE',
    });
  });
});

describe('TrimResult structure', () => {
  it('returns all required fields', async () => {
    const sampleRate = 44100;
    const channels = 2;
    const bytesPerSample = 2;
    const durationMs = 5000;
    const samples = Math.ceil((durationMs / 1000) * sampleRate);
    const headerSize = 44;
    const dataSize = samples * channels * bytesPerSample;
    
    const audioFile = new Blob([new ArrayBuffer(headerSize + dataSize)], { type: 'audio/wav' });
    
    const result = await trimAudio(audioFile, 0, 1000);
    
    expect(result).toHaveProperty('blob');
    expect(result).toHaveProperty('durationMs');
    expect(result).toHaveProperty('channels');
    expect(result).toHaveProperty('sampleRate');
    
    expect(result.blob).toBeInstanceOf(Blob);
    expect(typeof result.durationMs).toBe('number');
    expect(typeof result.channels).toBe('number');
    expect(typeof result.sampleRate).toBe('number');
  });

  it('blob has correct MIME type', async () => {
    const sampleRate = 44100;
    const channels = 2;
    const bytesPerSample = 2;
    const durationMs = 5000;
    const samples = Math.ceil((durationMs / 1000) * sampleRate);
    const headerSize = 44;
    const dataSize = samples * channels * bytesPerSample;
    
    const audioFile = new Blob([new ArrayBuffer(headerSize + dataSize)], { type: 'audio/wav' });
    
    const result = await trimAudio(audioFile, 0, 1000);
    
    expect(result.blob.type).toBe('audio/wav');
  });
});

describe('calculateTrimDuration', () => {
  it('returns correct duration for any valid range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 1, max: 100000 }),
        (startMs, duration) => {
          const endMs = startMs + duration;
          return calculateTrimDuration(startMs, endMs) === duration;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles edge cases', () => {
    expect(calculateTrimDuration(0, 0)).toBe(0);
    expect(calculateTrimDuration(0, 1)).toBe(1);
    expect(calculateTrimDuration(1000, 1001)).toBe(1);
    expect(calculateTrimDuration(0, 10000)).toBe(10000);
  });
});
