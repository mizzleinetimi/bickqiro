# Implementation Plan: Tags/Categories System

## Overview

This implementation plan covers the Tags/Categories System for Bickqr, enabling tag management during upload, tag editing on existing bicks, autocomplete suggestions, tag display on cards and detail pages, popular tags sections, and tag count management.

The implementation builds on existing infrastructure (tags table, bick_tags table, RLS policies) and integrates with the current upload flow and bick display components.

## Tasks

- [x] 1. Database functions and migrations
  - [x] 1.1 Create migration for tag count trigger and helper functions
    - Add `update_tag_count()` trigger function for bick_tags INSERT/DELETE
    - Add `search_tags()` function for prefix search with ordering
    - Add `get_or_create_tag()` function for upsert logic
    - Add `update_bick_tags()` function for atomic tag updates
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 1.2 Write property tests for tag count triggers
    - **Property 13: Tag Count Increment on Addition**
    - **Property 14: Tag Count Decrement on Removal**
    - **Validates: Requirements 8.1, 8.2**

- [x] 2. Tag API routes
  - [x] 2.1 Implement GET /api/tags/search endpoint
    - Query tags by prefix using search_tags function
    - Return up to 10 results ordered by bick_count
    - Handle empty query gracefully
    - _Requirements: 9.1, 3.1, 3.2_

  - [ ]* 2.2 Write property tests for tag search
    - **Property 7: Autocomplete Suggestions Match Prefix**
    - **Property 8: Autocomplete Ordering by Count**
    - **Validates: Requirements 1.2, 3.1, 3.2**

  - [x] 2.3 Implement GET /api/tags/popular endpoint
    - Query tags ordered by bick_count descending
    - Support limit parameter (default 12)
    - Filter tags with bick_count > 0
    - _Requirements: 9.2, 6.1, 6.2_

  - [ ]* 2.4 Write property test for popular tags ordering
    - **Property 12: Popular Tags Ordering**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 2.5 Implement PUT /api/bicks/[id]/tags endpoint
    - Verify authentication (return 401 if not authenticated)
    - Verify ownership (return 403 if not owner)
    - Validate tag format (alphanumeric and hyphens only)
    - Call update_bick_tags function
    - Return updated tags
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 2.3_

  - [ ]* 2.6 Write property tests for tag update authorization
    - **Property 16: Authentication Required for Tag Update**
    - **Property 17: Authorization Required for Tag Update**
    - **Validates: Requirements 9.4, 9.5**

- [ ] 3. Checkpoint - Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Tag UI components
  - [x] 4.1 Create TagInput component
    - Input field with placeholder text
    - Add tag on Enter key or Add button click
    - Validate tag format (alphanumeric and hyphens)
    - Display selected tags as removable chips
    - Enforce 10 tag maximum
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 4.2 Write property tests for TagInput
    - **Property 1: Tag Addition to Selected List**
    - **Property 2: Invalid Tag Rejection**
    - **Property 3: Tag Removal from List**
    - **Validates: Requirements 1.3, 1.4, 1.6, 9.6**

  - [x] 4.3 Create TagAutocomplete component
    - Fetch suggestions when input >= 2 characters
    - Display up to 10 suggestions with bick counts
    - Support keyboard navigation (arrow keys)
    - Add tag on suggestion click or Enter
    - Show "create new tag" message when no matches
    - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 4.4 Write unit tests for TagAutocomplete
    - Test query trigger at 2 characters
    - Test keyboard navigation
    - Test suggestion selection
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 4.5 Create TagDisplay component
    - Render tags as clickable links to /tag/{slug}
    - Support maxVisible prop for card display (default 3)
    - Show overflow count when tags exceed maxVisible
    - Render nothing for empty tags array
    - Support size variants (sm, md)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_

  - [ ]* 4.6 Write property tests for TagDisplay
    - **Property 9: Tag Display Limit on Cards**
    - **Property 10: Tag Navigation Links**
    - **Property 11: All Tags Displayed on Detail Page**
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2**

  - [x] 4.7 Create PopularTags component
    - Fetch popular tags from API
    - Display as grid of clickable tag links
    - Support limit prop (default 12)
    - Render nothing when no tags with count > 0
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.8 Write unit tests for PopularTags
    - Test empty state rendering
    - Test tag ordering
    - Test link generation
    - _Requirements: 6.1, 6.4_

- [ ] 5. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integration with upload flow
  - [x] 6.1 Update MetadataForm to use TagInput with autocomplete
    - Replace existing tag input with TagInput component
    - Wire up TagAutocomplete for suggestions
    - Pass tags to upload session API
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

  - [ ]* 6.2 Write integration test for upload with tags
    - **Property 4: Tag Persistence on Upload**
    - **Validates: Requirements 1.7**

- [x] 7. Integration with bick display
  - [x] 7.1 Update BickCard to display tags
    - Add TagDisplay component with maxVisible=3
    - Fetch tags with bick data in queries
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Update bick detail page to display tags
    - Add TagDisplay component showing all tags
    - Add edit tags button for owner
    - _Requirements: 5.1, 5.2, 5.3, 2.1_

  - [x] 7.3 Create TagEditor component for editing existing bick tags
    - Modal or inline editor with TagInput
    - Pre-populate with current tags
    - Save changes via PUT /api/bicks/[id]/tags
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 7.4 Write property tests for tag editing
    - **Property 5: Tag Editor Pre-population**
    - **Property 6: Tag Update Persistence**
    - **Validates: Requirements 2.2, 2.3**

- [x] 8. Popular tags integration
  - [x] 8.1 Add PopularTags section to homepage
    - Display below trending sounds section
    - Show up to 12 popular tags
    - _Requirements: 6.1, 6.3_

  - [x] 8.2 Add PopularTags section to trending page
    - Display in sidebar or above results
    - Show up to 12 popular tags
    - _Requirements: 6.2, 6.3_

- [x] 9. Update Supabase queries
  - [x] 9.1 Add getBickTags query function
    - Fetch tags for a specific bick
    - Used by detail page and editor
    - _Requirements: 5.1, 2.2_

  - [x] 9.2 Update getBickBySlugAndId to include tags
    - Join with bick_tags and tags tables
    - Return tags array with bick data
    - _Requirements: 5.1_

  - [x] 9.3 Add searchTags query function
    - Call search_tags database function
    - Return TagSuggestion array
    - _Requirements: 3.1, 3.2_

  - [x] 9.4 Add getPopularTags query function
    - Query tags ordered by bick_count
    - Filter bick_count > 0
    - _Requirements: 6.1, 6.2_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The existing tag page at /tag/[tag] already handles tag browsing
