# Project Structure

## Directory Layout
```
bickqr/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (marketing)/     # SEO landing pages
│   │   ├── bick/[id]/       # Individual bick pages
│   │   ├── search/          # Search results
│   │   ├── upload/          # Upload flow
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── ui/              # Base UI components
│   │   ├── bick/            # Bick-specific components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Shared utilities
│   │   ├── supabase/        # Supabase client & queries
│   │   ├── r2/              # Cloudflare R2 utilities
│   │   └── utils/           # General helpers
│   └── types/               # TypeScript types
├── worker/                  # FFmpeg processing worker
│   ├── jobs/                # Job handlers
│   └── lib/                 # Worker utilities
├── public/                  # Static assets
├── tests/                   # Test files
├── docs/                    # Documentation
└── .kiro/                   # Kiro CLI configuration
```

## File Naming Conventions
- Components: PascalCase (`BickPlayer.tsx`)
- Utilities: camelCase (`formatDuration.ts`)
- Pages: kebab-case folders (`bick/[id]/page.tsx`)
- Types: PascalCase with `.types.ts` suffix when separate

## Module Organization
- Co-locate components with their styles and tests
- Shared logic in `lib/` directory
- Database queries in `lib/supabase/`
- API routes handle validation and call lib functions

## Configuration Files
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS
- `tsconfig.json` - TypeScript
- `.env.local` - Environment variables (not committed)

## Documentation Structure
- `README.md` - Project overview and setup
- `DEVLOG.md` - Development timeline and decisions
- `docs/` - Additional documentation

## Build Artifacts
- `.next/` - Next.js build output
- `node_modules/` - Dependencies (gitignored)

## Environment-Specific Files
- `.env.local` - Local development
- `.env.production` - Production (via deployment platform)
- Supabase project per environment
