/**
 * Simple HTTP API for the worker
 * Provides URL extraction endpoint that Vercel can call
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

const PORT = process.env.PORT || 3001;

// R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

interface ExtractionRequest {
  url: string;
}

interface ExtractionResponse {
  success: boolean;
  audioUrl?: string;
  durationMs?: number;
  sourceTitle?: string;
  thumbnailUrl?: string;
  error?: string;
  code?: string;
}

async function extractAudio(url: string): Promise<ExtractionResponse> {
  const tempId = randomUUID();
  const outputTemplate = `/tmp/${tempId}`;
  const outputPath = `/tmp/${tempId}.mp3`;
  const infoPath = `/tmp/${tempId}.json`;

  try {
    // Get video info
    let title: string | undefined;
    let durationMs: number = 0;
    let thumbnailUrl: string | undefined;

    try {
      console.log(`[API] Fetching video info for: ${url}`);
      const { stdout, stderr } = await execAsync(`yt-dlp --dump-json "${url}"`, { timeout: 60000 });
      const infoJson = JSON.parse(stdout);
      title = infoJson.title;
      durationMs = Math.round((infoJson.duration || 0) * 1000);
      thumbnailUrl = infoJson.thumbnail;
      console.log(`[API] Video info: title="${title}", duration=${durationMs}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[API] Failed to get video info: ${errorMessage}`);
      if (errorMessage.includes('Video unavailable') || errorMessage.includes('Private video')) {
        return { success: false, error: 'Video is unavailable or private', code: 'VIDEO_UNAVAILABLE' };
      }
      return { success: false, error: 'Failed to fetch video information', code: 'EXTRACTION_FAILED' };
    }

    // Extract audio - use template without extension, yt-dlp adds it
    try {
      console.log(`[API] Extracting audio to: ${outputPath}`);
      const { stdout, stderr } = await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}.%(ext)s" "${url}"`,
        { timeout: 120000 }
      );
      console.log(`[API] yt-dlp stdout: ${stdout}`);
      if (stderr) console.log(`[API] yt-dlp stderr: ${stderr}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[API] Failed to extract audio: ${errorMessage}`);
      return { success: false, error: 'Failed to extract audio', code: 'EXTRACTION_FAILED' };
    }

    // Check if file exists
    let audioBuffer: Buffer;
    try {
      audioBuffer = await readFile(outputPath);
      console.log(`[API] Audio file size: ${audioBuffer.length} bytes`);
    } catch (error) {
      console.error(`[API] Audio file not found at ${outputPath}`);
      // Try to find any mp3 file with our tempId
      try {
        const { stdout } = await execAsync(`ls -la /tmp/${tempId}*`);
        console.log(`[API] Files in /tmp: ${stdout}`);
      } catch {}
      return { success: false, error: 'Audio file not created', code: 'EXTRACTION_FAILED' };
    }

    // Upload to R2
    const storageKey = `extracted/${tempId}.mp3`;
    console.log(`[API] Uploading to R2: ${storageKey}`);
    
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: storageKey,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    }));

    const cdnUrl = `${process.env.NEXT_PUBLIC_CDN_URL}/${storageKey}`;
    console.log(`[API] Upload complete: ${cdnUrl}`);

    // Cleanup
    await unlink(outputPath).catch(() => {});
    await unlink(infoPath).catch(() => {});

    return {
      success: true,
      audioUrl: cdnUrl,
      durationMs,
      sourceTitle: title,
      thumbnailUrl,
    };
  } catch (error) {
    // Cleanup on error
    await unlink(outputPath).catch(() => {});
    await unlink(infoPath).catch(() => {});
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] Extraction error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      code: 'EXTRACTION_FAILED',
    };
  }
}

function parseBody(req: IncomingMessage): Promise<ExtractionRequest> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/extract') {
    try {
      const body = await parseBody(req);
      
      if (!body.url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'URL is required', code: 'INVALID_URL' }));
        return;
      }

      console.log(`[API] Extracting audio from: ${body.url}`);
      const result = await extractAudio(body.url);
      
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Server error', code: 'EXTRACTION_FAILED' }));
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

export function startApiServer() {
  server.listen(PORT, () => {
    console.log(`[API] Extraction API listening on port ${PORT}`);
  });
}
