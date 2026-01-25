/**
 * Waveform Generator
 * 
 * Generates waveform JSON data from audio files for client-side visualization.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */

import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { runFFmpeg, getAudioDuration } from './ffmpeg';
import type { WaveformData } from '../types';

/**
 * Target samples per second for waveform visualization.
 * 100 samples/second provides smooth visualization.
 */
const SAMPLES_PER_SECOND = 100;

/**
 * Generates waveform JSON data from an audio file.
 * 
 * Uses FFmpeg to extract PCM data, then processes it into
 * normalized peak values suitable for client-side rendering.
 * 
 * @param audioPath - Path to the audio file
 * @param outputDir - Directory to write the waveform JSON
 * @returns Path to the generated waveform.json file
 */
export async function generateWaveformJson(
  audioPath: string,
  outputDir: string
): Promise<string> {
  const duration = await getAudioDuration(audioPath);
  const totalSamples = Math.ceil(duration * SAMPLES_PER_SECOND);
  
  const pcmPath = path.join(outputDir, 'waveform.pcm');
  const outputPath = path.join(outputDir, 'waveform.json');

  try {
    // Extract audio as raw PCM (mono, 16-bit signed, downsampled)
    // We use a higher sample rate for extraction, then downsample in code
    const extractionRate = Math.max(SAMPLES_PER_SECOND * 10, 1000);
    
    await runFFmpeg([
      '-i', `"${audioPath}"`,
      '-ac', '1',                          // Mono
      '-ar', String(extractionRate),       // Sample rate
      '-f', 's16le',                        // 16-bit signed little-endian
      '-acodec', 'pcm_s16le',
      '-y',
      `"${pcmPath}"`,
    ]);

    // Read PCM data and convert to normalized peaks
    const pcmBuffer = await readFile(pcmPath);
    const peaks = extractPeaks(pcmBuffer, totalSamples);

    const waveformData: WaveformData = {
      version: 1,
      sampleRate: extractionRate,
      samplesPerSecond: SAMPLES_PER_SECOND,
      duration,
      peaks,
    };

    await writeFile(outputPath, JSON.stringify(waveformData));
    console.log(`[Waveform] Generated ${peaks.length} peaks for ${duration.toFixed(2)}s audio`);

    return outputPath;
  } finally {
    // Cleanup PCM file
    await unlink(pcmPath).catch(() => {});
  }
}

/**
 * Extracts normalized peak values from PCM buffer.
 * PCM format: 16-bit signed little-endian mono.
 * 
 * @param pcmBuffer - Raw PCM audio data
 * @param targetSamples - Number of peak samples to generate
 * @returns Array of normalized peak values (0.0 to 1.0)
 */
export function extractPeaks(pcmBuffer: Buffer, targetSamples: number): number[] {
  const samples = pcmBuffer.length / 2; // 2 bytes per sample
  
  if (samples === 0) {
    return [];
  }

  const samplesPerPeak = Math.max(1, Math.floor(samples / targetSamples));
  const peaks: number[] = [];

  for (let i = 0; i < samples; i += samplesPerPeak) {
    let maxAbs = 0;
    const end = Math.min(i + samplesPerPeak, samples);

    for (let j = i; j < end; j++) {
      const offset = j * 2;
      if (offset + 1 < pcmBuffer.length) {
        const sample = pcmBuffer.readInt16LE(offset);
        const abs = Math.abs(sample);
        if (abs > maxAbs) maxAbs = abs;
      }
    }

    // Normalize to 0.0 - 1.0
    // 32768 is the max value for 16-bit signed audio
    const normalized = Math.min(1.0, maxAbs / 32768);
    peaks.push(normalized);
  }

  return peaks;
}
