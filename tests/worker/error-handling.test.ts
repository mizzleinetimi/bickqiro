import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm, writeFile, access } from 'fs/promises';
import path from 'path';
import { cleanupTempFiles } from '../../worker/lib/downloader';
import { ProcessingError, ProcessingErrorType } from '../../worker/types';

const TEST_DIR = '/tmp/error-handling-tests';

describe('Error Handling', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('ProcessingError', () => {
    it('should create error with correct type', () => {
      const error = new ProcessingError(
        ProcessingErrorType.DOWNLOAD_FAILED,
        'Download failed'
      );
      expect(error.type).toBe(ProcessingErrorType.DOWNLOAD_FAILED);
      expect(error.message).toBe('Download failed');
    });

    it('should include bickId and step when provided', () => {
      const error = new ProcessingError(
        ProcessingErrorType.FFMPEG_FAILED,
        'FFmpeg error',
        'bick-123',
        'generateWaveform'
      );
      expect(error.bickId).toBe('bick-123');
      expect(error.step).toBe('generateWaveform');
    });
  });
});

describe('Property 10: Failure Status Handling', () => {
  it('should have all required error types defined', () => {
    expect(ProcessingErrorType.DOWNLOAD_FAILED).toBe('DOWNLOAD_FAILED');
    expect(ProcessingErrorType.INVALID_AUDIO).toBe('INVALID_AUDIO');
    expect(ProcessingErrorType.FFMPEG_FAILED).toBe('FFMPEG_FAILED');
    expect(ProcessingErrorType.UPLOAD_FAILED).toBe('UPLOAD_FAILED');
    expect(ProcessingErrorType.DATABASE_ERROR).toBe('DATABASE_ERROR');
  });
});

describe('Property 13: Temp File Cleanup', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should remove temp directory after cleanup', async () => {
    const tempDir = path.join(TEST_DIR, 'cleanup-test');
    await mkdir(tempDir, { recursive: true });
    await writeFile(path.join(tempDir, 'test.txt'), 'test content');
    await expect(access(tempDir)).resolves.toBeUndefined();
    await cleanupTempFiles(tempDir);
    await expect(access(tempDir)).rejects.toThrow();
  });

  it('should handle non-existent directories gracefully', async () => {
    const nonExistentDir = path.join(TEST_DIR, 'non-existent-dir');
    await expect(cleanupTempFiles(nonExistentDir)).resolves.toBeUndefined();
  });
});
