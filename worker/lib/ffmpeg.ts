/**
 * FFmpeg Utility Module
 * 
 * Provides functions for executing FFmpeg commands with timeout handling
 * and error capture.
 * 
 * **Validates: Requirements 1.2, 7.1**
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { FFmpegResult } from '../types';

const execAsync = promisify(exec);

/**
 * Default timeout for FFmpeg commands (2 minutes).
 */
const DEFAULT_TIMEOUT_MS = 120000;

/**
 * Maximum buffer size for FFmpeg output (50MB).
 */
const MAX_BUFFER_SIZE = 50 * 1024 * 1024;

/**
 * Executes an FFmpeg command with timeout and error handling.
 * 
 * @param args - Array of FFmpeg arguments (without 'ffmpeg' prefix)
 * @param timeoutMs - Timeout in milliseconds (default: 2 minutes)
 * @returns FFmpeg execution result with stdout and stderr
 * @throws Error if FFmpeg command fails or times out
 */
export async function runFFmpeg(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FFmpegResult> {
  const command = `ffmpeg ${args.join(' ')}`;
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER_SIZE,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { 
      stderr?: string; 
      stdout?: string;
      message?: string;
      code?: number;
    };
    
    const stderr = execError.stderr || execError.message || 'Unknown FFmpeg error';
    const stdout = execError.stdout || '';
    
    console.error(`[FFmpeg] Command failed: ${command}`);
    console.error(`[FFmpeg] stderr: ${stderr}`);
    
    throw new Error(`FFmpeg failed: ${stderr}`);
  }
}

/**
 * Gets audio duration in seconds using ffprobe.
 * 
 * @param audioPath - Path to the audio file
 * @returns Duration in seconds
 * @throws Error if ffprobe fails
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { timeout: 30000 }
    );
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error('Invalid duration value');
    }
    return duration;
  } catch (error) {
    console.error(`[FFmpeg] Failed to get duration for ${audioPath}:`, error);
    throw new Error(`Failed to get audio duration: ${error}`);
  }
}

/**
 * Validates that a file is a valid audio file that can be processed.
 * 
 * @param audioPath - Path to the file to validate
 * @returns true if the file is a valid audio file, false otherwise
 */
export async function validateAudio(audioPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { timeout: 30000 }
    );
    return stdout.trim() === 'audio';
  } catch {
    return false;
  }
}

/**
 * Gets audio codec information using ffprobe.
 * 
 * @param audioPath - Path to the audio file
 * @returns Codec name (e.g., 'mp3', 'aac', 'pcm_s16le')
 */
export async function getAudioCodec(audioPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { timeout: 30000 }
    );
    return stdout.trim();
  } catch (error) {
    console.error(`[FFmpeg] Failed to get codec for ${audioPath}:`, error);
    throw new Error(`Failed to get audio codec: ${error}`);
  }
}
