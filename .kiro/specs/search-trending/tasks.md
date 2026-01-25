# Implementation Plan: Search & Trending

## Overview

This plan implements full-text search and trending functionality for Bickqr. Tasks are ordered to build incrementally: database schema first, then core query functions, API routes, UI components, and finally the worker job.

## Tasks

- [x] 1. Database schema updates
  - [x] 1.1 Create migration for description_search tsvector column
    - Add generated tsvector column for description field
    - Create combined GIN index for title + description search
    - _Requirements: 1.1_
  - [x] 1.2 Create migration for trending_scores table
    - Create table with bick_id, score, rank, computed_at columns
    - Add index on rank for efficient ordering
    - Enable RLS with public read policy
    - _Requirements: 3.4_
  - [x] 1.3 Update TypeScript database types
    - Add TrendingScore interface
    - Add SearchCursor and TrendingCursor types
    - _Requirements: 5.5_

- [x] 2. Implement search query function
  - [x] 2.1 Create searchBicks function in queries.ts
    - Use plainto_tsquery for query parsing
    - Combine title_search and description_search with weights
    - Filter by status='live'
    - Order by ts_rank descending
    - Implement cursor-based pagination
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 2.2 Write property tests for search function
    - **Property 1: Search Returns Matching Bicks**
    - **Property 2: Search Only Returns Live Bicks**
    - **Property 3: Search Results Ordered by Relevance**
    - **Property 4: Multi-Word Search Uses OR Logic**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3. Implement trending query functions
  - [x] 3.1 Create getTrendingBicksPaginated function
    - Join bicks with trending_scores
    - Order by rank ascending (rank 1 = highest score)
    - Implement cursor-based pagination
    - Include assets in response
    - _Requirements: 4.1, 4.3_
  - [x] 3.2 Create getTopTrendingBicks function for homepage
    - Return top N bicks by trending score
    - Simple limit-based query (no pagination needed)
    - _Requirements: 6.3, 6.4_
  - [x] 3.3 Write property tests for trending queries
    - **Property 8: Trending Results Ordered by Score**
    - **Validates: Requirements 4.1**

- [x] 4. Checkpoint - Verify query functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Search API route
  - [x] 5.1 Create GET /api/search route
    - Parse and validate query parameters (q, cursor, limit)
    - Validate q is present and <= 200 chars
    - Validate limit is 1-50, default 20
    - Call searchBicks function
    - Return JSON response with bicks and nextCursor
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 5.2 Add rate limiting headers
    - Include X-RateLimit-Limit, X-RateLimit-Remaining headers
    - _Requirements: 5.8_
  - [x] 5.3 Write property tests for Search API
    - **Property 5: Pagination Cursor Behavior**
    - **Property 9: API Limit Parameter Respected**
    - **Property 10: API Response Shape**
    - **Property 11: API Rejects Long Queries**
    - **Validates: Requirements 1.5, 1.6, 5.4, 5.5, 5.7**

- [x] 6. Implement trending calculator worker job
  - [x] 6.1 Create trending score calculation function
    - Implement formula: (play_count * 1.0 + share_count * 2.0) * decay_factor
    - Calculate decay_factor: 1 / (1 + days_since_published * 0.1)
    - _Requirements: 3.1, 3.2_
  - [x] 6.2 Create trending calculator job processor
    - Fetch all live bicks
    - Calculate scores for each
    - Update trending_scores table atomically (transaction)
    - Assign ranks based on score ordering
    - Log completion time and bick count
    - _Requirements: 3.3, 3.4, 3.5, 7.2, 7.3, 7.4_
  - [x] 6.3 Register job in queue system
    - Add 'calculate-trending' job type
    - Configure 15-minute repeat interval
    - _Requirements: 7.1_
  - [x] 6.4 Write property tests for trending calculator
    - **Property 6: Trending Score Formula Correctness**
    - **Property 7: Trending Only Includes Live Bicks**
    - **Property 12: Trending Update Atomicity**
    - **Validates: Requirements 3.1, 3.2, 3.3, 7.2**

- [x] 7. Checkpoint - Verify API and worker
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Search UI components
  - [x] 8.1 Create SearchInput component
    - Text input with search icon
    - Form submission handling
    - Optional onSearch callback for client-side handling
    - _Requirements: 2.1, 6.1_
  - [x] 8.2 Create SearchResults component
    - Display list of BickCard components
    - Show "Load More" button when nextCursor exists
    - Handle loading and empty states
    - _Requirements: 2.3, 2.4_
  - [x] 8.3 Write unit tests for search components
    - Test SearchInput form submission
    - Test SearchResults rendering with various states
    - _Requirements: 2.1, 2.3, 2.4_

- [x] 9. Update Search page
  - [x] 9.1 Implement /search page with SSR
    - Add search input at top
    - Parse query parameter and fetch initial results server-side
    - Display SearchResults component
    - Show prompt when no query provided
    - _Requirements: 2.1, 2.2, 2.6_
  - [x] 9.2 Add SEO metadata
    - Set robots to "noindex,follow"
    - Add appropriate title and description
    - _Requirements: 2.5_
  - [x] 9.3 Write integration tests for search page
    - Test page renders with search input
    - Test query parameter triggers search
    - Test noindex meta tag present
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 10. Update Trending page
  - [x] 10.1 Update /trending page to use precomputed scores
    - Replace getTrendingBicks with getTrendingBicksPaginated
    - Add pagination support with "Load More"
    - _Requirements: 4.1, 4.3_
  - [x] 10.2 Ensure SEO metadata is correct
    - Verify title, description, and indexing settings
    - _Requirements: 4.4_
  - [x] 10.3 Write integration tests for trending page
    - Test page displays bicks in score order
    - Test pagination works
    - _Requirements: 4.1, 4.3_

- [x] 11. Update Homepage
  - [x] 11.1 Add SearchInput component to homepage
    - Position prominently at top
    - Form action redirects to /search with query
    - _Requirements: 6.1, 6.2_
  - [x] 11.2 Update trending section to use precomputed scores
    - Replace current getTrendingBicks call with getTopTrendingBicks
    - Display top 6 trending bicks
    - _Requirements: 6.3, 6.4_
  - [x] 11.3 Write integration tests for homepage
    - Test search input present
    - Test search submission redirects
    - Test trending bicks displayed
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The trending calculator job should be run once manually after deployment to populate initial scores
