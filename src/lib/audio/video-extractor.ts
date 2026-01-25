/**
 * Client-side video-to-audio extraction utility
 * 
 * Extracts audio from video files using the Web Audio API and HTML5 video element.
 * 
 * @module audio/video-extractor
 */

import { encodeWav } from './trimmer';

/**
 * Error codes for video extraction operations
 */
export type VideoExtractErrorCode =
  | 'INVALID_VIDEO'
  | 'LOAD_FAILED'
  | 'DECODE_FAILED'
  | 'EXTRACT_FAILED'
  | 'NO_AUDIO';

/**
 * Custom error class for video extraction operations
 */
export class VideoExtractError extends Error {
  constructor(
    public readonly code: VideoExtractErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'VideoExtractError';
  }
}

/**
 * Result of the extractAudioFromVideo function
 */
export interface VideoExtractResult {
  /** The extracted audio as a WAV Blob */
  blob: Blob;
  /** Duration of the audio in milliseconds */
  durationMs: number;
  /** Number of audio channels */
  channels: number;
  /** Sample rate of the output audio */
  sampleRate: number;
}

/**
 * Extracts audio from a video file and returns it as a WAV blob
 * 
 * Uses the Web Audio API to decode the video file and extract its audio track.
 * The result is encoded as a WAV file for consistent handling downstream.
 * 
 * @param videoFile - The video file to extract audio from
 * @returns Promise resolving to the extracted audio result
 * @throws VideoExtractError if extraction fails
 */
export async function extractAudioFromVideo(
  videoFile: File | Blob
): Promise<VideoExtractResult> {
  if (!videoFile || videoFile.size === 0) {
    throw new VideoExtractError('INVALID_VIDEO', 'Video file is empty or invalid');
  }

  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    let audioBuffer: AudioBuffer;

    try {
      // Web Audio API can decode audio from video containers
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      throw new VideoExtractError(
        'DECODE_FAILED',
        `Failed to decode audio from video: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`
      );
    }

    if (audioBuffer.length === 0) {
      throw new VideoExtractError('NO_AUDIO', 'Video file contains no audio track');
    }

    // Encode the audio buffer as WAV
    const wavBlob = encodeWav(audioBuffer, 16);
    const durationMs = audioBuffer.duration * 1000;

    return {
      blob: wavBlob,
      durationMs,
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Checks if a file is a video file based on its MIME type
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Gets the duration of a video file in milliseconds using HTML5 video element
 * 
 * This is a fallback method if Web Audio API fails to decode the video.
 * 
 * @param videoFile - The video file to get duration from
 * @returns Promise resolving to the duration in milliseconds
 */
export async function getVideoDuration(videoFile: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration * 1000);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new VideoExtractError('LOAD_FAILED', 'Failed to load video file'));
    };

    video.src = url;
  });
}
