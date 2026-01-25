# DEVLOG

## 2026-01-24
- Goal: Initialize Bickqr with Kiro QuickStart steering (SEO + performance + scalability).
- Kiro commands used: @quickstart
- Outputs produced: .kiro/steering/product.md, tech.md, structure.md
- Manual edits (and why): None
- Result: Success - all steering docs committed

## 2026-01-24 (afternoon)
- Goal: Add detailed specs for SEO, rich links, and performance
- Kiro commands used: direct file creation requests
- Outputs produced:
  - .kiro/steering/seo.md
  - .kiro/steering/rich-links.md
  - .kiro/steering/performance.md
  - .kiro/steering/seo-page-spec.md (metadata checklist, JSON-LD, indexing rules, cache headers)
  - .kiro/steering/rich-link-pack.md (OG image, teaser MP4, embed route specs)
  - .kiro/steering/perf-budget.md (Core Web Vitals targets, caching strategy, monitoring)
  - .kiro/prompts/devlog-update.md (prompt for future devlog entries)
- Manual edits (and why): None
- Result: Success - comprehensive steering docs for SEO-first architecture

## 2026-01-24 (late afternoon)
- **Goal**: Next.js scaffold + nav shell + placeholder routes
- **Kiro commands used**: @prime, @plan-feature, @execute
- **Outputs produced**:
  - .agents/plans/nextjs-project-scaffold.md (implementation plan)
  - src/app/layout.tsx, page.tsx (root layout with NavShell, homepage with SSR timestamp)
  - src/app/trending/page.tsx, search/page.tsx, upload/page.tsx (placeholder routes)
  - src/components/layout/NavShell.tsx (navigation component)
  - src/lib/utils/index.ts (placeholder)
  - .env.example (Supabase, R2, Redis placeholders)
  - package.json, tsconfig.json, next.config.ts, eslint.config.mjs
- **Manual edits (and why)**: None
- **Result**: Success - npm run lint and npm run build pass, all 4 routes render with nav
- **Notes**: /search has noindex,follow per SEO steering doc. SSR confirmed via server timestamp.

## 2026-01-25
- **Goal**: Spec 1 - Data Model & Supabase Setup
- **Kiro commands used**: @spec (requirements-first workflow)
- **Outputs produced**:
  - .kiro/specs/data-model-supabase/requirements.md
  - .kiro/specs/data-model-supabase/design.md
  - .kiro/specs/data-model-supabase/tasks.md
  - supabase/migrations/0001_init.sql (full schema with RLS)
  - supabase/config.toml, supabase/seed.sql
  - src/lib/supabase/server.ts (server-side clients)
  - src/types/database.types.ts (TypeScript types)
  - tests/schema.test.ts, tests/rls-policies.test.ts, tests/timestamps.test.ts, tests/search.test.ts
  - scripts/verify-db.ts
- **Manual edits (and why)**: None
- **Result**: Success - all tests pass, schema verified against local Supabase
- **Notes**: Tables: profiles, bicks, bick_assets, tags, bick_tags, reports. RLS policies enforce live-only public access.

## 2026-01-25 (afternoon)
- **Goal**: Spec 2 - Public SEO Pages + Implementation
- **Kiro commands used**: @spec (requirements-first workflow), task execution
- **Outputs produced**:
  - .kiro/specs/public-seo-pages/requirements.md, design.md, tasks.md
  - src/app/bick/[slugId]/page.tsx (individual bick pages with OG/Twitter/JSON-LD)
  - src/app/tag/[tag]/page.tsx (tag landing pages with pagination)
  - src/app/embed/bick/[id]/page.tsx + layout.tsx (minimal embed player)
  - src/app/robots.txt/route.ts (dynamic robots.txt)
  - src/app/sitemap.xml/route.ts (dynamic sitemap with live bicks/tags)
  - src/lib/supabase/queries.ts (data fetching functions)
  - src/components/bick/BickCard.tsx, BickPlayer.tsx, BickJsonLd.tsx
  - src/lib/utils/url.ts, duration.ts
  - scripts/seed-test-data.ts
- **Manual edits (and why)**: Created test user in auth.users via SQL Editor (required for FK constraint)
- **Result**: Success - all pages render with correct metadata, sitemap includes live bicks
- **Notes**: Verified in browser: homepage shows trending bicks, bick pages have full SEO metadata (view-source confirms OG tags, JSON-LD). robots.txt blocks /api/ and /search. sitemap.xml lists all live bicks and tags with lastmod.

## 2026-01-25 (evening)
- **Goal**: Spec 3 - Upload Pipeline + Video-to-Audio Extraction
- **Kiro commands used**: @spec (requirements-first workflow), task execution
- **Outputs produced**:
  - .kiro/specs/upload-pipeline/requirements.md, design.md, tasks.md
  - supabase/migrations/0002_upload_pipeline.sql (upload_status enum, source_url, original_duration_ms)
  - src/lib/upload/validation.ts (MIME type, file size, metadata validation)
  - src/lib/upload/slug.ts (URL-safe slug generation)
  - src/lib/r2/client.ts (Cloudflare R2 presigned URLs)
  - src/lib/queue/connection.ts, queues.ts, jobs.ts (BullMQ with lazy init)
  - src/lib/audio/extractor.ts (yt-dlp URL extraction - server-side)
  - src/lib/audio/platform.ts (platform detection - client-safe)
  - src/lib/audio/trimmer.ts (Web Audio API trimming + WAV encoding)
  - src/lib/audio/video-extractor.ts (client-side video-to-audio extraction)
  - src/app/api/bicks/extract-url/route.ts
  - src/app/api/bicks/upload-session/route.ts
  - src/app/api/bicks/[id]/complete/route.ts
  - src/components/upload/FileDropzone.tsx (drag-drop with video support)
  - src/components/upload/UrlExtractor.tsx
  - src/components/upload/WaveformEditor.tsx (wavesurfer.js visualization)
  - src/components/upload/MetadataForm.tsx
  - src/components/upload/UploadForm.tsx (orchestrates full upload flow)
  - worker/index.ts (placeholder BullMQ worker)
  - tests/upload/validation.test.ts, slug.test.ts, duration-enforcement.test.ts
  - tests/audio/trimmer.test.ts, extractor.test.ts
  - tests/api/upload-session.test.ts, validation-errors.test.ts
  - tests/r2/client.test.ts, tests/queue/jobs.test.ts
- **Manual edits (and why)**: None
- **Result**: Success - full upload flow works, video files extract audio client-side
- **Notes**: 
  - Upload flow: file/URL → waveform preview → trim (max 10s) → metadata → R2 upload → job enqueue
  - Video support: MP4, WebM, MOV, AVI, MKV files auto-extract audio via Web Audio API
  - Queue uses lazy initialization to avoid Redis connection at build time
  - 37 validation tests pass including video MIME type acceptance
