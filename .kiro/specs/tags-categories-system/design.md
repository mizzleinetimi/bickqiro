# Design Document: Tags/Categories System

## Overview

The Tags/Categories System provides a comprehensive tagging infrastructure for Bickqr, enabling users to categorize, discover, and browse audio clips through tags. The system integrates with the existing upload flow, bick display components, and search functionality while maintaining SEO optimization through dedicated tag landing pages.

The design leverages the existing database schema (tags, bick_tags tables) and RLS policies, adding new API routes, UI components, and database functions to support tag autocomplete, count management, and owner-based editing.

## Architecture

```mermaid
graph TB
    subgraph "Frontend Components"
        TI[TagInput Component]
        TA[TagAutocomplete]
        TD[TagDisplay]
        PT[PopularTags]
    end
    
    subgraph "API Routes"
        AS[/api/tags/search]
        AP[/api/tags/popular]
        AU[/api/bicks/:id/tags]
    end
    
    subgraph "Database"
        T[(tags)]
        BT[(bick_tags)]
        B[(bicks)]
        TF[Tag Functions]
    end
    
    TI --> TA
    TA --> AS
    TI --> AU
    TD --> T
    PT --> AP
    
    AS --> T
    AP --> T
    AU --> BT
    AU --> TF
    
    TF --> T
    TF --> BT
    BT --> B
    BT --> T
```

## Components and Interfaces

### 1. TagInput Component

A reusable component for adding and managing tags, used in both upload flow and bick editing.

```typescript
// src/components/tags/TagInput.tsx

interface TagInputProps {
  /** Currently selected tags */
  value: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  maxTags = 10,
  disabled = false,
  placeholder = "Add tags..."
}: TagInputProps): JSX.Element;
```

### 2. TagAutocomplete Component

Provides tag suggestions as users type, querying the API for matching tags.

```typescript
// src/components/tags/TagAutocomplete.tsx

interface TagSuggestion {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

interface TagAutocompleteProps {
  /** Current input value */
  query: string;
  /** Callback when a suggestion is selected */
  onSelect: (tag: TagSuggestion) => void;
  /** Tags already selected (to exclude from suggestions) */
  excludeTags: string[];
  /** Whether the autocomplete is visible */
  isOpen: boolean;
  /** Callback to close the autocomplete */
  onClose: () => void;
}

export function TagAutocomplete({
  query,
  onSelect,
  excludeTags,
  isOpen,
  onClose
}: TagAutocompleteProps): JSX.Element | null;
```

### 3. TagDisplay Component

Renders tags as clickable links, used on bick cards and detail pages.

```typescript
// src/components/tags/TagDisplay.tsx

interface TagDisplayProps {
  /** Tags to display */
  tags: Array<{ name: string; slug: string }>;
  /** Maximum tags to show (rest shown as count) */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function TagDisplay({
  tags,
  maxVisible = 3,
  size = 'sm'
}: TagDisplayProps): JSX.Element | null;
```

### 4. PopularTags Component

Displays a grid of popular tags for discovery.

```typescript
// src/components/tags/PopularTags.tsx

interface PopularTagsProps {
  /** Maximum number of tags to display */
  limit?: number;
  /** Title for the section */
  title?: string;
}

export function PopularTags({
  limit = 12,
  title = "Popular Tags"
}: PopularTagsProps): Promise<JSX.Element | null>;
```

### 5. TagEditor Component

Modal or inline editor for managing tags on existing bicks.

```typescript
// src/components/tags/TagEditor.tsx

interface TagEditorProps {
  /** Bick ID */
  bickId: string;
  /** Current tags */
  currentTags: Array<{ name: string; slug: string }>;
  /** Callback when editing is complete */
  onSave: (tags: string[]) => Promise<void>;
  /** Callback to cancel editing */
  onCancel: () => void;
}

export function TagEditor({
  bickId,
  currentTags,
  onSave,
  onCancel
}: TagEditorProps): JSX.Element;
```

## API Routes

### GET /api/tags/search

Search for tags by prefix for autocomplete.

```typescript
// Request
GET /api/tags/search?q=fun&limit=10

// Response
{
  "success": true,
  "tags": [
    { "id": "uuid", "name": "funny", "slug": "funny", "bick_count": 42 },
    { "id": "uuid", "name": "fun-sounds", "slug": "fun-sounds", "bick_count": 15 }
  ]
}
```

