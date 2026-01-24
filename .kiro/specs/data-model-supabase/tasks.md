# Implementation Plan: Data Model Supabase

## Overview

This implementation plan creates the foundational database schema for Bickqr using Supabase Postgres. The approach is migration-first: we create the SQL migration file, then add TypeScript types, and finally implement tests to verify the schema and RLS policies work correctly.

## Tasks

- [x] 1. Set up Supabase project structure
  - [x] 1.1 Create `supabase/config.toml` with project configuration
    - Configure project ID placeholder
    - Set up local development settings
    - _Requirements: 1.4_
  - [x] 1.2 Create `supabase/migrations/` directory structure
    - Establish migration file location
    - _Requirements: 1.1_

- [x] 2. Create initial database migration
  - [x] 2.1 Create `supabase/migrations/0001_init.sql` with all tables
    - Create profiles table with columns and constraints
    - Create bicks table with columns, constraints, and tsvector column
    - Create bick_assets table with columns and constraints
    - Create tags table with columns and constraints
    - Create bick_tags junction table with composite primary key
    - Create reports table with columns and constraints
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_
  - [x] 2.2 Add all indexes to the migration
    - Create B-tree indexes for lookups and filtering
    - Create GIN index for full-text search
    - _Requirements: 2.4, 3.3, 3.4, 4.2, 5.2, 6.2, 7.2, 8.2_
  - [x] 2.3 Add trigger functions for timestamp management
    - Create update_updated_at() function
    - Create set_published_at() function
    - Attach triggers to profiles and bicks tables
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.4 Add RLS policies for all tables
    - Enable RLS on all tables
    - Create profiles policies (public read, owner update)
    - Create bicks policies (live read, auth insert, owner update)
    - Create bick_assets policies (live bick read)
    - Create tags policies (public read)
    - Create bick_tags policies (live bick read)
    - Create reports policies (insert only, no read)
    - _Requirements: 2.2, 2.3, 3.5, 3.6, 3.7, 4.3, 5.3, 6.3, 7.3, 7.4_

- [x] 3. Checkpoint - Verify migration applies cleanly
  - Ensure migration can be applied to a fresh database without errors
  - Ask the user if questions arise

- [x] 4. Create TypeScript types
  - [x] 4.1 Create `src/types/database.types.ts` with all entity types
    - Define BickStatus, AssetType, ReportStatus enums
    - Define Profile, Bick, BickAsset, Tag, BickTag, Report interfaces
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 5. Create Supabase client utilities
  - [x] 5.1 Create `src/lib/supabase/client.ts` for browser client
    - Initialize Supabase client with anon key
    - Export typed client
    - _Requirements: 2.2, 3.5_
  - [x] 5.2 Create `src/lib/supabase/server.ts` for server-side client
    - Initialize Supabase client for server components
    - Support both anon and service role
    - _Requirements: 7.4_
  - [x] 5.3 Create `src/lib/supabase/errors.ts` for error handling
    - Implement handleSupabaseError function
    - Map Postgres error codes to app errors
    - _Requirements: 3.2_

- [x] 6. Create seed data script
  - [x] 6.1 Create `supabase/seed.sql` with test data
    - Insert sample profiles
    - Insert sample bicks with various statuses
    - Insert sample tags and bick_tags
    - _Requirements: 1.3_

- [x] 7. Implement tests
  - [x] 7.1 Create test setup file `tests/setup.ts`
    - Configure Supabase test clients (anon and service role)
    - Implement beforeEach cleanup
  - [x] 7.2 Write schema validation unit tests
    - Verify all tables exist with correct columns
    - Verify all indexes exist
    - Verify all constraints are in place
    - _Requirements: 2.1, 2.4, 3.1, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2_
  - [x] 7.3 Write property test for live status visibility
    - **Property 4: Live Status Visibility**
    - Test bicks, bick_assets, and bick_tags visibility based on status
    - **Validates: Requirements 3.5, 4.3, 6.3**
  - [x] 7.4 Write property test for profile access
    - **Property 1: Profile Public Read Access**
    - **Property 2: Profile Owner-Only Update**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 7.5 Write property test for bick ownership
    - **Property 5: Authenticated Bick Insert Ownership**
    - **Property 6: Bick Owner Update Restriction**
    - **Validates: Requirements 3.6, 3.7**
  - [x] 7.6 Write property test for reports access
    - **Property 8: Reports Insert Allowed**
    - **Property 9: Reports Read Blocked**
    - **Validates: Requirements 7.3, 7.4**
  - [x] 7.7 Write property test for timestamp management
    - **Property 11: Automatic Timestamp Management**
    - Test created_at, updated_at, and published_at auto-setting
    - **Validates: Requirements 9.1, 9.2, 9.3**
  - [x] 7.8 Write property test for full-text search
    - **Property 10: Full-Text Search Relevance**
    - Test search returns matching live bicks
    - **Validates: Requirements 8.3**
  - [x] 7.9 Write unit tests for constraint violations
    - Test duplicate username rejection
    - Test duplicate tag name rejection
    - Test invalid status values rejection
    - Test foreign key enforcement
    - **Property 3: Bick Slug Uniqueness**
    - **Validates: Requirements 3.2**

- [x] 8. Final checkpoint - Verify all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- The migration file (task 2) is the core deliverable - it contains all schema definitions
- TypeScript types (task 4) enable type-safe queries throughout the application
- Tests (task 7) verify RLS policies work correctly before building features on top
- Property tests use fast-check with minimum 100 iterations per test
