# Requirements Document

## Introduction

This document defines the requirements for implementing public SEO pages and internal linking for Bickqr. The feature creates SSR/SSG public pages with proper SEO metadata, Open Graph tags, Twitter Cards, JSON-LD structured data, and internal linking. All public pages render metadata on first request without client-side JavaScript dependency.

## Glossary

- **Bick**: A short audio clip stored in the Bickqr platform
- **Bick_Page**: The individual page displaying a single bick at `/bick/[slug]-[id]`
- **Tag_Page**: A landing page displaying bicks associated with a specific tag at `/tag/[tag]`
- **Embed_Page**: A minimal player page for iframe embeds at `/embed/bick/[id]`
- **OG_Tags**: Open Graph meta tags for rich social media previews
- **Twitter_Cards**: Twitter-specific meta tags for rich link previews
- **JSON_LD**: Structured data in JSON-LD format for search engine understanding
- **Sitemap**: An XML file listing all indexable URLs for search engines
- **Robots_Txt**: A text file instructing search engine crawlers on access rules
- **SSR**: Server-Side Rendering where HTML is generated on each request
- **Canonical_URL**: The authoritative URL for a page to prevent duplicate content issues
- **Cursor_Pagination**: A pagination method using a cursor token instead of page offsets

## Requirements

### Requirement 1: Individual Bick Page

**User Story:** As a visitor, I want to view individual bick pages at `/bick/[slug]-[id]` with full metadata so search engines can index them.

#### Acceptance Criteria

1. WHEN a visitor requests `/bick/[slug]-[id]` for a live bick, THE Bick_Page SHALL return HTTP 200 with the bick content and metadata
2. WHEN a visitor requests `/bick/[slug]-[id]` for a non-existent bick, THE Bick_Page SHALL return HTTP 404
3. WHEN a visitor requests `/bick/[slug]-[id]` for a non-live bick (status != 'live'), THE Bick_Page SHALL return HTTP 404
4. THE Bick_Page SHALL parse the slug and id from the URL parameter in format `[slug]-[id]`
5. THE Bick_Page SHALL fetch the bick with its associated assets from the database
6. THE Bick_Page SHALL render the page using SSR with all metadata in the initial HTML response

### Requirement 2: Bick Page Metadata

**User Story:** As a search engine, I want bick pages to have complete metadata so I can properly index and display them in search results.

#### Acceptance Criteria

1. THE Bick_Page SHALL include a `<title>` tag in format `{bick.title} | Bickqr`
2. THE Bick_Page SHALL include a `<meta name="description">` tag with the bick description or fallback text
3. THE Bick_Page SHALL include a `<link rel="canonical">` tag with the absolute URL
4. THE Bick_Page SHALL include OG_Tags: og:title, og:description, og:url, og:type (music.song), og:image, og:site_name
5. THE Bick_Page SHALL include Twitter_Cards: twitter:card, twitter:title, twitter:description, twitter:image
6. IF the bick has a teaser_mp4 asset, THEN THE Bick_Page SHALL set twitter:card to 'player' and include twitter:player URL
7. IF the bick status is 'live', THEN THE Bick_Page SHALL set robots meta to 'index,follow'
8. IF the bick status is not 'live', THEN THE Bick_Page SHALL set robots meta to 'noindex,follow'

### Requirement 3: Bick Page JSON-LD

**User Story:** As a search engine, I want structured data on bick pages so I can understand the audio content and display rich results.

#### Acceptance Criteria

1. THE Bick_Page SHALL include a JSON_LD script tag with @type "AudioObject"
2. THE JSON_LD SHALL include the name property set to the bick title
3. THE JSON_LD SHALL include the description property set to the bick description
4. THE JSON_LD SHALL include the contentUrl property set to the audio CDN URL
5. THE JSON_LD SHALL include the encodingFormat property set to the audio MIME type
6. THE JSON_LD SHALL include the duration property in ISO 8601 format (e.g., PT0M5S)
7. THE JSON_LD SHALL include the uploadDate property in ISO 8601 date format
8. THE JSON_LD SHALL include the thumbnailUrl property set to the OG image URL

### Requirement 4: Tag Landing Page

**User Story:** As a visitor, I want to browse bicks by tag at `/tag/[tag]` to discover related content.

#### Acceptance Criteria

