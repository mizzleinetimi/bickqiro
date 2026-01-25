/**
 * Integration Tests for FFmpeg Worker
 * 
 * Tests the full processing pipeline with real audio files.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 6.1, 6.3**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm, copyFile, access, readFile } from 'fs/promises';
import path from 'path';
import { validateAudio, getAudioDuration } from '../../worker/lib/ffmpeg';
import { generateWaveformJson } from '../../worker/lib/waveform';
import { generateOgImage } from '../../worker/lib/og-image';
import { generateTeaser } from '../../worker/lib/teaser';
import { cleanupTempFiles } from '../../worker/lib/downloader';
import type { WaveformData } from '../../worker/types';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');
const TEST_DIR = '/tmp/integration-tests';

describe('FFmpeg Worker Integration', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Full Processing Pipeline', () => {
    it('should process valid audio through entire pipeline', async () => {
      const workDir = path.join(TEST_DIR, 'full-pipeline');
      await mkdir(workDir, { recursive: true });
      
      // Copy fixture to work directory
      const audioPath = path.join(workDir, 'audio.mp3');
      await copyFile(path.join(FIXTURES_DIR, 'valid-audio.mp3'), audioPath);
      
      // 1. Validate audio
      const isValid = await validateAudio(audioPath);
      expect(isValid).toBe(true);
      
      // 2. Get duration
      const duration = await getAudioDuration(audioPath);
      expect(duration).toBeCloseTo(3, 0); // 3 seconds
      
      // 3. Generate waveform
      const waveformPath = await generateWaveformJson(audioPath, workDir);
      await expect(access(waveformPath)).resolves.toBeUndefined();
      
      // Verify waveform content
      const waveformContent = await readFile(waveformPath, 'utf-8');
      const waveform: WaveformData = JSON.parse(waveformContent);
      expect(waveform.version).toBe(1);
      expect(waveform.duration).toBeCloseTo(3, 0);
      expect(waveform.peaks.length).toBeGreaterThan(0);
      expect(waveform.peaks.every(p => p >= 0 && p <= 1)).toBe(true);
      
      // 4. Generate OG image
      const ogPath = await generateOgImage(audioPath, workDir);
      await expect(access(ogPath)).resolves.toBeUndefined();
      
      // 5. Generate teaser
      const teaserPath = await generateTeaser(audioPath, workDir);
      await expect(access(teaserPath)).resolves.toBeUndefined();
      
      // Cleanup
      await cleanupTempFiles(workDir);
      await expect(access(workDir)).rejects.toThrow();
    }, 30000); // 30 second timeout for full pipeline

    it('should reject invalid audio files', async () => {
      const invalidPath = path.join(FIXTURES_DIR, 'invalid-audio.txt');
      
      const isValid = await validateAudio(invalidPath);
      expect(isValid).toBe(false);
    });

    it('should handle non-existent files gracefully', async () => {
      const nonExistentPath = '/tmp/non-existent-audio.mp3';
      
      const isValid = await validateAudio(nonExistentPath);
      expect(isValid).toBe(false);
    });
  });

  describe('Cleanup Behavior', () => {
    it('should clean up temp files after processing', async () => {
      const workDir = path.join(TEST_DIR, 'cleanup-test');
      await mkdir(workDir, { recursive: true });
      
      // Create some temp files
      const audioPath = path.join(workDir, 'audio.mp3');
      await copyFile(path.join(FIXTURES_DIR, 'valid-audio.mp3'), audioPath);
      
      // Verify directory exists
      await expect(access(workDir)).resolves.toBeUndefined();
      
      // Cleanup
      await cleanupTempFiles(workDir);
      
      // Verify directory is removed
      await expect(access(workDir)).rejects.toThrow();
    });

    it('should handle cleanup of non-existent directories', async () => {
      const nonExistentDir = path.join(TEST_DIR, 'non-existent-cleanup');
      
      // Should not throw
      await expect(cleanupTempFiles(nonExistentDir)).resolves.toBeUndefined();
    });
  });
});
