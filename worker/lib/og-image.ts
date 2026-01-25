/**
 * OG Image Generator
 * 
 * Generates Open Graph images (1200x630) with waveform overlay
 * on the brand background for social sharing.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import path from 'path';
import { runFFmpeg } from './ffmpeg';

/**
 * OG image dimensions (standard Open Graph size).
 */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Path to the brand background image.
 */
const BRAND_BACKGROUND = process.env.BRAND_BACKGROUND_PATH || 'public/brand-thumb.jpg';

/**
 * Generates an OG image (1200x630) with waveform overlay.
 * 
 * Uses FFmpeg's showwavespic filter to generate a waveform image,
 * then overlays it on the brand background.
 * 
 * @param audioPath - Path to the audio file
 * @param outputDir - Directory to write the OG image
 * @returns Path to the generated og.png file
 */
export async function generateOgImage(
  audioPath: string,
  outputDir: string
): Promise<string> {
  const outputPath = path.join(outputDir, 'og.png');

  // Waveform dimensions (centered with padding)
  const waveWidth = OG_WIDTH - 100;  // 50px padding each side
  const waveHeight = 200;
  const waveY = Math.floor((OG_HEIGHT - waveHeight) / 2);

  // Generate OG image with waveform overlay on brand background
  // 1. Scale background to OG dimensions
  // 2. Generate waveform image from audio
  // 3. Overlay waveform on background (centered)
  await runFFmpeg([
    '-i', `"${BRAND_BACKGROUND}"`,
    '-i', `"${audioPath}"`,
    '-filter_complex',
    `"[0:v]scale=${OG_WIDTH}:${OG_HEIGHT}:force_original_aspect_ratio=increase,crop=${OG_WIDTH}:${OG_HEIGHT}[bg];` +
    `[1:a]showwavespic=s=${waveWidth}x${waveHeight}:colors=white@0.8:filter=peak[wave];` +
    `[bg][wave]overlay=50:${waveY}:format=auto"`,
    '-frames:v', '1',
    '-y',
    `"${outputPath}"`,
  ]);

  console.log(`[OG Image] Generated ${OG_WIDTH}x${OG_HEIGHT} image at ${outputPath}`);
  return outputPath;
}

/**
 * Gets the OG image dimensions.
 * Exported for testing.
 */
export function getOgDimensions(): { width: number; height: number } {
  return { width: OG_WIDTH, height: OG_HEIGHT };
}
