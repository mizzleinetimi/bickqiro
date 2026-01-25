# Implementation Plan: Upload Pipeline

## Overview

This implementation plan covers the Bickqr upload pipeline, enabling users to upload audio files or extract audio from social media URLs, trim to 10 seconds max, and submit for processing. The implementation uses Next.js API routes, wavesurfer.js for waveform visualization, Cloudflare R2 for storage, and BullMQ for job queuing.

## Tasks

- [x] 1. Database schema updates
  - [x] 1.1 Create migration for upload pipeline columns
    - Add source_url column to bicks table
    - Add original_duration_ms column to bicks table
    - Make owner_id nullable
    - Update RLS policy for anonymous inserts
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 1.2 Update TypeScript database types
    - Add source_url and original_duration_ms to Bick interface
    - Update BickInsert to make owner_id optional
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Core utilities and validation
  - [x] 2.1 Create upload validation utilities
    - Implement isValidMimeType function
    - Implement isValidFileSize function
    - Implement validateTitle function
    - Implement validateDescription function
    - Implement validateTags function
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.4, 5.5_
  - [x] 2.2 Write property tests for validation utilities
    - **Property 1: MIME Type Validation**
    - **Property 2: File Size Validation**
    - **Property 6: Title Validation**
    - **Property 7: Description Validation**
    - **Property 8: Tag Format Validation**
    - **Property 9: Tag Count Validation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 5.1, 5.2, 5.4, 5.5**
  - [x] 2.3 Create slug generation utility
    - Implement generateSlug function that produces URL-safe slugs
    - Handle special characters, unicode, and edge cases
    - _Requirements: 7.3_
  - [x] 2.4 Write property test for slug generation
    - **Property 10: Slug Generation**
    - **Validates: Requirements 7.3**

- [x] 3. R2 storage integration
  - [x] 3.1 Create R2 client module
    - Set up S3Client for R2
    - Implement generatePresignedPutUrl function
    - Implement generateStorageKey function
    - _Requirements: 6.1, 6.2_
  - [x] 3.2 Write unit tests for R2 client
    - Test presigned URL generation
    - Test storage key format
    - _Requirements: 6.1_

- [x] 4. BullMQ queue setup
  - [x] 4.1 Create Redis connection module
    - Implement createRedisConnection function
    - _Requirements: 8.1_
  - [x] 4.2 Create queue definitions
    - Define bick-processing queue with retry configuration
    - Implement enqueueBickProcessing function
    - _Requirements: 8.1, 8.2_
  - [x] 4.3 Write property test for job payload structure
    - **Property 14: Job Payload Structure**
    - **Validates: Requirements 8.2**

- [x] 5. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. URL extraction service
  - [x] 6.1 Create platform detection utility
    - Implement detectPlatform function with regex patterns
    - Support YouTube, TikTok, Instagram, Twitter/X
    - _Requirements: 2.1, 2.2_
  - [x] 6.2 Write property test for platform detection
    - **Property 3: URL Platform Detection**
    - **Validates: Requirements 2.1, 2.2**
  - [x] 6.3 Create audio extraction service
    - Implement extractAudioFromUrl using yt-dlp
    - Handle errors and timeouts
    - _Requirements: 2.1, 2.3_

- [x] 7. API routes implementation
  - [x] 7.1 Create POST /api/bicks/extract-url route
    - Validate URL and detect platform
    - Call extraction service
    - Return audio URL and metadata
    - _Requirements: 9.1, 2.1, 2.2, 2.3_
  - [x] 7.2 Create POST /api/bicks/upload-session route
    - Validate request body (title, description, tags)
    - Create bick record with status 'processing'
    - Generate presigned R2 URL
    - Return session data
    - _Requirements: 9.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x] 7.3 Write property tests for upload-session validation
    - **Property 11: Bick Creation Status**
    - **Property 12: Owner Association**
    - **Property 13: Source URL Persistence**
    - **Validates: Requirements 7.1, 7.4, 7.5, 7.6**
  - [x] 7.4 Create POST /api/bicks/[id]/complete route
    - Validate bick exists and is in processing state
    - Create bick_asset record for original upload
    - Enqueue processing job
    - _Requirements: 9.3, 8.1, 8.2_
  - [x] 7.5 Write property test for API validation errors
    - **Property 15: API Validation Errors**
    - **Validates: Requirements 9.4**

- [x] 8. Checkpoint - API routes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Client-side audio processing
  - [x] 9.1 Create audio trimmer utility
    - Implement trimAudio function using Web Audio API
    - Implement WAV encoding
    - _Requirements: 3.5_
  - [x] 9.2 Write property test for audio trimming
    - **Property 5: Audio Trimming Accuracy**
    - **Validates: Requirements 3.5**

- [x] 10. Upload UI components
  - [x] 10.1 Create WaveformEditor component
    - Integrate wavesurfer.js with regions plugin
    - Implement trim handle controls
    - Display duration and selection info
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 3.2, 3.3_
  - [x] 10.2 Create UrlExtractor component
    - URL input with platform detection
    - Loading state during extraction
    - Error display for failed extractions
    - _Requirements: 2.4, 2.5_
  - [x] 10.3 Create MetadataForm component
    - Title input with validation
    - Description textarea with character count
    - Tag input with validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 10.4 Create FileDropzone component
    - Drag and drop file selection
    - File type and size validation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 10.5 Create UploadForm component
    - Orchestrate upload flow steps
    - Handle state transitions
    - Integrate all sub-components
    - _Requirements: 3.1, 3.4, 6.3, 6.4, 6.5_
  - [x] 10.6 Write property test for duration enforcement
    - **Property 4: Duration Enforcement**
    - **Validates: Requirements 3.1, 3.4**

- [x] 11. Upload page integration
  - [x] 11.1 Update upload page
    - Replace placeholder with UploadForm component
    - Add proper metadata
    - _Requirements: 1.4, 2.4_

- [x] 12. Worker implementation
  - [x] 12.1 Create placeholder worker
    - Set up BullMQ worker
    - Implement processor that marks bicks as 'live'
    - _Requirements: 8.4_
  - [x] 12.2 Write unit test for worker
    - Test that worker updates bick status to 'live'
    - _Requirements: 8.4_

- [x] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify demo checklist:
    - User can upload audio file and trim to 10 seconds
    - User can paste TikTok/YouTube URL and extract audio
    - Trimmed audio uploads to R2
    - Bick record created with processing status
    - Job enqueued in BullMQ
    - Placeholder worker marks bick as live

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The worker is a placeholder - full FFmpeg processing is Spec 4
