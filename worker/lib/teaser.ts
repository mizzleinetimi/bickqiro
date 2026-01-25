/**
 * Teaser Video Generator
 * 
 * Generates teaser MP4 videos with animated waveform overlay
 * on the brand background for social media embeds.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */

import path from 'path';
import { runFFmpeg, getAudioDuration } from './ffmpeg';

/**
 * Teaser video dimensions.
 */
const TEASER_WIDTH = 1280;
const TEASER_HEIGHT = 720;

/**
 * Default teaser duration in seconds.
 */
const DEFAULT_TEASER_DURATION = 5;

/**
 * Path to the brand background image.
 */
const BRAND_BACKGROUND = process.env.BRAND_BACKGROUND_PATH || 'public/brand-thumb.jpg';

/**
 * Get configured teaser duration.
 */
function getTeaserDuration(): number {
  const envDuration = process.env.TEASER_DURATION;
  if (envDuration) {
    const parsed = parseFloat(envDuration);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TEASER_DURATION;
}

/**
 * Generates a teaser MP4 video with animated waveform.
 * 
 * Uses FFmpeg's showwaves filter to create an animated waveform
 * visualization synced to the audio, overlaid on the brand background.
 * 
 * Output: H.264 video + AAC audio, 1280x720, 3-5 seconds
 * 
 * @param audioPath - Path to the audio file
 * @param outputDir - Directory to write the teaser video
 * @returns Path to the generated teaser.mp4 file
 */
export async function generateTeaser(
  audioPath: string,
  outputDir: string
): Promise<string> {
  const outputPath = path.join(outputDir, 'teaser.mp4');

  // Get actual audio duration to cap teaser length
  const audioDuration = await getAudioDuration(audioPath);
  const maxDuration = getTeaserDuration();
  const teaserDuration = Math.min(maxDuration, audioDuration);

  // Waveform dimensions (centered with padding)
  const waveWidth = TEASER_WIDTH - 100;
  const waveHeight = 200;
  const waveY = Math.floor((TEASER_HEIGHT - waveHeight) / 2);

  // Generate teaser video with animated waveform
  // 1. Loop background image for video duration
  // 2. Generate animated waveform from audio
  // 3. Overlay waveform on background
  // 4. Encode with H.264/AAC
  await runFFmpeg([
    '-loop', '1',
    '-i', `"${BRAND_BACKGROUND}"`,
    '-i', `"${audioPath}"`,
    '-filter_complex',
    `"[0:v]scale=${TEASER_WIDTH}:${TEASER_HEIGHT}:force_original_aspect_ratio=increase,crop=${TEASER_WIDTH}:${TEASER_HEIGHT},fps=30[bg];` +
    `[1:a]showwaves=s=${waveWidth}x${waveHeight}:mode=cline:colors=white@0.8:rate=30[wave];` +
    `[bg][wave]overlay=50:${waveY}:format=auto[v]"`,
    '-map', '"[v]"',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-t', String(teaserDuration),
    '-shortest',
    '-y',
    `"${outputPath}"`,
  ], 180000); // 3 minute timeout for video encoding

  console.log(`[Teaser] Generated ${teaserDuration.toFixed(1)}s video at ${outputPath}`);
  return outputPath;
}

/**
 * Gets the teaser video dimensions.
 * Exported for testing.
 */
export function getTeaserDimensions(): { width: number; height: number } {
  return { width: TEASER_WIDTH, height: TEASER_HEIGHT };
}

/**
 * Gets the configured teaser duration.
 * Exported for testing.
 */
export function getConfiguredTeaserDuration(): number {
  return getTeaserDuration();
}