1. WHEN a visitor requests `/tag/[tag]` for an existing tag, THE Tag_Page SHALL return HTTP 200 with paginated bicks
2. WHEN a visitor requests `/tag/[tag]` for a non-existent tag, THE Tag_Page SHALL return HTTP 404
3. THE Tag_Page SHALL fetch the tag details by slug from the database
4. THE Tag_Page SHALL fetch live bicks associated with the tag using Cursor_Pagination
5. THE Tag_Page SHALL include a `<title>` tag in format `{tag.name} Sounds | Bickqr`
6. THE Tag_Page SHALL include a `<meta name="description">` tag describing the tag content
7. THE Tag_Page SHALL include a `<link rel="canonical">` tag with the absolute URL
8. THE Tag_Page SHALL include OG_Tags for social sharing
9. THE Tag_Page SHALL render using SSR with all metadata in the initial HTML response

### Requirement 5: Embed Player Page

**User Story:** As a content embedder, I want a minimal player page at `/embed/bick/[id]` for iframe embeds.

#### Acceptance Criteria

1. WHEN a visitor requests `/embed/bick/[id]` for a live bick, THE Embed_Page SHALL return HTTP 200 with a minimal player
2. WHEN a visitor requests `/embed/bick/[id]` for a non-existent or non-live bick, THE Embed_Page SHALL return HTTP 404
3. THE Embed_Page SHALL render minimal HTML without navigation or site chrome
4. THE Embed_Page SHALL include only an audio/video player component
5. THE Embed_Page SHALL include twitter:player meta tags for Twitter player card support
6. THE Embed_Page SHALL include twitter:player:width and twitter:player:height meta tags
7. THE Embed_Page SHALL support responsive sizing for different embed contexts

### Requirement 6: Robots.txt

**User Story:** As a search engine crawler, I want a robots.txt file so I know which parts of the site to crawl.

#### Acceptance Criteria

1. WHEN a crawler requests `/robots.txt`, THE system SHALL return a valid robots.txt file
2. THE Robots_Txt SHALL allow all crawlers access to the root path
3. THE Robots_Txt SHALL disallow access to `/api/` paths
4. THE Robots_Txt SHALL disallow access to `/search` paths
5. THE Robots_Txt SHALL include the sitemap URL pointing to `/sitemap.xml`

### Requirement 7: Sitemap

**User Story:** As a search engine, I want a sitemap.xml that lists all indexable content so I can discover and crawl pages efficiently.

#### Acceptance Criteria

1. WHEN a crawler requests `/sitemap.xml`, THE system SHALL return a valid XML sitemap
2. THE Sitemap SHALL include only bicks with status 'live'
3. THE Sitemap SHALL include all tags that have associated live bicks
4. THE Sitemap SHALL include a `<lastmod>` element for each URL based on updated_at or published_at
5. THE Sitemap SHALL use Cursor_Pagination internally to handle large datasets efficiently
6. THE Sitemap SHALL NOT include bicks with status other than 'live'

### Requirement 8: Data Fetching Functions

**User Story:** As a developer, I want reusable data fetching functions so I can efficiently query bicks and tags across pages.

#### Acceptance Criteria

1. THE system SHALL provide a `getBickBySlugAndId(slug, id)` function that returns a bick with its assets
2. THE system SHALL provide a `getBicksByTag(tagSlug, cursor, limit)` function that returns paginated bicks for a tag
3. THE system SHALL provide a `getTagBySlug(slug)` function that returns tag details
4. THE system SHALL provide a `getLiveBicksForSitemap(cursor, limit)` function for sitemap generation
5. THE system SHALL provide a `getAllTags()` function that returns all tags
6. WHEN fetching bicks for public pages, THE functions SHALL only return bicks with status 'live'
7. THE pagination functions SHALL return a cursor for the next page when more results exist

### Requirement 9: UI Components

**User Story:** As a developer, I want reusable UI components for displaying bicks so I can maintain consistency across pages.

#### Acceptance Criteria

1. THE system SHALL provide a BickPlayer component that displays audio playback controls
2. THE system SHALL provide a BickCard component that displays bick summary information
3. THE system SHALL provide a BickJsonLd component that renders the JSON-LD script tag
4. THE BickPlayer component SHALL display a placeholder UI (actual playback is out of scope)
5. THE BickCard component SHALL display the bick title, description, and duration
6. THE BickCard component SHALL link to the individual bick page
