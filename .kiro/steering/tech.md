# Technical Architecture

## Technology Stack
- **Frontend/SSR**: Next.js 14+ (App Router, SSR/SSG for SEO)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase Postgres with Row Level Security
- **Storage**: Cloudflare R2 + CDN for media assets
- **Queue**: Redis + BullMQ for async job processing
- **Media Processing**: FFmpeg worker for audio/video generation
- **Styling**: Tailwind CSS (recommended)

## Architecture Overview
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│  Supabase   │     │ Cloudflare  │
│   (SSR/SSG) │     │  Postgres   │     │   R2 + CDN  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       ▲
       ▼                                       │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│ Redis/BullMQ│────▶│   FFmpeg    │
│   Handler   │     │    Queue    │     │   Worker    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Development Environment
- Node.js 20+
- pnpm (recommended) or npm
- Docker for local Redis/Postgres (optional)
- FFmpeg installed locally for worker development
- Supabase CLI for local development

## Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Conventional commits for version control
- Component-based architecture with React Server Components
- API routes for backend logic

## Testing Strategy
- Vitest for unit tests
- Playwright for E2E tests
- Test coverage for critical paths (upload, processing, playback)

## Deployment Process
- Vercel for Next.js frontend (recommended)
- Separate worker deployment (Railway, Fly.io, or container)
- Supabase managed Postgres
- Cloudflare R2 for storage

## Performance Requirements
- Sub-100ms audio playback start
- CDN-cached media assets globally
- SSG for SEO-critical pages
- Efficient queue processing for uploads

## Security Considerations
- Supabase RLS for data access control
- Signed URLs for private uploads
- Input validation on all uploads
- Rate limiting on API routes
