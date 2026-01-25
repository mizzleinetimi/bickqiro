# Requirements Document

## Introduction

This document defines the requirements for the Bickqr upload pipeline feature. The upload pipeline enables authenticated users to upload short audio clips ("bicks") either by direct file upload or by extracting audio from social media video URLs (TikTok, Instagram, YouTube, Twitter/X). All bicks must be 10 seconds or less, with a client-side waveform editor for trimming longer audio. The pipeline handles direct-to-R2 storage uploads, creates bick records, and enqueues processing jobs via BullMQ.

## Glossary

- **Bick**: A short audio clip (maximum 10 seconds) stored in the Bickqr system
- **Upload_Pipeline**: The system responsible for handling audio uploads from file or URL extraction through to job queue submission
- **Waveform_Editor**: Client-side component for visualizing and trimming audio to 10 seconds
- **R2_Storage**: Cloudflare R2 object storage for media assets
- **BullMQ**: Redis-based job queue for async processing
- **Signed_URL**: Pre-authenticated URL for direct client-to-R2 uploads
- **URL_Extractor**: Server-side service that extracts audio from social media video URLs using yt-dlp
- **Audio_Trimmer**: Client-side functionality to select a 10-second segment from longer audio

## Requirements

### Requirement 1: Audio File Upload

**User Story:** As a user, I want to upload audio files directly, so that I can share my audio clips on Bickqr.

#### Acceptance Criteria

1. WHEN a user selects an audio file, THE Upload_Pipeline SHALL accept files with MIME types audio/mpeg, audio/wav, audio/ogg, and audio/mp4
2. WHEN an uploaded file exceeds 10MB, THE Upload_Pipeline SHALL reject the upload and display an error message
3. WHEN an uploaded file has an unsupported MIME type, THE Upload_Pipeline SHALL reject the upload and display an error message
4. WHEN a valid audio file is selected, THE Upload_Pipeline SHALL display the audio waveform for preview

### Requirement 2: Social Media URL Extraction

**User Story:** As a user, I want to paste a social media video URL, so that I can extract and upload audio from TikTok, Instagram, YouTube, or Twitter/X videos.

#### Acceptance Criteria

1. WHEN a user pastes a URL from TikTok, Instagram, YouTube, or Twitter/X, THE URL_Extractor SHALL extract the audio track from the video
2. WHEN the URL is from an unsupported platform, THE URL_Extractor SHALL display an error message indicating supported platforms
3. WHEN the URL is invalid or the video is unavailable, THE URL_Extractor SHALL display an appropriate error message
4. WHEN audio extraction succeeds, THE Upload_Pipeline SHALL display the extracted audio waveform for preview
5. WHEN audio extraction is in progress, THE Upload_Pipeline SHALL display a loading indicator

### Requirement 3: Audio Duration Enforcement

**User Story:** As a user, I want to ensure my bicks are 10 seconds or less, so that they comply with platform requirements.

#### Acceptance Criteria

1. THE Upload_Pipeline SHALL enforce a maximum duration of 10 seconds for all bicks
2. WHEN audio duration exceeds 10 seconds, THE Waveform_Editor SHALL display trim handles for selecting a 10-second segment
3. WHEN a user adjusts trim handles, THE Waveform_Editor SHALL update the selected segment preview in real-time
4. WHEN audio duration is 10 seconds or less, THE Waveform_Editor SHALL allow upload without trimming
5. WHEN a user confirms trim selection, THE Audio_Trimmer SHALL produce a trimmed audio segment of exactly the selected duration

### Requirement 4: Waveform Visualization

**User Story:** As a user, I want to see a visual representation of my audio, so that I can accurately select the portion I want to upload.

#### Acceptance Criteria

1. WHEN audio is loaded, THE Waveform_Editor SHALL render a visual waveform representation
2. WHEN audio exceeds 10 seconds, THE Waveform_Editor SHALL display a selection region overlay
3. WHEN a user drags trim handles, THE Waveform_Editor SHALL update the selection region visually
4. WHEN a user clicks play, THE Waveform_Editor SHALL play only the selected segment
5. THE Waveform_Editor SHALL display the current selection duration in seconds

### Requirement 5: Bick Metadata Entry

**User Story:** As a user, I want to add title, description, and tags to my bick, so that others can discover and understand my content.

#### Acceptance Criteria

