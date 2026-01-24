# Requirements Document

## Introduction

This document defines the requirements for the foundational data model and Supabase setup for Bickqr, an SEO-first library of short audio clips ("bicks"). The data model establishes the core database schema including tables, relationships, Row Level Security (RLS) policies, indexes, and SQL migrations that will support all subsequent features of the platform.

## Glossary

- **Bick**: A short audio clip uploaded to the platform, the core content unit
- **Profile**: A user account linked to Supabase Auth, representing a bick creator or consumer
- **Bick_Asset**: A media file associated with a bick (original audio, processed audio, waveform, OG image, teaser video)
- **Tag**: A keyword label used to categorize and discover bicks
- **Report**: A user-submitted flag indicating potentially inappropriate content
- **RLS**: Row Level Security, Supabase/Postgres feature that restricts data access at the row level
- **Migration**: A versioned SQL file that applies schema changes to the database
- **Service_Role**: A privileged Supabase role that bypasses RLS for administrative operations
- **Live_Status**: A bick status indicating the content is published and publicly accessible
- **Processing_Status**: A bick status indicating the content is being processed and not yet public
- **FTS**: Full-Text Search, Postgres feature for efficient text searching

## Requirements

### Requirement 1: SQL Migration Infrastructure

**User Story:** As a developer, I want SQL migrations in the repo so that I can version control and apply schema changes consistently across environments.

#### Acceptance Criteria

1. THE Migration_System SHALL store all SQL migrations in the `supabase/migrations/` directory
2. WHEN a migration file is created, THE Migration_System SHALL use the naming convention `NNNN_description.sql` where NNNN is a sequential number
3. WHEN `supabase db push` is executed on a fresh database, THE Migration_System SHALL apply all migrations without errors
4. THE Migration_System SHALL include a `supabase/config.toml` configuration file for local development

### Requirement 2: Profiles Table

**User Story:** As a system, I need a profiles table to store user account information linked to Supabase Auth.

#### Acceptance Criteria

1. THE Database SHALL create a `profiles` table with columns: id (uuid, PK, references auth.users), username (text, unique, not null), display_name (text), avatar_url (text), created_at (timestamptz), updated_at (timestamptz)
2. WHEN a profile is queried, THE RLS_Policy SHALL allow public read access to all profiles
3. WHEN a profile is updated, THE RLS_Policy SHALL only allow the profile owner to update their own record
4. THE Database SHALL create an index on `profiles.id` for efficient lookups

### Requirement 3: Bicks Table

**User Story:** As a system, I need a bicks table to store audio clip metadata with proper status tracking and ownership.

#### Acceptance Criteria

1. THE Database SHALL create a `bicks` table with columns: id (uuid, PK, default gen_random_uuid()), owner_id (uuid, FK to profiles, not null), slug (text, not null), title (text, not null), description (text), status (text with check constraint for processing|live|failed|removed, default processing), duration_ms (integer), play_count (integer, default 0), share_count (integer, default 0), original_filename (text), created_at (timestamptz), updated_at (timestamptz), published_at (timestamptz)
2. THE Database SHALL enforce a unique constraint on the combination of id and slug for URL generation
3. THE Database SHALL create indexes on: id, slug, owner_id, status, created_at, published_at
4. THE Database SHALL create a GIN index on title for full-text search capability
5. WHEN a bick is queried by a public user, THE RLS_Policy SHALL only return bicks where status equals 'live'
6. WHEN an authenticated user inserts a bick, THE RLS_Policy SHALL allow insertion only if owner_id matches the authenticated user's id
7. WHEN a bick owner updates their bick, THE RLS_Policy SHALL allow updates only to title, description, and related tags

### Requirement 4: Bick Assets Table

**User Story:** As a system, I need a bick_assets table to store references to all media files associated with each bick.

#### Acceptance Criteria

1. THE Database SHALL create a `bick_assets` table with columns: id (uuid, PK), bick_id (uuid, FK to bicks, not null), asset_type (text with check constraint for original|audio|waveform_json|og_image|teaser_mp4|thumbnail), storage_key (text), cdn_url (text), mime_type (text), size_bytes (integer), metadata (jsonb), created_at (timestamptz)
2. THE Database SHALL create indexes on bick_id and asset_type for efficient lookups
3. WHEN bick assets are queried, THE RLS_Policy SHALL only return assets for bicks where status equals 'live'

### Requirement 5: Tags Table

**User Story:** As a system, I need a tags table to store unique tag labels for categorizing bicks.

#### Acceptance Criteria

1. THE Database SHALL create a `tags` table with columns: id (uuid, PK), name (text, unique, not null, lowercase), slug (text, unique, not null), bick_count (integer, default 0), created_at (timestamptz)
2. THE Database SHALL create indexes on name and slug for efficient lookups
3. WHEN tags are queried, THE RLS_Policy SHALL allow public read access to all tags

### Requirement 6: Bick Tags Junction Table

**User Story:** As a system, I need a bick_tags junction table to associate bicks with multiple tags.

#### Acceptance Criteria

1. THE Database SHALL create a `bick_tags` table with columns: bick_id (uuid, FK to bicks), tag_id (uuid, FK to tags), with PRIMARY KEY on (bick_id, tag_id)
2. THE Database SHALL create indexes on bick_id and tag_id for efficient lookups
3. WHEN bick_tags are queried, THE RLS_Policy SHALL only return associations for bicks where status equals 'live'

### Requirement 7: Reports Table

**User Story:** As a user, I want to submit reports for inappropriate content, and as a system, reports should not be publicly readable.

#### Acceptance Criteria

1. THE Database SHALL create a `reports` table with columns: id (uuid, PK), bick_id (uuid, FK to bicks, not null), reporter_id (uuid, FK to profiles, nullable for anonymous), reason (text, not null), details (text), status (text with check constraint for pending|reviewed|dismissed, default pending), created_at (timestamptz)
2. THE Database SHALL create indexes on bick_id and status for efficient lookups
3. WHEN a report is inserted, THE RLS_Policy SHALL allow any user (authenticated or anonymous) to insert a report
4. WHEN reports are queried, THE RLS_Policy SHALL block all public read access (service role only)

### Requirement 8: Full-Text Search

**User Story:** As a user, I want to search for bicks by title so that I can discover relevant content quickly.

#### Acceptance Criteria

1. THE Database SHALL create a tsvector column on the bicks table for full-text search on title
2. THE Database SHALL create a GIN index on the tsvector column for efficient FTS queries
3. WHEN a full-text search query is executed, THE Database SHALL return matching bicks ordered by relevance

### Requirement 9: Timestamp Management

**User Story:** As a system, I need automatic timestamp management for audit trails and data integrity.

#### Acceptance Criteria

1. THE Database SHALL automatically set created_at to the current timestamp on row insertion for all tables
2. THE Database SHALL automatically update updated_at to the current timestamp on row modification for profiles and bicks tables
3. WHEN a bick status changes to 'live', THE Database SHALL set published_at to the current timestamp
