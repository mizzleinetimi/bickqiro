# Design Document: Search & Trending

## Overview

This design implements full-text search and trending functionality for Bickqr. The system leverages PostgreSQL's built-in full-text search capabilities via tsvector columns and implements a precomputed trending score system to avoid per-request calculations.

Key design decisions:
- Use existing `title_search` tsvector column for full-text search
- Add `description_search` tsvector column for description search
- Create `trending_scores` table for precomputed rankings
- Implement cursor-based pagination throughout
- Use BullMQ worker job for trending score computation

## Architecture

```mermaid
flowchart TB
    subgraph "Client Layer"
        HP[Homepage]
        SP[Search Page]
        TP[Trending Page]
    end
    
    subgraph "API Layer"
        SA[/api/search]
    end
    
    subgraph "Data Layer"
        SQ[Search Queries]
        TQ[Trending Queries]
    end
    
    subgraph "Database"
        BT[(bicks table)]
        TS[(trending_scores)]
        TSV[tsvector indexes]
    end
    
    subgraph "Worker"
        TC[Trending Calculator Job]
    end
    
    HP --> SA
    SP --> SA
    HP --> TQ
    TP --> TQ
    
    SA --> SQ
    SQ --> TSV
    TSV --> BT
    
    TQ --> TS
    TS --> BT
    
    TC --> TS
    TC --> BT
```

## Components and Interfaces

### 1. Search API Route

**Location:** `src/app/api/search/route.ts`

```typescript
interface SearchRequest {
  q: string;           // Search query (required, max 200 chars)
  cursor?: string;     // Pagination cursor (optional)
  limit?: number;      // Results per page (default: 20, max: 50)
}

interface SearchResponse {
  bicks: BickWithAssets[];
  nextCursor: string | null;
}

// GET /api/search?q=query&cursor=xxx&limit=20
export async function GET(request: Request): Promise<Response>
```

### 2. Search Query Function

**Location:** `src/lib/supabase/queries.ts`

```typescript
interface SearchOptions {
  query: string;
  cursor?: string;
  limit?: number;
}

interface SearchResult {
  bicks: BickWithAssets[];
  nextCursor: string | null;
}

async function searchBicks(options: SearchOptions): Promise<SearchResult>
```

### 3. Trending Query Function

**Location:** `src/lib/supabase/queries.ts`

```typescript
interface TrendingOptions {
  cursor?: string;
  limit?: number;
}

interface TrendingResult {
  bicks: BickWithAssets[];
  nextCursor: string | null;
}

async function getTrendingBicksPaginated(options: TrendingOptions): Promise<TrendingResult>
```

### 4. Trending Calculator Job

**Location:** `worker/jobs/trending-calculator.ts`

```typescript
interface TrendingCalculatorJob {
  type: 'calculate-trending';
}

// Computes trending scores for all live bicks
async function processTrendingCalculation(): Promise<void>
```

### 5. Search UI Components

**Location:** `src/components/search/`

```typescript
// SearchInput component
interface SearchInputProps {
  defaultValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

// SearchResults component
interface SearchResultsProps {
  query: string;
  initialBicks?: BickWithAssets[];
  initialCursor?: string | null;
}
```

## Data Models

### Database Schema Changes

```sql
-- Add description search vector to bicks table
ALTER TABLE bicks ADD COLUMN IF NOT EXISTS 
  description_search TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(description, ''))
  ) STORED;

-- Create combined search index
CREATE INDEX IF NOT EXISTS bicks_combined_search_idx 
  ON bicks USING GIN ((
    setweight(title_search, 'A') || 
    setweight(description_search, 'B')
  ));

-- Trending scores table
CREATE TABLE IF NOT EXISTS trending_scores (
  bick_id UUID PRIMARY KEY REFERENCES bicks(id) ON DELETE CASCADE,
  score DECIMAL(12, 4) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient trending queries
CREATE INDEX IF NOT EXISTS trending_scores_rank_idx 
  ON trending_scores(rank ASC);

-- RLS policy for trending_scores (public read)
ALTER TABLE trending_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trending_scores_public_read" ON trending_scores
  FOR SELECT USING (true);
```

### TypeScript Types

```typescript
// New types for search-trending feature
interface TrendingScore {
  bick_id: string;
  score: number;
  rank: number;
  computed_at: string;
}

interface SearchCursor {
  score: number;
  id: string;
}

interface TrendingCursor {
  rank: number;
  id: string;
}

// Extended BickWithAssets for search results
interface SearchBick extends BickWithAssets {
  search_rank?: number;
}
```

### Trending Score Formula

```
score = (play_count * 1.0 + share_count * 2.0) * decay_factor

where:
  decay_factor = 1 / (1 + days_since_published * 0.1)
  days_since_published = (NOW() - published_at) / (24 * 60 * 60 * 1000)
```

This formula:
- Weights shares 2x more than plays (shares indicate higher engagement)
- Applies time decay so recent content ranks higher
- A bick published 10 days ago has ~50% of the score of a same-engagement bick published today


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Search Returns Matching Bicks

*For any* search query and any set of bicks in the database, all returned bicks SHALL have either their title or description containing at least one word from the search query.

