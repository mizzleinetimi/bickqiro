# Implementation Plan: Public SEO Pages

## Overview

This implementation plan creates SSR public pages with complete SEO metadata for Bickqr. The implementation follows Next.js 14+ App Router conventions with TypeScript. Tasks are ordered to build foundational components first, then pages, then route handlers.

## Tasks

- [-] 1. Create data fetching functions
  - [x] 1.1 Create `src/lib/supabase/queries.ts` with getBickBySlugAndId function
    - Fetch bick with assets by slug and id
    - Filter by status='live'
    - Return null if not found
    - _Requirements: 8.1, 8.6_
  
  - [x] 1.2 Add getBickById function for embed page
    - Fetch bick with assets by id only
    - Filter by status='live'
    - _Requirements: 8.1, 8.6_
  
  - [x] 1.3 Add getTagBySlug function
    - Fetch tag details by slug
    - Return null if not found
    - _Requirements: 8.3_
  
  - [x] 1.4 Add getBicksByTag function with cursor pagination
    - Fetch live bicks for a tag
    - Implement cursor-based pagination
    - Return bicks array and nextCursor
    - _Requirements: 8.2, 8.6, 8.7_
  
  - [x] 1.5 Add getLiveBicksForSitemap function
    - Fetch live bicks with minimal fields (id, slug, updated_at)
    - Implement cursor pagination for large datasets
    - _Requirements: 8.4, 8.6, 8.7_
  
  - [x] 1.6 Add getAllTags function
    - Fetch all tags with bick_count > 0
    - _Requirements: 8.5_
  
  - [x] 1.7 Write property tests for query functions
    - **Property 15: Query Function Live Status Filter**
    - **Property 16: Pagination Cursor Correctness**
    - **Validates: Requirements 8.6, 8.7**

- [x] 2. Create UI components
  - [x] 2.1 Create `src/components/bick/BickCard.tsx`
    - Display bick title, description, duration
    - Link to individual bick page
    - Format duration from milliseconds
    - _Requirements: 9.2, 9.5, 9.6_
  
  - [x] 2.2 Create `src/components/bick/BickPlayer.tsx`
    - Placeholder audio player UI
    - Play button, waveform placeholder, duration display
    - Support minimal mode for embeds
    - _Requirements: 9.1, 9.4_
  
  - [x] 2.3 Create `src/components/bick/BickJsonLd.tsx`
    - Render JSON-LD script tag with AudioObject schema
    - Include all required fields: name, description, contentUrl, duration, uploadDate, thumbnailUrl
    - Format duration as ISO 8601
    - _Requirements: 9.3, 3.1-3.8_
  
  - [x] 2.4 Write property tests for BickCard and BickJsonLd
    - **Property 17: BickCard Content and Link**
    - **Property 18: BickJsonLd Valid JSON**
    - **Validates: Requirements 9.3, 9.5, 9.6**

- [x] 3. Checkpoint - Verify components and queries
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Create URL parsing utility
  - [x] 4.1 Create parseSlugId function in `src/lib/utils/url.ts`
    - Parse `[slug]-[uuid]` format from URL parameter
    - Return { slug, id } or null for invalid format
    - Handle UUID format with hyphens
    - _Requirements: 1.4_
  
  - [x] 4.2 Write property tests for URL parsing
    - **Property 2: Bick Page URL Parsing**
    - **Validates: Requirements 1.4**

- [x] 5. Create individual bick page
  - [x] 5.1 Create `src/app/bick/[slugId]/page.tsx`
    - Parse slug and id from URL parameter
    - Fetch bick with assets using getBickBySlugAndId
    - Return 404 if not found or not live
    - Render BickPlayer and BickJsonLd components
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_
  
  - [x] 5.2 Implement generateMetadata for bick page
    - Set title as `{bick.title} | Bickqr`
    - Set description from bick or fallback
    - Set canonical URL
    - Set OG tags: title, description, url, type, image, site_name
    - Set Twitter card tags with player support for teaser_mp4
    - Set robots based on status
    - _Requirements: 2.1-2.8_
  
  - [x] 5.3 Write property tests for bick page
    - **Property 1: Bick Page Access Control**
    - **Property 3: Bick Page Metadata Completeness**
    - **Property 4: Bick Page Twitter Card Metadata**
    - **Property 5: Bick Page JSON-LD Completeness**
    - **Validates: Requirements 1.1-1.6, 2.1-2.8, 3.1-3.8**

- [x] 6. Create tag landing page
  - [x] 6.1 Create `src/app/tag/[tag]/page.tsx`
    - Fetch tag by slug using getTagBySlug
    - Return 404 if tag not found
    - Fetch paginated bicks using getBicksByTag
    - Render BickCard grid with pagination
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.2 Implement generateMetadata for tag page
    - Set title as `{tag.name} Sounds | Bickqr`
    - Set description with tag name and bick count
    - Set canonical URL
    - Set OG tags for social sharing
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.9_
  
  - [x] 6.3 Write property tests for tag page
    - **Property 7: Tag Page Access Control**
    - **Property 8: Tag Page Metadata Completeness**
    - **Property 9: Tag Page Pagination Correctness**
    - **Validates: Requirements 4.1-4.9**

- [x] 7. Checkpoint - Verify bick and tag pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create embed player page
  - [x] 8.1 Create `src/app/embed/bick/[id]/page.tsx`
    - Fetch bick by id using getBickById
    - Return 404 if not found or not live
    - Render minimal BickPlayer without navigation
    - Use custom layout without NavShell
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 8.2 Implement generateMetadata for embed page
    - Set Twitter player card metadata
    - Include player URL, width, height
    - Set robots to noindex
    - _Requirements: 5.5, 5.6_
  
  - [x] 8.3 Write property tests for embed page
    - **Property 10: Embed Page Access Control**
    - **Property 11: Embed Page Twitter Player Metadata**
    - **Validates: Requirements 5.1-5.6**

- [x] 9. Create robots.txt route handler
  - [x] 9.1 Create `src/app/robots.txt/route.ts`
    - Return valid robots.txt content
    - Allow root path for all crawlers
    - Disallow /api/ and /search paths
    - Include sitemap URL
    - Set appropriate cache headers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 9.2 Write unit tests for robots.txt
    - Verify content includes required directives
    - **Validates: Requirements 6.1-6.5**

- [x] 10. Create sitemap.xml route handler
  - [x] 10.1 Create `src/app/sitemap.xml/route.ts`
    - Fetch all live bicks using getLiveBicksForSitemap with pagination
    - Fetch all tags using getAllTags
    - Generate valid XML sitemap
    - Include lastmod for all URLs
    - Set appropriate cache headers
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 10.2 Write property tests for sitemap
    - **Property 12: Sitemap Live Bicks Only**
    - **Property 13: Sitemap Tags Inclusion**
    - **Property 14: Sitemap Lastmod Presence**
    - **Validates: Requirements 7.1-7.4**

- [x] 11. Create duration formatting utility
  - [x] 11.1 Create formatIsoDuration function in `src/lib/utils/duration.ts`
    - Convert milliseconds to ISO 8601 duration format (PT#M#S)
    - Handle edge cases (0, large values)
    - _Requirements: 3.6_
  
  - [x] 11.2 Write property tests for duration formatting
    - **Property 6: Duration ISO 8601 Format**
    - **Validates: Requirements 3.6**

- [x] 12. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify bick page renders with all metadata (view-source)
  - Verify tag page shows paginated bicks
  - Verify embed page renders minimal player
  - Verify robots.txt and sitemap.xml output
  - Test 404 responses for non-live bicks

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All pages use SSR to ensure metadata is in initial HTML response
