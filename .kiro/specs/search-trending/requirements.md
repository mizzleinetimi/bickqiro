# Requirements Document

## Introduction

This document defines the requirements for implementing full-text search and trending functionality for Bickqr. The feature enables users to discover bicks through keyword search and trending rankings, with precomputed trending scores for optimal performance.

## Glossary

- **Bick**: A short audio clip stored in the Bickqr platform
- **Search_Engine**: The full-text search system using PostgreSQL tsvector
- **Trending_Calculator**: The worker job that precomputes trending scores
- **Search_API**: The REST endpoint for search queries
- **Trending_Score**: A computed value combining play_count, share_count, and recency
- **Cursor**: An opaque pagination token for efficient result traversal
- **Live_Bick**: A bick with status='live' that is publicly accessible

## Requirements

### Requirement 1: Full-Text Search

**User Story:** As a user, I want to search for bicks by title and description, so that I can find specific audio clips quickly.

#### Acceptance Criteria

1. WHEN a user submits a search query, THE Search_Engine SHALL return bicks matching the query against title and description fields
2. WHEN a search query is submitted, THE Search_Engine SHALL only return bicks with status='live'
3. WHEN search results are returned, THE Search_Engine SHALL order results by relevance score descending
4. WHEN a search query contains multiple words, THE Search_Engine SHALL match bicks containing any of the words (OR logic)
5. WHEN search results exceed the page limit, THE Search_API SHALL return a cursor for pagination
6. WHEN a cursor is provided, THE Search_API SHALL return the next page of results
7. WHEN no results match the query, THE Search_Engine SHALL return an empty array with no cursor

### Requirement 2: Search Page UI

**User Story:** As a user, I want a search page with a search input and results display, so that I can easily search and browse results.

#### Acceptance Criteria

1. WHEN a user visits /search, THE System SHALL display a search input field
2. WHEN a user visits /search with a query parameter, THE System SHALL execute the search and display results
3. WHEN search results are displayed, THE System SHALL show bick title, description preview, and play count
4. WHEN more results are available, THE System SHALL display a "Load More" button
5. THE /search page SHALL have robots meta tag set to "noindex,follow"
6. WHEN the search input is empty, THE System SHALL display a prompt to enter a search term

### Requirement 3: Trending Algorithm

**User Story:** As a user, I want to see trending bicks ranked by popularity and recency, so that I can discover what's popular right now.

#### Acceptance Criteria

1. THE Trending_Calculator SHALL compute trending scores using the formula: score = (play_count * 1.0 + share_count * 2.0) * decay_factor
2. THE Trending_Calculator SHALL apply a time decay factor where decay_factor = 1 / (1 + days_since_published * 0.1)
3. THE Trending_Calculator SHALL only compute scores for bicks with status='live'
4. THE Trending_Calculator SHALL store precomputed scores in a trending_scores table
5. THE Trending_Calculator SHALL run as a scheduled worker job, not per-request
6. WHEN fetching trending bicks, THE System SHALL read from precomputed scores, not calculate per-request

### Requirement 4: Trending Page

**User Story:** As a user, I want a trending page showing the most popular bicks, so that I can discover popular content.

#### Acceptance Criteria

1. WHEN a user visits /trending, THE System SHALL display bicks ordered by trending score descending
2. WHEN displaying trending bicks, THE System SHALL show bick title, description preview, play count, and share count
3. WHEN more trending bicks are available, THE System SHALL support cursor-based pagination
4. THE /trending page SHALL have proper SEO metadata for indexing

### Requirement 5: Search API Endpoint

**User Story:** As a developer, I want a search API endpoint, so that the frontend can fetch search results.

#### Acceptance Criteria

1. THE Search_API SHALL be accessible at GET /api/search
2. WHEN a request is made, THE Search_API SHALL accept query parameter 'q' for the search term
3. WHEN a request is made, THE Search_API SHALL accept optional query parameter 'cursor' for pagination
4. WHEN a request is made, THE Search_API SHALL accept optional query parameter 'limit' with default 20 and max 50
5. THE Search_API SHALL return JSON with shape: { bicks: BickWithAssets[], nextCursor: string | null }
6. WHEN the 'q' parameter is missing or empty, THE Search_API SHALL return 400 Bad Request
7. IF the query parameter exceeds 200 characters, THEN THE Search_API SHALL return 400 Bad Request
8. THE Search_API SHALL include rate limiting headers in responses

### Requirement 6: Homepage Integration

**User Story:** As a user, I want to see trending bicks and a search bar on the homepage, so that I can quickly discover or search for content.

#### Acceptance Criteria

1. THE Homepage SHALL display a search input field prominently
2. WHEN a user submits a search from the homepage, THE System SHALL redirect to /search with the query
3. THE Homepage SHALL display the top 6 trending bicks
4. WHEN displaying trending bicks on homepage, THE System SHALL use precomputed trending scores

### Requirement 7: Trending Score Computation Job

**User Story:** As a system operator, I want trending scores computed automatically, so that the trending page stays current without manual intervention.

#### Acceptance Criteria

1. THE Trending_Calculator job SHALL be queued to run every 15 minutes
2. WHEN the job runs, THE Trending_Calculator SHALL update all trending scores atomically
3. IF the job fails, THEN THE System SHALL retain the previous trending scores
4. THE Trending_Calculator SHALL log job completion time and number of bicks processed