### GET /api/tags/popular

Get popular tags ordered by bick_count.

```typescript
// Request
GET /api/tags/popular?limit=12

// Response
{
  "success": true,
  "tags": [
    { "id": "uuid", "name": "meme", "slug": "meme", "bick_count": 156 },
    { "id": "uuid", "name": "funny", "slug": "funny", "bick_count": 142 }
  ]
}
```

### PUT /api/bicks/[id]/tags

Update tags for a bick (owner only).

```typescript
// Request
PUT /api/bicks/abc123/tags
{
  "tags": ["funny", "meme", "viral"]
}

// Success Response
{
  "success": true,
  "tags": [
    { "id": "uuid", "name": "funny", "slug": "funny" },
    { "id": "uuid", "name": "meme", "slug": "meme" },
    { "id": "uuid", "name": "viral", "slug": "viral" }
  ]
}

// Error Response (401)
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}

// Error Response (403)
{
  "success": false,
  "error": "You do not own this bick",
  "code": "FORBIDDEN"
}
```

## Data Models

### Database Schema (Existing)

The tags and bick_tags tables already exist in the database:

```sql
-- tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    bick_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- bick_tags junction table
CREATE TABLE bick_tags (
    bick_id UUID NOT NULL REFERENCES bicks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (bick_id, tag_id)
);
```

### New Database Functions

```sql
-- Function to update tag counts when bick_tags change
CREATE OR REPLACE FUNCTION update_tag_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET bick_count = bick_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET bick_count = bick_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bick_tags changes
CREATE TRIGGER bick_tags_count_trigger
    AFTER INSERT OR DELETE ON bick_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_count();

-- Function to search tags by prefix
CREATE OR REPLACE FUNCTION search_tags(
    search_prefix TEXT,
    exclude_slugs TEXT[] DEFAULT '{}',
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    bick_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.slug, t.bick_count
    FROM tags t
    WHERE t.slug LIKE search_prefix || '%'
      AND NOT (t.slug = ANY(exclude_slugs))
    ORDER BY t.bick_count DESC, t.name ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create tag
CREATE OR REPLACE FUNCTION get_or_create_tag(
    tag_name TEXT,
    tag_slug TEXT
)
RETURNS UUID AS $$
DECLARE
    tag_id UUID;
BEGIN
    -- Try to get existing tag
    SELECT id INTO tag_id FROM tags WHERE slug = tag_slug;
    
    -- Create if not exists
    IF tag_id IS NULL THEN
        INSERT INTO tags (name, slug) VALUES (tag_name, tag_slug)
        RETURNING id INTO tag_id;
    END IF;
    
    RETURN tag_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update bick tags atomically
CREATE OR REPLACE FUNCTION update_bick_tags(
    p_bick_id UUID,
    p_tag_names TEXT[]
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT
) AS $$
DECLARE
    tag_name TEXT;
    tag_slug TEXT;
    tag_id UUID;
BEGIN
    -- Delete existing tags for this bick
    DELETE FROM bick_tags WHERE bick_id = p_bick_id;
    
    -- Add new tags
    FOREACH tag_name IN ARRAY p_tag_names
    LOOP
        tag_slug := lower(tag_name);
        tag_id := get_or_create_tag(tag_name, tag_slug);
        
        INSERT INTO bick_tags (bick_id, tag_id) VALUES (p_bick_id, tag_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Return the updated tags
    RETURN QUERY
    SELECT t.id, t.name, t.slug
    FROM tags t
    JOIN bick_tags bt ON bt.tag_id = t.id
    WHERE bt.bick_id = p_bick_id;
END;
$$ LANGUAGE plpgsql;
```

### TypeScript Types

```typescript
// src/types/tags.ts

export interface TagSuggestion {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

export interface TagSearchResponse {
  success: true;
  tags: TagSuggestion[];
}

export interface TagUpdateRequest {
  tags: string[];
}

export interface TagUpdateResponse {
  success: true;
  tags: Array<{ id: string; name: string; slug: string }>;
}

export interface TagErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR';
}
```

## Query Functions

