# Requirements Document

## Introduction

This document defines the requirements for the FFmpeg Worker feature in Bickqr. The FFmpeg Worker is responsible for processing uploaded audio files to generate rich media assets: waveform JSON data for client-side visualization, OG images for social sharing, and teaser MP4 videos for social media embeds. The worker runs as a separate process using BullMQ for job processing and FFmpeg for media generation.

## Glossary

- **FFmpeg_Worker**: The background processing service that generates media assets from uploaded audio files
- **Waveform_JSON**: A JSON data structure containing amplitude samples for rendering seekable waveform visualizations
- **OG_Image**: A 1200x630px PNG image optimized for Open Graph social sharing previews
- **Teaser_MP4**: A 3-5 second H.264/AAC video with animated waveform overlay for social media embeds
- **Brand_Background**: The static background image (`public/brand-thumb.jpg`) used as the base for OG images and teaser videos
- **Asset_Record**: A database entry in the `bick_assets` table linking generated assets to their parent bick
- **Processing_Job**: A BullMQ job containing bick ID and storage key for async processing

## Requirements

### Requirement 1: Audio Download and Validation

**User Story:** As a system, I want to download and validate uploaded audio files, so that I can process them into derived assets.

#### Acceptance Criteria

1. WHEN a processing job is received, THE FFmpeg_Worker SHALL download the original audio file from R2 using the storage key
2. WHEN the audio file is downloaded, THE FFmpeg_Worker SHALL validate that the file is a valid audio format (MP3, WAV, OGG, M4A)
3. IF the audio file cannot be downloaded, THEN THE FFmpeg_Worker SHALL mark the bick status as 'failed' and log the error
4. IF the audio file is invalid or corrupted, THEN THE FFmpeg_Worker SHALL mark the bick status as 'failed' and log the error

### Requirement 2: Waveform JSON Generation

**User Story:** As a developer, I want waveform data extracted from audio files, so that the client can render seekable waveform visualizations.

#### Acceptance Criteria

1. WHEN processing an audio file, THE FFmpeg_Worker SHALL extract waveform amplitude data using FFmpeg
2. THE FFmpeg_Worker SHALL generate waveform data with sufficient resolution for smooth visualization (minimum 100 samples per second of audio)
3. THE FFmpeg_Worker SHALL output waveform data as a JSON array of normalized amplitude values (0.0 to 1.0)
4. WHEN waveform generation succeeds, THE FFmpeg_Worker SHALL upload the JSON file to R2 with key pattern `uploads/{bickId}/waveform.json`
5. WHEN waveform generation succeeds, THE FFmpeg_Worker SHALL create a bick_asset record with asset_type 'waveform_json'

### Requirement 3: OG Image Generation

**User Story:** As a user, I want my bicks to have attractive preview images, so that they look good when shared on social media.

#### Acceptance Criteria

1. WHEN processing an audio file, THE FFmpeg_Worker SHALL generate an OG image of exactly 1200x630 pixels
2. THE FFmpeg_Worker SHALL use the Brand_Background image as the base layer for OG images
3. THE FFmpeg_Worker SHALL overlay a waveform visualization on the Brand_Background
4. THE FFmpeg_Worker SHALL output the OG image as a PNG file
5. WHEN OG image generation succeeds, THE FFmpeg_Worker SHALL upload the image to R2 with key pattern `uploads/{bickId}/og.png`
6. WHEN OG image generation succeeds, THE FFmpeg_Worker SHALL create a bick_asset record with asset_type 'og_image'

### Requirement 4: Teaser MP4 Generation

**User Story:** As a user, I want video previews of my bicks, so that they can autoplay in social media feeds.

#### Acceptance Criteria

1. WHEN processing an audio file, THE FFmpeg_Worker SHALL generate a teaser video using the first 3-5 seconds of audio
2. THE FFmpeg_Worker SHALL use the Brand_Background image as the static video background
3. THE FFmpeg_Worker SHALL overlay an animated waveform visualization that syncs with the audio
4. THE FFmpeg_Worker SHALL encode the video as H.264 with AAC audio at 1280x720 resolution
5. WHEN teaser generation succeeds, THE FFmpeg_Worker SHALL upload the video to R2 with key pattern `uploads/{bickId}/teaser.mp4`
6. WHEN teaser generation succeeds, THE FFmpeg_Worker SHALL create a bick_asset record with asset_type 'teaser_mp4'

### Requirement 5: Asset Storage and CDN URLs

**User Story:** As a system, I want generated assets stored in R2 with CDN URLs, so that they can be served globally with low latency.

#### Acceptance Criteria

1. THE FFmpeg_Worker SHALL upload all generated assets to the configured R2 bucket
2. THE FFmpeg_Worker SHALL store the CDN URL for each asset in the bick_asset record
3. THE FFmpeg_Worker SHALL store the R2 storage key for each asset in the bick_asset record
4. THE FFmpeg_Worker SHALL store the file size in bytes for each asset in the bick_asset record
5. THE FFmpeg_Worker SHALL store the MIME type for each asset in the bick_asset record

### Requirement 6: Bick Status Management

**User Story:** As a system, I want bick status to reflect processing state, so that users know when their bicks are ready.

#### Acceptance Criteria

1. WHEN all assets are successfully generated and uploaded, THE FFmpeg_Worker SHALL update the bick status to 'live'
2. WHEN the bick status is updated to 'live', THE FFmpeg_Worker SHALL set the published_at timestamp
3. IF any asset generation fails, THEN THE FFmpeg_Worker SHALL update the bick status to 'failed'
4. THE FFmpeg_Worker SHALL NOT mark a bick as 'live' until all required assets (waveform, og_image, teaser) are created

### Requirement 7: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can debug processing failures.

#### Acceptance Criteria

1. WHEN an FFmpeg command fails, THE FFmpeg_Worker SHALL capture and log the stderr output
2. WHEN a processing step fails, THE FFmpeg_Worker SHALL log the bick ID, step name, and error details
3. THE FFmpeg_Worker SHALL implement retry logic with exponential backoff for transient failures
4. IF all retry attempts fail, THEN THE FFmpeg_Worker SHALL mark the bick as 'failed' and preserve error details
5. THE FFmpeg_Worker SHALL clean up temporary files after processing completes (success or failure)

### Requirement 8: Worker Configuration

**User Story:** As a developer, I want configurable worker settings, so that I can tune performance for different environments.

#### Acceptance Criteria

1. THE FFmpeg_Worker SHALL support configurable concurrency (number of parallel jobs)
2. THE FFmpeg_Worker SHALL support configurable teaser duration (default 5 seconds)
3. THE FFmpeg_Worker SHALL support graceful shutdown on SIGTERM and SIGINT signals
4. THE FFmpeg_Worker SHALL validate required environment variables on startup