**Validates: Requirements 1.1**

### Property 2: Search Only Returns Live Bicks

*For any* search query, all returned bicks SHALL have status='live'.

**Validates: Requirements 1.2**

### Property 3: Search Results Ordered by Relevance

*For any* search query returning multiple results, the results SHALL be ordered such that each result's relevance score is greater than or equal to the next result's relevance score.

**Validates: Requirements 1.3**

### Property 4: Multi-Word Search Uses OR Logic

*For any* search query containing multiple words, a bick matching any single word from the query SHALL be included in the results.

**Validates: Requirements 1.4**

### Property 5: Pagination Cursor Behavior

*For any* search or trending query where total matching results exceed the limit, the response SHALL include a non-null cursor. When that cursor is used in a subsequent request, the returned results SHALL not overlap with the previous page.

**Validates: Requirements 1.5, 1.6, 4.3**

### Property 6: Trending Score Formula Correctness

*For any* live bick with play_count P, share_count S, and days_since_published D, the computed trending score SHALL equal (P * 1.0 + S * 2.0) * (1 / (1 + D * 0.1)) within floating-point tolerance.

**Validates: Requirements 3.1, 3.2**

### Property 7: Trending Only Includes Live Bicks

*For any* execution of the trending calculator, all entries in trending_scores SHALL correspond to bicks with status='live'.

**Validates: Requirements 3.3**

### Property 8: Trending Results Ordered by Score

*For any* trending query returning multiple results, the results SHALL be ordered such that each result's trending score is greater than or equal to the next result's trending score.

**Validates: Requirements 4.1**

### Property 9: API Limit Parameter Respected

*For any* search API request with a limit parameter, the number of returned bicks SHALL be at most min(limit, 50).

**Validates: Requirements 5.4**

### Property 10: API Response Shape

*For any* valid search API request, the response SHALL be a JSON object with exactly two keys: 'bicks' (array) and 'nextCursor' (string or null).

**Validates: Requirements 5.5**

### Property 11: API Rejects Long Queries

*For any* search API request where the 'q' parameter exceeds 200 characters, the response SHALL be a 400 status code.

**Validates: Requirements 5.7**

### Property 12: Trending Update Atomicity

*For any* trending calculator execution, either all live bicks have updated scores with the same computed_at timestamp, or no scores are updated (previous scores retained).

**Validates: Requirements 7.2**

## Error Handling

### Search API Errors

| Error Condition | HTTP Status | Response Body |
|-----------------|-------------|---------------|
| Missing 'q' parameter | 400 | `{ error: "Search query is required" }` |
| Empty 'q' parameter | 400 | `{ error: "Search query is required" }` |
| Query > 200 chars | 400 | `{ error: "Search query too long (max 200 characters)" }` |
| Invalid cursor | 400 | `{ error: "Invalid pagination cursor" }` |
| Invalid limit | 400 | `{ error: "Limit must be between 1 and 50" }` |
| Database error | 500 | `{ error: "Search failed" }` |

### Trending Calculator Errors

| Error Condition | Behavior |
|-----------------|----------|
| Database connection failure | Retry with exponential backoff, retain previous scores |
| Partial update failure | Rollback transaction, retain previous scores |
| Timeout | Log error, retry on next scheduled run |

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples and edge cases:

1. **Search Query Parsing**
   - Empty query handling
   - Special character escaping
   - Query length validation

2. **Cursor Encoding/Decoding**
   - Valid cursor round-trip
   - Invalid cursor rejection
   - Cursor with special characters

3. **Trending Score Calculation**
   - Zero play/share counts
   - Very old bicks (high decay)
   - Just-published bicks (no decay)

4. **API Route Validation**
   - Missing parameters
   - Invalid parameter types
   - Boundary values (limit=0, limit=51)

### Property-Based Tests

Property tests use Vitest with `fast-check` for randomized input generation. Each test runs minimum 100 iterations.

**Configuration:**
```typescript
import * as fc from 'fast-check';

// Run 100+ iterations per property
fc.configureGlobal({ numRuns: 100 });
```

**Test Tagging Format:**
```typescript
// Feature: search-trending, Property 1: Search Returns Matching Bicks
```

Property tests to implement:
- Property 1: Generate random bicks and queries, verify matches
- Property 2: Generate bicks with various statuses, verify only live returned
- Property 3: Verify relevance ordering for random queries
- Property 4: Generate multi-word queries, verify OR logic
- Property 5: Generate datasets larger than limit, verify pagination
- Property 6: Generate random play/share/date values, verify formula
- Property 7: Generate bicks with various statuses, verify trending filter
- Property 8: Verify trending score ordering
- Property 9: Generate random limit values, verify capping
- Property 10: Verify response shape for random valid requests
- Property 11: Generate queries of various lengths, verify rejection
- Property 12: Simulate failures, verify atomicity

### Integration Tests

1. **End-to-end search flow**
   - Create bicks → Search → Verify results

2. **Trending calculation flow**
   - Create bicks → Run calculator → Verify scores → Query trending

3. **Pagination flow**
   - Create many bicks → Paginate through all → Verify no duplicates/gaps
