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

## 2026-01-25 (night)
- **Goal**: End-to-end upload pipeline testing with real infrastructure
- **Outputs produced**:
  - Configured Cloudflare R2 (bucket: bickqr-uploads, CORS enabled)
  - Configured Railway Redis for BullMQ
  - Fixed worker dotenv loading for .env.local
  - Fixed duration_ms integer rounding in upload-session API
  - Fixed UploadForm redirect to use embed page
- **Result**: Success - full upload pipeline working end-to-end
- **Notes**: Upload → R2 → Supabase → Redis queue → Worker marks bick as live

## 2026-01-25 (late night)
- **Goal**: Fix embed page hydration mismatch and audio playback
- **Outputs produced**:
  - Fixed embed layout (removed duplicate html/body tags)
  - Worker creates bick_assets record with CDN URL
  - BickPlayer now functional with play/pause and progress bar
- **Result**: Full upload-to-playback flow working


## 2026-01-25 (continued)
- **Goal**: Spec 4 - FFmpeg Worker Implementation
- **Outputs produced**:
  - .kiro/specs/ffmpeg-worker/requirements.md, design.md, tasks.md
  - worker/types.ts (ProcessingResult, FFmpegResult, WaveformData, ProcessingError)
  - worker/lib/ffmpeg.ts (runFFmpeg, getAudioDuration, validateAudio)
  - worker/lib/downloader.ts (downloadAudio, cleanupTempFiles)
  - worker/lib/uploader.ts (uploadAsset, generateStorageKey)
  - worker/lib/waveform.ts (generateWaveformJson, extractPeaks)
  - worker/lib/og-image.ts (generateOgImage - 1200x630 PNG with waveform overlay)
  - worker/lib/teaser.ts (generateTeaser - 1280x720 MP4 with animated waveform)
  - worker/processors/bick-processor.ts (full processing pipeline orchestration)
  - tests/worker/*.test.ts (63 tests across 10 files)
  - tests/fixtures/valid-audio.mp3, invalid-audio.txt
- **Result**: Success - all 63 worker tests pass
- **Notes**: Worker generates waveform JSON, OG image, and teaser MP4 for each upload. Uses brand-thumb.jpg as background.

- Added asset URLs display on bick page (teaser MP4, OG image, waveform, audio links)

## 2026-01-25
- Implemented search & trending: full-text search with tsvector, precomputed trending scores with decay formula, worker job on 15-min schedule. 46 tests passing.
- Fixed search RPC function (type mismatch FLOAT→REAL for ts_rank)
- Fixed SearchInput to use client-side navigation (no page reload)

## 2026-01-26
- **Goal**: Spec 5 - User Authentication with Email OTP → Email/Password + Google OAuth
- **Kiro commands used**: @spec (requirements-first workflow), task execution
- **Outputs produced**:
  - .kiro/specs/user-authentication/requirements.md, design.md, tasks.md
  - middleware.ts (session refresh, route protection, OAuth code redirect)
  - src/lib/auth/actions.ts (signUp, signIn, signInWithGoogle, signOut, getUser, getUserProfile)
  - src/lib/auth/profile.ts (generateUsername, ensureUniqueUsername, createProfile, getOrCreateProfile)
  - src/app/auth/callback/route.ts (OAuth code exchange + OTP handler)
  - src/app/auth/sign-in/page.tsx (email/password + Google OAuth)
  - src/components/auth/SignInForm.tsx (Google button + email/password form)
  - src/components/auth/UserMenu.tsx, index.ts
  - src/components/layout/NavShell.tsx (updated with auth state)
  - src/app/my-bicks/page.tsx (user's bicks dashboard)
  - src/app/upload/page.tsx (auth protection added)
  - src/lib/supabase/queries.ts (getUserBicks, BickWithOwner type)
  - src/app/bick/[slugId]/page.tsx (owner attribution display)
  - tests/auth/profile.test.ts, callback.test.ts, my-bicks.test.ts, upload-owner.test.ts
  - tests/components/auth.test.tsx
- **Result**: Success - Google OAuth working, email/password available as fallback
- **Notes**: 
  - Switched from email OTP to email/password + Google OAuth (Supabase email rate limits)
  - Google OAuth is primary sign-in method for dev (no email required)
  - Middleware redirects OAuth codes from root to /auth/callback
  - Auto profile creation on first sign-in with username from email prefix
  - Protected routes redirect to sign-in with `next` param preservation

## 2026-01-26 (continued)
- **Goal**: Fix new bicks not appearing on homepage/trending
- **Issue**: New bicks were marked as `live` but didn't appear on homepage because they had no `trending_scores` entry
- **Outputs produced**:
  - worker/processors/bick-processor.ts (adds initial trending score when bick goes live)
  - src/app/bick/[slugId]/page.tsx (removed unused embedUrl variable)
- **Result**: Success - new bicks now appear immediately on homepage after processing
- **Notes**: 
  - Worker now inserts trending_scores entry with score=0, rank=0 when marking bick as live
  - Trending calculator will recalculate proper scores on next 15-min run
  - Manually ran trending calculator to fix existing bick (9 bicks processed)


## 2026-01-30
- **Goal**: Update header/logo design + infrastructure setup
- **Outputs produced**:
  - src/components/layout/Logo.tsx (new branded logo with stylized quotation marks)
  - src/components/layout/NavShell.tsx (updated header with icons, mobile nav)
  - package.json (added lucide-react, worker script)
  - .env.local (configured R2 credentials, Railway Redis URL)
- **Result**: Success - new logo with animated quotation marks (2 red + 2 yellow outline style)
- **Notes**: 
  - Logo: SVG quotation marks with pulse animation, "Bick" in red, "qr" in yellow
  - Header: Upload/Explore/My Bicks nav with lucide icons, mobile responsive
  - Infrastructure: Cloudflare R2 bucket (bickqr-uploads), Railway Redis connected
  - Worker script added: `npm run worker`


## 2026-01-30
- **Goal**: Update header/logo design + infrastructure setup
- **Outputs produced**:
  - src/components/layout/Logo.tsx (new branded logo with stylized quotation marks)
  - src/components/layout/NavShell.tsx (updated header with icons, mobile nav)
  - Added lucide-react for navigation icons
  - Configured Cloudflare R2 credentials in .env.local
  - Configured Railway Redis URL in .env.local
  - Added `npm run worker` script to package.json
- **Result**: Success - new logo with animated quotation marks (2 red + 2 yellow outline style), "Bick" in red, "qr" in yellow
- **Notes**: 
  - Logo uses SVG for crisp quotation marks with stroke/outline effect
  - Header now has Upload, Explore, My Bicks nav with lucide icons
  - Mobile navigation shows at bottom on smaller screens
  - R2 bucket: bickqr-uploads, Redis via Railway

## 2026-01-30 (continued)
- **Goal**: Add thumbnails to BickCard component
- **Outputs produced**:
  - src/components/bick/BickCard.tsx (redesigned with thumbnail, owner name, download button)
  - src/lib/supabase/queries.ts (updated queries to include owner profile data)
  - src/app/auth/sign-in/page.tsx (refactored with Suspense boundary)
  - src/app/auth/sign-in/SignInContent.tsx (extracted client component)
- **Result**: Success - BickCard now shows thumbnail, owner name, play/share counts, download button
- **Notes**: 
  - Thumbnail priority: thumbnail asset > og_image > default brand-thumb.jpg
  - Owner info now fetched in getLatestBicks, getTopTrendingBicks, and paginated variants
  - Fixed Next.js build error with useSearchParams requiring Suspense boundary

## 2026-01-30 (evening)
- **Goal**: UI polish - search, bick page, branding
- **Outputs produced**:
  - supabase/migrations/0006_saved_bicks.sql (saved bicks feature)
  - supabase/migrations/0007_search_tags.sql (improved search with ILIKE + tag support)
  - src/app/bick/[slugId]/page.tsx (thumbnail, action buttons, "made with bickqr" footer)
  - src/components/share/CopyLinkButton.tsx, DownloadButton.tsx (accept className for color overrides)
  - src/components/bick/BickCard.tsx (removed username display)
  - public/favicon.svg (red/yellow quotation mark favicon)
  - src/app/layout.tsx (updated to use SVG favicon)
  - Deleted src/app/favicon.ico (old Vercel logo)
- **Result**: Success - search now supports partial matching, bick page has thumbnail + branded footer
- **Notes**: 
  - Search uses ILIKE for flexible partial word matching (e.g., "yourself" finds "go f yourself")
  - Bick page action buttons: Copy Link (blue), Download (green), Share (red)
  - Footer shows quotation marks (red left, yellow right) + "bickqr" (red "bick", yellow "qr")
  - Favicon: SVG with red/yellow quotation marks on dark background


## 2026-01-30 (evening)
- **Goal**: UI polish - search, thumbnails, branding
- **Outputs produced**:
  - src/components/bick/BickCard.tsx (removed username display)
  - supabase/migrations/0007_search_tags.sql (ILIKE partial matching + tag search)
  - src/app/bick/[slugId]/page.tsx (thumbnail, reorganized buttons, "made with bickqr" footer)
  - src/components/share/DownloadButton.tsx, CopyLinkButton.tsx (accept className for color overrides)
  - public/favicon.svg (red/yellow quotation mark favicon)
  - src/app/layout.tsx (updated to use SVG favicon)
  - Deleted src/app/favicon.ico (old Vercel logo)
- **Result**: Success - cleaner BickCard, partial search works, branded favicon
- **Notes**: 
  - Search now uses ILIKE for flexible partial word matching (e.g., "yourself" finds "go f yourself")
  - Bick page buttons: Copy Link (blue), Download (green), Share (red)
  - Footer shows quotation mark icon with left quote red, right quote yellow
  - Favicon: SVG with red (#EF4444) and yellow (#FCD34D) quotation marks on dark background
