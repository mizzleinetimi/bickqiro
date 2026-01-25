# Implementation Plan: FFmpeg Worker

## Overview

This implementation plan breaks down the FFmpeg Worker feature into discrete coding tasks. The worker processes uploaded audio files to generate waveform JSON, OG images, and teaser MP4 videos. Tasks are ordered to build incrementally, with testing integrated throughout.

## Tasks

- [x] 1. Set up worker infrastructure and utilities
  - [x] 1.1 Create worker type definitions
    - Create `worker/types.ts` with ProcessingResult, FFmpegResult interfaces
    - Define error types for different failure scenarios
    - _Requirements: 7.1, 7.2_
  
  - [x] 1.2 Implement FFmpeg utility module
    - Create `worker/lib/ffmpeg.ts` with runFFmpeg, getAudioDuration, validateAudio functions
    - Add timeout handling and stderr capture
    - _Requirements: 1.2, 7.1_
  
  - [x] 1.3 Write property tests for audio validation
    - **Property 1: Audio Validation**
    - Test that validation correctly identifies valid/invalid audio formats
    - **Validates: Requirements 1.2**

- [x] 2. Implement audio download and upload utilities
  - [x] 2.1 Implement audio downloader
    - Create `worker/lib/downloader.ts` with downloadAudio and cleanupTempFiles functions
    - Use AWS SDK S3Client for R2 downloads
    - Handle streaming to temp files
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 Implement asset uploader
    - Create `worker/lib/uploader.ts` with uploadAsset function
    - Return CDN URLs after successful upload
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 2.3 Write property tests for storage key format
    - **Property 4: Storage Key Format**
    - Test that keys match pattern `uploads/{bickId}/{assetName}`
    - **Validates: Requirements 2.4, 3.5, 4.5**

- [x] 3. Checkpoint - Verify infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement waveform JSON generation
  - [x] 4.1 Implement waveform generator
    - Create `worker/lib/waveform.ts` with generateWaveformJson function
    - Extract PCM data using FFmpeg
    - Process into normalized peak values
    - Output JSON with version, sampleRate, duration, peaks
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 4.2 Write property tests for waveform generation
    - **Property 2: Waveform Resolution** - Verify minimum 100 samples/second
    - **Property 3: Waveform Normalization** - Verify all peaks in [0.0, 1.0]
    - **Validates: Requirements 2.2, 2.3**

- [x] 5. Implement OG image generation
  - [x] 5.1 Implement OG image generator
    - Create `worker/lib/og-image.ts` with generateOgImage function
    - Use FFmpeg showwavespic filter
    - Overlay waveform on brand background
    - Output 1200x630 PNG
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 5.2 Write property tests for OG image
    - **Property 5: OG Image Dimensions** - Verify 1200x630 pixels
    - **Property 6: OG Image Format** - Verify PNG MIME type
    - **Validates: Requirements 3.1, 3.4**

- [x] 6. Implement teaser MP4 generation
  - [x] 6.1 Implement teaser generator
    - Create `worker/lib/teaser.ts` with generateTeaser function
    - Use FFmpeg showwaves filter for animated waveform
    - Loop brand background as video
    - Encode H.264/AAC at 1280x720
    - Limit to first 3-5 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.2 Write property tests for teaser video
    - **Property 7: Teaser Duration** - Verify duration is min(audio, TEASER_DURATION)
    - **Property 8: Teaser Encoding** - Verify H.264/AAC at 1280x720
    - **Validates: Requirements 4.1, 4.4**

- [x] 7. Checkpoint - Verify asset generators
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement bick processor and worker integration
  - [x] 8.1 Implement bick processor
    - Create `worker/processors/bick-processor.ts` with processBick function
    - Orchestrate download → waveform → OG → teaser → upload flow
    - Create bick_asset records for each asset
    - Update bick status to 'live' on success
    - _Requirements: 2.5, 3.6, 4.6, 5.4, 5.5, 6.1, 6.2_
  
  - [x] 8.2 Update worker entry point
    - Enhance `worker/index.ts` to use new processor
    - Add environment variable validation
    - Configure concurrency from WORKER_CONCURRENCY
    - _Requirements: 8.1, 8.4_
  
  - [x] 8.3 Write property tests for asset records
    - **Property 9: Asset Record Completeness** - Verify all fields populated
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 9. Implement error handling and cleanup
  - [x] 9.1 Implement failure handling
    - Update processor to catch errors and set status to 'failed'
    - Log error details with bickId and step name
    - _Requirements: 1.3, 1.4, 6.3, 7.2_
  
  - [x] 9.2 Implement temp file cleanup
    - Ensure cleanupTempFiles runs in finally block
    - Handle cleanup errors gracefully
    - _Requirements: 7.5_
  
  - [x] 9.3 Write property tests for error handling
    - **Property 10: Failure Status Handling** - Verify failed status on errors
    - **Property 13: Temp File Cleanup** - Verify temp dir removed after processing
    - **Validates: Requirements 1.3, 1.4, 6.3, 7.5**

- [x] 10. Implement status invariants
  - [x] 10.1 Add status validation logic
    - Verify all three assets exist before setting 'live'
    - Set published_at timestamp when status becomes 'live'
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [x] 10.2 Write property tests for status invariants
    - **Property 11: Success Status Invariant** - Verify 'live' implies all assets exist
    - **Property 12: Published Timestamp** - Verify published_at is set for live bicks
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [x] 11. Final checkpoint - Full integration test
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Add test fixtures and integration tests
  - [x] 12.1 Create test audio fixtures
    - Add `tests/fixtures/valid-audio.mp3` (3-second sample)
    - Add `tests/fixtures/invalid-audio.txt` (text file)
    - _Requirements: 1.2_
  
  - [x] 12.2 Write integration tests
    - Test full processing pipeline with valid audio
    - Test failure handling with invalid audio
    - Test cleanup after processing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.3_

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- FFmpeg must be installed on the worker environment (Railway, Fly.io, etc.)
- The brand background image (`public/brand-thumb.jpg`) must be accessible to the worker

