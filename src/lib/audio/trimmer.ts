/**
 * Client-side audio trimming utility
 * 
 * This module provides functionality to trim audio files using the Web Audio API
 * and encode the result as WAV format.
 * 
 * @module audio/trimmer
 * 
 * **Validates: Requirements 3.5**
 */

/**
 * Maximum allowed duration for trimmed audio in milliseconds (10 seconds)
 */
export const MAX_TRIM_DURATION_MS = 10000;

/**
 * Minimum allowed duration for trimmed audio in milliseconds (100ms)
 */
export const MIN_TRIM_DURATION_MS = 100;

/**
 * Error codes for audio trimming operations
 */
export type TrimErrorCode =
  | 'INVALID_AUDIO'
  | 'INVALID_RANGE'
  | 'DECODE_FAILED'
  | 'TRIM_FAILED'
  | 'ENCODE_FAILED';

/**
 * Custom error class for audio trimming operations
 */
export class TrimError extends Error {
  constructor(
    public readonly code: TrimErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TrimError';
  }
}

/**
 * Options for the trimAudio function
 */
export interface TrimOptions {
  /** Sample rate for the output audio (default: source sample rate) */
  sampleRate?: number;
  /** Bit depth for WAV encoding (default: 16) */
  bitDepth?: 16 | 24 | 32;
}

/**
 * Result of the trimAudio function
 */
export interface TrimResult {
  /** The trimmed audio as a WAV Blob */
  blob: Blob;
  /** Duration of the trimmed audio in milliseconds */
  durationMs: number;
  /** Number of audio channels */
  channels: number;
  /** Sample rate of the output audio */
  sampleRate: number;
}

/**
 * Validates trim range parameters
 */
export function validateTrimRange(
  startMs: number,
  endMs: number,
  audioDurationMs?: number
): { valid: boolean; error?: string } {
  if (startMs < 0) {
    return { valid: false, error: 'Start time cannot be negative' };
  }
  
  if (endMs < 0) {
    return { valid: false, error: 'End time cannot be negative' };
  }
  
  if (endMs <= startMs) {
    return { valid: false, error: 'End time must be greater than start time' };
  }
  
  const duration = endMs - startMs;
  
  if (duration < MIN_TRIM_DURATION_MS) {
    return { valid: false, error: `Trim duration must be at least ${MIN_TRIM_DURATION_MS}ms` };
  }
  
  if (duration > MAX_TRIM_DURATION_MS) {
    return { valid: false, error: `Trim duration cannot exceed ${MAX_TRIM_DURATION_MS}ms (10 seconds)` };
  }
  
  if (audioDurationMs !== undefined) {
    if (startMs >= audioDurationMs) {
      return { valid: false, error: 'Start time exceeds audio duration' };
    }
    if (endMs > audioDurationMs) {
      return { valid: false, error: 'End time exceeds audio duration' };
    }
  }
  
  return { valid: true };
}

/**
 * Calculates the expected duration of trimmed audio in milliseconds
 */
export function calculateTrimDuration(startMs: number, endMs: number): number {
  return endMs - startMs;
}


/**
 * Trims an audio file to the specified time range and returns a WAV blob
 */
export async function trimAudio(
  audioFile: File | Blob,
  startMs: number,
  endMs: number,
  options: TrimOptions = {}
): Promise<TrimResult> {
  if (!audioFile || audioFile.size === 0) {
    throw new TrimError('INVALID_AUDIO', 'Audio file is empty or invalid');
  }
  
  const rangeValidation = validateTrimRange(startMs, endMs);
  if (!rangeValidation.valid) {
    throw new TrimError('INVALID_RANGE', rangeValidation.error!);
  }
  
  const audioContext = new AudioContext();
  
  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    let audioBuffer: AudioBuffer;
    
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      throw new TrimError(
        'DECODE_FAILED',
        `Failed to decode audio: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`
      );
    }
    
    const audioDurationMs = audioBuffer.duration * 1000;
    const fullRangeValidation = validateTrimRange(startMs, endMs, audioDurationMs);
    if (!fullRangeValidation.valid) {
      throw new TrimError('INVALID_RANGE', fullRangeValidation.error!);
    }
    
    const startSample = Math.floor((startMs / 1000) * audioBuffer.sampleRate);
    const endSample = Math.floor((endMs / 1000) * audioBuffer.sampleRate);
    const length = endSample - startSample;
    
    if (length <= 0) {
      throw new TrimError('TRIM_FAILED', 'Calculated trim length is zero or negative');
    }
    
    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const targetData = trimmedBuffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const sourceIndex = startSample + i;
        if (sourceIndex < sourceData.length) {
          targetData[i] = sourceData[sourceIndex];
        }
      }
    }
    
    const bitDepth = options.bitDepth || 16;
    const wavBlob = encodeWav(trimmedBuffer, bitDepth);
    const actualDurationMs = (trimmedBuffer.length / trimmedBuffer.sampleRate) * 1000;
    
    return {
      blob: wavBlob,
      durationMs: actualDurationMs,
      channels: trimmedBuffer.numberOfChannels,
      sampleRate: trimmedBuffer.sampleRate,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Encodes an AudioBuffer to WAV format
 */
export function encodeWav(audioBuffer: AudioBuffer, bitDepth: 16 | 24 | 32 = 16): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  const offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const clampedSample = Math.max(-1, Math.min(1, sample));
      const intSample = Math.round(clampedSample * 0x7FFF);
      view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), intSample, true);
    }
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Gets the duration of an audio file in milliseconds
 */
export async function getAudioDuration(audioFile: File | Blob): Promise<number> {
  if (!audioFile || audioFile.size === 0) {
    throw new TrimError('INVALID_AUDIO', 'Audio file is empty or invalid');
  }
  
  const audioContext = new AudioContext();
  
  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration * 1000;
  } catch (error) {
    throw new TrimError(
      'DECODE_FAILED',
      `Failed to decode audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    await audioContext.close();
  }
}
