# Implementation Plan: Play/Share Tracking & Copy Link

## Overview

This implementation adds play and share tracking to Bickqr with client-side debouncing, a tracking API endpoint, and share UI components. The work is organized to deliver core tracking functionality first, then UI components, with testing integrated throughout.

## Tasks

- [x] 1. Create Supabase migration for tracking functions
  - [x] 1.1 Create `increment_play_count` RPC function
    - Atomic increment of play_count column
    - Returns new count value
    - _Requirements: 1.3_
  - [x] 1.2 Create `increment_share_count` RPC function
    - Atomic increment of share_count column
    - Returns new count value
    - _Requirements: 2.4_
  - [x] 1.3 Write property test for atomic increment
    - **Property 4: Atomic count increment**
    - **Validates: Requirements 1.3, 2.4**

- [x] 2. Implement tracking API route
  - [x] 2.1 Create `/api/bicks/[id]/track` POST route
    - Validate bick exists (404 if not)
    - Validate event type is 'play' or 'share' (400 if not)
    - Call appropriate Supabase RPC function
    - Return success with new count
    - _Requirements: 1.3, 1.4, 2.4, 2.5_
  - [x] 2.2 Add rate limiting middleware
    - Track requests per IP in memory map
    - Return 429 with Retry-After header when exceeded
    - 100 requests per 60-second window
    - _Requirements: 5.1, 5.2_
  - [x] 2.3 Write unit tests for tracking API
    - Test valid play event increments count
    - Test valid share event increments count
    - Test 404 for non-existent bick
    - Test 400 for invalid event type
    - _Requirements: 1.3, 1.4, 2.4, 2.5_
  - [x] 2.4 Write property test for rate limiting
    - **Property 7: Rate limiting enforces threshold**
    - **Validates: Requirements 5.1**

- [x] 3. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create tracking debounce hook
  - [x] 4.1 Implement `useTrackingDebounce` hook
    - Accept bickId, eventType, debounceMs parameters
    - Track last event timestamp per bick/event combination
    - Fire non-blocking fetch to tracking API
    - Use localStorage to persist debounce state across page reloads
    - _Requirements: 1.1, 1.2, 2.1, 2.3_
  - [x] 4.2 Write property test for debounce logic
    - **Property 3: Debounce prevents duplicate events**
    - **Validates: Requirements 1.2, 2.3**

- [x] 5. Integrate play tracking into BickPlayer
  - [x] 5.1 Add bickId prop to BickPlayer component
    - Make tracking optional (only track if bickId provided)
    - _Requirements: 1.1_
  - [x] 5.2 Add play tracking on audio play event
    - Use useTrackingDebounce with 30-second window
    - Track only on first play, not seeks/resumes
    - Ensure tracking doesn't block playback
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 5.3 Update bick page to pass bickId to BickPlayer
    - _Requirements: 1.1_
  - [x] 5.4 Write unit tests for play tracking integration
    - Test tracking fires on play
    - Test tracking doesn't fire on seek
    - _Requirements: 1.1, 1.5_

- [x] 6. Implement SharePanel component
  - [x] 6.1 Create CopyLinkButton component
    - Use navigator.clipboard API
    - Show "Copied!" feedback for 2 seconds
    - Handle clipboard errors gracefully
    - Include ARIA labels for accessibility
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 6.2 Create TwitterShareButton component
    - Generate Twitter intent URL with bick URL and title
    - Open in new window/popup
    - Include ARIA labels
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  - [x] 6.3 Create FacebookShareButton component
    - Generate Facebook share URL with bick URL
    - Open in new window/popup
    - Include ARIA labels
    - _Requirements: 4.1, 4.3, 4.4, 4.5_
  - [x] 6.4 Create SharePanel container component
    - Compose CopyLinkButton and social buttons
    - Integrate share tracking with 60-second debounce
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 6.5 Write property test for social share URL generation
    - **Property 6: Social share URLs are correctly formatted**
    - **Validates: Requirements 4.2, 4.3**
  - [x] 6.6 Write unit tests for SharePanel components
    - Test CopyLinkButton renders with ARIA labels
    - Test copy feedback appears
    - Test social buttons have correct URLs
    - _Requirements: 3.1, 3.5, 4.1, 4.5_

- [x] 7. Integrate SharePanel into bick page
  - [x] 7.1 Add SharePanel to bick page layout
    - Position below player
    - Pass bickId, canonical URL, and title
    - _Requirements: 3.1, 4.1_
  - [x] 7.2 Write property test for clipboard URL
    - **Property 5: Clipboard receives correct URL**
    - **Validates: Requirements 3.2**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive validation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The tracking hook uses localStorage for debounce persistence to handle page refreshes
- Rate limiting uses in-memory storage; consider Redis for production scale