```typescript
// src/lib/supabase/queries.ts (additions)

/**
 * Search tags by prefix for autocomplete
 */
export async function searchTags(
  prefix: string,
  excludeSlugs: string[] = [],
  limit: number = 10
): Promise<TagSuggestion[]>;

/**
 * Get popular tags ordered by bick_count
 */
export async function getPopularTags(
  limit: number = 12
): Promise<TagSuggestion[]>;

/**
 * Get tags for a specific bick
 */
export async function getBickTags(
  bickId: string
): Promise<Array<{ id: string; name: string; slug: string }>>;

/**
 * Update tags for a bick (uses RPC function)
 */
export async function updateBickTags(
  bickId: string,
  tagNames: string[]
): Promise<Array<{ id: string; name: string; slug: string }>>;
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tag Addition to Selected List

*For any* valid tag string (alphanumeric and hyphens only) and any tag list with fewer than 10 tags, adding the tag via Enter key, Add button, or suggestion click SHALL result in the tag appearing in the selected list exactly once.

**Validates: Requirements 1.3, 3.3**

### Property 2: Invalid Tag Rejection

*For any* string containing characters other than alphanumeric characters and hyphens, attempting to add it as a tag SHALL be rejected and the tag list SHALL remain unchanged.

**Validates: Requirements 1.4, 9.6**

### Property 3: Tag Removal from List

*For any* tag in the selected tags list, clicking the remove button SHALL result in that tag being removed from the list and the list length decreasing by exactly one.

**Validates: Requirements 1.6**

### Property 4: Tag Persistence on Upload

*For any* set of valid tags submitted during upload, querying the bick's tags after upload completion SHALL return all submitted tags.

**Validates: Requirements 1.7**

### Property 5: Tag Editor Pre-population

*For any* bick with associated tags, opening the tag editor SHALL display all currently associated tags in the selected list.

**Validates: Requirements 2.2**

### Property 6: Tag Update Persistence

*For any* bick owned by the authenticated user and any valid set of tags, saving tag changes SHALL result in the bick's tags matching exactly the saved set.

**Validates: Requirements 2.3**

### Property 7: Autocomplete Suggestions Match Prefix

*For any* input string of 2 or more characters, all returned autocomplete suggestions SHALL have slugs that start with the lowercase input string.

**Validates: Requirements 1.2, 3.1**

### Property 8: Autocomplete Ordering by Count

*For any* autocomplete query returning multiple results, the results SHALL be ordered by bick_count in descending order.

**Validates: Requirements 3.2**

### Property 9: Tag Display Limit on Cards

*For any* bick with tags displayed on a card, at most 3 tags SHALL be visible, with remaining tags indicated by a count.

**Validates: Requirements 4.1, 4.2**

### Property 10: Tag Navigation Links

*For any* displayed tag (on cards, detail pages, popular tags, or search results), the tag SHALL link to `/tag/{slug}` where slug is the tag's slug.

**Validates: Requirements 4.3, 5.2, 6.3, 7.3**

### Property 11: All Tags Displayed on Detail Page

*For any* bick viewed on its detail page, all associated tags SHALL be displayed.

**Validates: Requirements 5.1**

### Property 12: Popular Tags Ordering

*For any* popular tags query, the returned tags SHALL be ordered by bick_count in descending order and limited to the specified count.

**Validates: Requirements 6.1, 6.2**

### Property 13: Tag Count Increment on Addition

*For any* tag added to a bick, that tag's bick_count SHALL increase by exactly 1.

**Validates: Requirements 8.1**

### Property 14: Tag Count Decrement on Removal

*For any* tag removed from a bick, that tag's bick_count SHALL decrease by exactly 1.

**Validates: Requirements 8.2**

### Property 15: Tag Count Cascade on Bick Deletion

*For any* bick with N associated tags that is deleted, each of those N tags SHALL have their bick_count decreased by exactly 1.

**Validates: Requirements 8.3**

### Property 16: Authentication Required for Tag Update

*For any* unauthenticated request to the tag update endpoint, the response SHALL be a 401 status code.

**Validates: Requirements 9.4**

### Property 17: Authorization Required for Tag Update

*For any* authenticated request to update tags on a bick not owned by the requester, the response SHALL be a 403 status code.

**Validates: Requirements 9.5**

## Error Handling

### Client-Side Errors

| Error Condition | Handling | User Feedback |
|-----------------|----------|---------------|
| Invalid tag format | Prevent addition, show inline error | "Tags can only contain letters, numbers, and hyphens" |
| Tag limit exceeded | Prevent addition, show limit message | "Maximum 10 tags allowed" |
| Duplicate tag | Silently ignore, no error | None (tag already in list) |
| Network error on autocomplete | Show cached results or empty | "Unable to load suggestions" |
| Network error on save | Show retry option | "Failed to save tags. Please try again." |

### Server-Side Errors

| Error Condition | HTTP Status | Response Code | Message |
|-----------------|-------------|---------------|---------|
| Unauthenticated request | 401 | UNAUTHORIZED | "Authentication required" |
| Non-owner update attempt | 403 | FORBIDDEN | "You do not own this bick" |
| Bick not found | 404 | NOT_FOUND | "Bick not found" |
| Invalid tag format | 400 | VALIDATION_ERROR | "Invalid tag format: {tag}" |
| Too many tags | 400 | VALIDATION_ERROR | "Maximum 10 tags allowed" |
| Database error | 500 | DATABASE_ERROR | "Failed to update tags" |

### Database Error Recovery

- Tag count triggers use `ON CONFLICT DO NOTHING` for idempotency
- `update_bick_tags` function is atomic (all-or-nothing)
- Failed tag creation does not prevent bick creation
- Orphaned tags (bick_count = 0) are retained for future use

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples, edge cases, and component behavior:

1. **TagInput Component**
   - Renders with placeholder text
   - Adds valid tag on Enter key
   - Adds valid tag on Add button click
   - Shows error for invalid characters
   - Prevents addition at 10 tag limit
   - Removes tag on remove button click
   - Handles empty input gracefully

2. **TagAutocomplete Component**
   - Does not query for input < 2 characters
   - Displays suggestions when available
   - Shows "create new tag" message when no matches
   - Keyboard navigation works correctly
   - Closes on outside click

3. **TagDisplay Component**
   - Renders nothing for empty tags array
   - Shows up to 3 tags on cards
   - Shows overflow count for > 3 tags
   - All tags visible on detail page variant
   - Tags link to correct URLs

4. **PopularTags Component**
   - Renders nothing when no tags with count > 0
   - Shows tags ordered by count
   - Limits to specified count

5. **API Validation**
   - Rejects invalid tag formats
   - Rejects > 10 tags
   - Returns 401 for unauthenticated requests
   - Returns 403 for non-owner requests

### Property-Based Tests

Property-based tests validate universal properties across many generated inputs. Each test runs minimum 100 iterations.

**Testing Framework:** Vitest with fast-check for property-based testing

1. **Property 1: Tag Addition** - Feature: tags-categories-system, Property 1
   - Generate random valid tag strings
   - Verify addition to list succeeds

2. **Property 2: Invalid Tag Rejection** - Feature: tags-categories-system, Property 2
   - Generate strings with invalid characters
   - Verify rejection

3. **Property 7: Autocomplete Prefix Matching** - Feature: tags-categories-system, Property 7
   - Generate random prefixes and tag databases
   - Verify all results match prefix

4. **Property 8: Autocomplete Ordering** - Feature: tags-categories-system, Property 8
   - Generate random tag databases with varying counts
   - Verify descending order by count

5. **Property 12: Popular Tags Ordering** - Feature: tags-categories-system, Property 12
   - Generate random tag databases
   - Verify ordering and limit

6. **Property 13: Tag Count Increment** - Feature: tags-categories-system, Property 13
   - Generate random bick-tag additions
   - Verify count increases by 1

7. **Property 14: Tag Count Decrement** - Feature: tags-categories-system, Property 14
   - Generate random bick-tag removals
   - Verify count decreases by 1

8. **Property 16: Authentication Check** - Feature: tags-categories-system, Property 16
   - Generate random unauthenticated requests
   - Verify 401 response

9. **Property 17: Authorization Check** - Feature: tags-categories-system, Property 17
   - Generate random non-owner requests
   - Verify 403 response

### Integration Tests

1. **Upload Flow with Tags**
   - Complete upload with tags
   - Verify tags appear on bick detail page
   - Verify tag counts updated

2. **Tag Editing Flow**
   - Load bick with existing tags
   - Modify tags and save
   - Verify changes persisted

3. **Tag Page Navigation**
   - Click tag on bick card
   - Verify navigation to tag page
   - Verify bicks with that tag displayed

4. **Popular Tags Display**
   - Create bicks with various tags
   - Verify popular tags section shows correct tags
   - Verify ordering by count
