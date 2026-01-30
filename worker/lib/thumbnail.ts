/**
 * Thumbnail Generator
 * 
 * Extracts thumbnails from video source URLs using yt-dlp.
 * Falls back to generating a thumbnail from the OG image if extraction fails.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, access } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Extracts thumbnail from a video URL using yt-dlp.
 * 
 * @param sourceUrl - The source video URL (TikTok, YouTube, etc.)
 * @param outputDir - Directory to save the thumbnail
 * @returns Path to the downloaded thumbnail, or null if extraction fails
 */
export async function extractThumbnailFromUrl(
  sourceUrl: string,
  outputDir: string
): Promise<string | null> {
  try {
    await mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'thumbnail.jpg');
    
    // Use yt-dlp to download just the thumbnail
    // --write-thumbnail downloads the thumbnail
    // --skip-download skips the actual video download
    // --convert-thumbnails jpg converts to jpg format
    await execAsync(
      `yt-dlp --write-thumbnail --skip-download --convert-thumbnails jpg -o "${path.join(outputDir, 'thumbnail')}" "${sourceUrl}"`,
      { timeout: 30000 }
    );
    
    // yt-dlp may add various extensions, check for common ones
    const possiblePaths = [
      path.join(outputDir, 'thumbnail.jpg'),
      path.join(outputDir, 'thumbnail.webp'),
      path.join(outputDir, 'thumbnail.png'),
    ];
    
    for (const p of possiblePaths) {
      try {
        await access(p);
        // If it's not jpg, convert it
        if (p !== outputPath && p.endsWith('.webp') || p.endsWith('.png')) {
          await execAsync(`ffmpeg -y -i "${p}" "${outputPath}"`, { timeout: 10000 });
          return outputPath;
        }
        return p;
      } catch {
        // File doesn't exist, try next
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`[Thumbnail] Failed to extract thumbnail from URL: ${error}`);
    return null;
  }
}

/**
 * Creates a square thumbnail from an image.
 * For images that are already square-ish or from video sources, crops center.
 * For brand/logo images (OG images), scales to fit with padding.
 * 
 * @param inputPath - Path to the input image
 * @param outputDir - Directory to save the thumbnail
 * @param size - Size of the square thumbnail (default: 400)
 * @param scaleToFit - If true, scales to fit with padding instead of cropping
 * @returns Path to the square thumbnail
 */
export async function createSquareThumbnail(
  inputPath: string,
  outputDir: string,
  size: number = 400,
  scaleToFit: boolean = false
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, 'thumb_square.jpg');
  
  if (scaleToFit) {
    // Scale to fit within square, pad with dark background to fill
    // This preserves the entire image without cropping
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -vf "scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=#1a1a1a" -q:v 2 "${outputPath}"`,
      { timeout: 15000 }
    );
  } else {
    // Use ffmpeg to create a square center-cropped thumbnail
    // crop=min(iw,ih):min(iw,ih) crops to square from center
    // scale=size:size resizes to target size
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=${size}:${size}" -q:v 2 "${outputPath}"`,
      { timeout: 15000 }
    );
  }
  
  return outputPath;
}

/**
 * Downloads an image from a URL.
 * 
 * @param imageUrl - The URL of the image to download
 * @param outputDir - Directory to save the image
 * @returns Path to the downloaded image, or null if download fails
 */
export async function downloadThumbnailFromUrl(
  imageUrl: string,
  outputDir: string
): Promise<string | null> {
  try {
    await mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'source_thumb.jpg');
    
    // Use curl to download the image
    await execAsync(
      `curl -L -o "${outputPath}" "${imageUrl}"`,
      { timeout: 15000 }
    );
    
    // Verify the file exists
    await access(outputPath);
    return outputPath;
  } catch (error) {
    console.warn(`[Thumbnail] Failed to download thumbnail from URL: ${error}`);
    return null;
  }
}

/**
 * Generates a thumbnail for a bick.
 * 
 * Priority:
 * 1. Direct thumbnail URL (from yt-dlp extraction)
 * 2. Extract from source video URL using yt-dlp
 * 3. Fall back to OG image
 * 
 * @param thumbnailUrl - Direct thumbnail URL (from extraction)
 * @param sourceUrl - Optional source video URL
 * @param ogImagePath - Path to the OG image (fallback)
 * @param outputDir - Directory to save the thumbnail
 * @returns Path to the final thumbnail
 */
export async function generateThumbnail(
  thumbnailUrl: string | null,
  sourceUrl: string | null,
  ogImagePath: string,
  outputDir: string
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  
  let thumbnailSource: string | null = null;
  let isOgImageFallback = false;
  
  // 1. Try to download from direct thumbnail URL
  if (thumbnailUrl) {
    console.log(`[Thumbnail] Downloading thumbnail from provided URL`);
    thumbnailSource = await downloadThumbnailFromUrl(thumbnailUrl, outputDir);
  }
  
  // 2. Try to extract thumbnail from source URL
  if (!thumbnailSource && sourceUrl) {
    console.log(`[Thumbnail] Attempting to extract thumbnail from source URL`);
    thumbnailSource = await extractThumbnailFromUrl(sourceUrl, outputDir);
  }
  
  // 3. Fall back to OG image
  if (!thumbnailSource) {
    console.log(`[Thumbnail] Using OG image as thumbnail source`);
    thumbnailSource = ogImagePath;
    isOgImageFallback = true;
  }
  
  // Create square thumbnail
  // Use scaleToFit for OG image fallback to preserve the entire logo/branding
  const squarePath = await createSquareThumbnail(thumbnailSource, outputDir, 400, isOgImageFallback);
  
  return squarePath;
}