1. THE Upload_Pipeline SHALL require a title field (minimum 1 character, maximum 100 characters)
2. THE Upload_Pipeline SHALL provide an optional description field (maximum 500 characters)
3. THE Upload_Pipeline SHALL provide a tag input field supporting multiple tags
4. WHEN a user enters a tag, THE Upload_Pipeline SHALL validate tag format (alphanumeric and hyphens only)
5. THE Upload_Pipeline SHALL limit tags to a maximum of 10 per bick

### Requirement 6: Direct-to-R2 Upload

**User Story:** As a system, I want to upload audio directly to R2 storage, so that the API server is not burdened with file transfer.

#### Acceptance Criteria

1. WHEN upload is initiated, THE Upload_Pipeline SHALL request a signed PUT URL from the API
2. THE Upload_Pipeline SHALL upload the trimmed audio directly to R2 using the signed URL
3. WHEN the signed URL expires before upload completes, THE Upload_Pipeline SHALL request a new signed URL
4. WHEN R2 upload succeeds, THE Upload_Pipeline SHALL notify the API of completion
5. WHEN R2 upload fails, THE Upload_Pipeline SHALL display an error and allow retry

### Requirement 7: Bick Record Creation

**User Story:** As a system, I want to create a bick record when upload begins, so that the upload can be tracked and processed.

#### Acceptance Criteria

1. WHEN upload session is created, THE Upload_Pipeline SHALL create a bick record with status 'processing'
2. THE Upload_Pipeline SHALL store the original filename in the bick record
3. THE Upload_Pipeline SHALL generate a URL-friendly slug from the title
4. WHERE a user is authenticated, THE Upload_Pipeline SHALL associate the bick with the user's profile
5. WHERE a user is not authenticated, THE Upload_Pipeline SHALL create the bick with a null owner_id
6. IF a source URL was used, THEN THE Upload_Pipeline SHALL store the source_url in the bick record

### Requirement 8: Job Queue Integration

**User Story:** As a system, I want to enqueue processing jobs, so that audio can be processed asynchronously.

#### Acceptance Criteria

1. WHEN upload completes successfully, THE Upload_Pipeline SHALL enqueue a processing job in BullMQ
2. THE Upload_Pipeline SHALL include bick ID and storage key in the job payload
3. WHEN job is enqueued, THE Upload_Pipeline SHALL display a success message to the user
4. THE Upload_Pipeline SHALL provide a placeholder worker that marks bicks as 'live' for demo purposes

### Requirement 9: API Routes

**User Story:** As a developer, I want well-defined API routes, so that the upload flow is properly structured.

#### Acceptance Criteria

1. THE Upload_Pipeline SHALL provide POST /api/bicks/extract-url for extracting audio from social media URLs
2. THE Upload_Pipeline SHALL provide POST /api/bicks/upload-session for creating bick records and returning signed R2 URLs
3. THE Upload_Pipeline SHALL provide POST /api/bicks/[id]/complete for marking upload complete and enqueuing jobs
4. WHEN API requests have invalid data, THE Upload_Pipeline SHALL return 400 Bad Request with validation errors

### Requirement 10: Database Schema Updates

**User Story:** As a developer, I want the database schema to support upload tracking, so that source attribution and duration tracking are possible.

#### Acceptance Criteria

1. THE Upload_Pipeline SHALL add a source_url column to the bicks table for URL extraction attribution
2. THE Upload_Pipeline SHALL add an original_duration_ms column to the bicks table for tracking pre-trim duration
3. THE Upload_Pipeline SHALL modify owner_id to be nullable for anonymous uploads
4. THE Upload_Pipeline SHALL ensure existing bick records are not affected by schema changes

### Requirement 11: Error Handling and Validation

**User Story:** As a user, I want clear error messages, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN file validation fails, THE Upload_Pipeline SHALL display specific error messages (file too large, unsupported format)
2. WHEN URL extraction fails, THE Upload_Pipeline SHALL display the reason (invalid URL, video unavailable, unsupported platform)
3. WHEN upload fails, THE Upload_Pipeline SHALL preserve entered metadata for retry
4. WHEN network errors occur, THE Upload_Pipeline SHALL allow retry without re-entering data
5. IF the trimmed audio is empty or invalid, THEN THE Upload_Pipeline SHALL prevent submission and display an error
