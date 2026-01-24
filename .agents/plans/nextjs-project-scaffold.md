# Feature: Next.js Project Scaffold (SEO-First Baseline)

The following plan should be complete, but validate documentation and codebase patterns before implementing.

## Feature Description

Initialize a Next.js 14+ App Router application with TypeScript strict mode, Tailwind CSS, and ESLint. Create a minimal navigation shell with placeholder pages and environment configuration for future Supabase, R2, and Redis integration. Confirm SSR works with a simple server-rendered page.

## User Story

As a developer
I want a properly configured Next.js project with SEO-first architecture
So that I can build Bickqr features on a solid foundation with SSR/SSG support

## Problem Statement

The project currently has only steering documents and no application code. We need a properly configured Next.js foundation that follows the architecture defined in our steering docs.

## Solution Statement

Create a Next.js 14+ App Router project with TypeScript strict mode, Tailwind CSS, and ESLint. Include a navigation shell component, placeholder pages for core routes, and environment variable templates. Verify SSR functionality with a timestamp-rendering page.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Low
**Primary Systems Affected**: Frontend (Next.js)
**Dependencies**: next, react, typescript, tailwindcss, eslint

---

## CONTEXT REFERENCES

### Relevant Steering Documents (MUST READ)

- `.kiro/steering/structure.md` - Directory layout and naming conventions
- `.kiro/steering/tech.md` - Technology stack and code standards
- `.kiro/steering/seo.md` - SSR/SSG requirements for pages
- `.kiro/steering/perf-budget.md` - Performance targets and bundle budgets

### New Files to Create

```
src/
├── app/
│   ├── layout.tsx              # Root layout with nav shell
│   ├── page.tsx                # Homepage (SSR)
│   ├── trending/
│   │   └── page.tsx            # Trending placeholder
│   ├── search/
│   │   └── page.tsx            # Search placeholder
│   └── upload/
│       └── page.tsx            # Upload placeholder
├── components/
│   └── layout/
│       └── NavShell.tsx        # Navigation component
└── lib/
    └── utils/
        └── index.ts            # Utility exports placeholder
```

### Relevant Documentation

- [Next.js App Router Docs](https://nextjs.org/docs/app)
  - Section: Getting Started with App Router
  - Why: Official patterns for layouts, pages, SSR
- [Next.js TypeScript Setup](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
  - Section: Strict Mode configuration
  - Why: Ensure strict TypeScript is properly configured
- [Tailwind CSS + Next.js](https://tailwindcss.com/docs/guides/nextjs)
  - Section: App Router installation
  - Why: Proper Tailwind integration with App Router

### Patterns to Follow

**Directory Structure** (from structure.md):
- Pages in `src/app/` using App Router conventions
- Components in `src/components/` with subdirectories by domain
- Utilities in `src/lib/`

**Naming Conventions** (from structure.md):
- Components: PascalCase (`NavShell.tsx`)
- Utilities: camelCase (`formatDuration.ts`)
- Pages: kebab-case folders (`trending/page.tsx`)

**SSR Requirements** (from seo.md):
- All public pages must be SSR/SSG
- No client-only metadata

---

## IMPLEMENTATION PLAN

### Phase 1: Project Initialization

Create Next.js project with all required tooling configured.

**Tasks:**
- Initialize Next.js with TypeScript, Tailwind, ESLint, App Router
- Configure TypeScript strict mode
- Set up environment variables template

### Phase 2: Navigation Shell

Create the shared layout and navigation component.

**Tasks:**
- Create NavShell component with links to all routes
- Create root layout that includes NavShell
- Style with Tailwind for minimal, clean appearance

### Phase 3: Placeholder Pages

Create all route pages with SSR confirmation.

**Tasks:**
- Homepage with SSR timestamp
- Trending, Search, Upload placeholder pages
- Each page server-rendered (no 'use client')

### Phase 4: Validation

Ensure build passes and app runs correctly.

**Tasks:**
- Run lint and build commands
- Start dev server and verify all pages render
- Confirm SSR by checking page source for server timestamp

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

### Task 1: CREATE Next.js Project

Initialize Next.js 14+ with App Router, TypeScript, Tailwind, ESLint.

```bash
cd /Users/user/bickqiro
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

**GOTCHA**: Use `--no-turbopack` for stability. The `.` installs in current directory.
**GOTCHA**: If prompted about existing files, allow overwrite of config files only.
**VALIDATE**: `ls src/app/page.tsx` - file should exist

### Task 2: UPDATE tsconfig.json for Strict Mode

Ensure TypeScript strict mode is enabled (should be by default, verify).

- **IMPLEMENT**: Verify `"strict": true` is in compilerOptions
- **VALIDATE**: `grep '"strict": true' tsconfig.json`

### Task 3: CREATE .env.example

Create environment template for future integrations.

- **IMPLEMENT**: Create `.env.example` with placeholder variables
- **PATTERN**: Standard Next.js env naming with `NEXT_PUBLIC_` prefix for client vars

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_CDN_URL=

# Redis (BullMQ)
REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**VALIDATE**: `cat .env.example | head -5`

### Task 4: CREATE .env.local from template

Copy template for local development.

```bash
cp .env.example .env.local
```

**VALIDATE**: `ls .env.local`

### Task 5: CREATE NavShell Component

Create navigation component with links to all main routes.

- **IMPLEMENT**: Create `src/components/layout/NavShell.tsx`
- **PATTERN**: Server component (no 'use client'), use Next.js Link

```tsx
// src/components/layout/NavShell.tsx
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/trending', label: 'Trending' },
  { href: '/search', label: 'Search' },
  { href: '/upload', label: 'Upload' },
]

export function NavShell() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Bickqr
          </Link>
          <div className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-600 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

**VALIDATE**: `cat src/components/layout/NavShell.tsx | head -10`

### Task 6: UPDATE Root Layout

Replace default layout with NavShell integration.

- **IMPLEMENT**: Update `src/app/layout.tsx`
- **PATTERN**: Include metadata for SEO baseline

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavShell } from '@/components/layout/NavShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Bickqr - Discover & Share Short Audio Clips',
    template: '%s | Bickqr',
  },
  description: 'SEO-first library of short audio clips. Search trending sounds, play instantly, and share rich links.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavShell />
        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
```

**VALIDATE**: `grep -q "NavShell" src/app/layout.tsx && echo "OK"`

### Task 7: UPDATE Homepage with SSR Timestamp

Replace default page with SSR-verified homepage.

- **IMPLEMENT**: Update `src/app/page.tsx`
- **PATTERN**: Server component with dynamic timestamp to prove SSR

```tsx
// src/app/page.tsx
export default function HomePage() {
  const serverTime = new Date().toISOString()
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to Bickqr</h1>
      <p className="text-gray-600 mb-4">
        Discover and share short audio clips.
      </p>
      <p className="text-sm text-gray-400">
        Server rendered at: {serverTime}
      </p>
    </div>
  )
}
```

**VALIDATE**: `grep -q "serverTime" src/app/page.tsx && echo "OK"`

### Task 8: CREATE Trending Page

Create placeholder trending page.

- **IMPLEMENT**: Create `src/app/trending/page.tsx`

```tsx
// src/app/trending/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trending',
  description: 'Discover trending audio clips on Bickqr.',
}

export default function TrendingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Trending</h1>
      <p className="text-gray-600">Trending bicks will appear here.</p>
    </div>
  )
}
```

**VALIDATE**: `cat src/app/trending/page.tsx | head -5`

### Task 9: CREATE Search Page

Create placeholder search page with noindex meta.

- **IMPLEMENT**: Create `src/app/search/page.tsx`
- **PATTERN**: Search pages are noindex per seo.md

```tsx
// src/app/search/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for audio clips on Bickqr.',
  robots: 'noindex,follow',
}

export default function SearchPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Search</h1>
      <p className="text-gray-600">Search functionality coming soon.</p>
    </div>
  )
}
```

**VALIDATE**: `grep -q "noindex" src/app/search/page.tsx && echo "OK"`

### Task 10: CREATE Upload Page

Create placeholder upload page.

- **IMPLEMENT**: Create `src/app/upload/page.tsx`

```tsx
// src/app/upload/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Upload',
  description: 'Upload your audio clips to Bickqr.',
}

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Upload</h1>
      <p className="text-gray-600">Upload your bicks here.</p>
    </div>
  )
}
```

**VALIDATE**: `cat src/app/upload/page.tsx | head -5`

### Task 11: CREATE lib/utils placeholder

Create utilities directory structure.

- **IMPLEMENT**: Create `src/lib/utils/index.ts`

```ts
// src/lib/utils/index.ts
// Utility functions will be added here
export {}
```

**VALIDATE**: `ls src/lib/utils/index.ts`

### Task 12: UPDATE .gitignore

Ensure .env.local is ignored (should be by default, verify).

- **VALIDATE**: `grep -q ".env.local" .gitignore && echo "OK"`

### Task 13: REMOVE default Next.js boilerplate

Clean up default page content if any remains.

- **IMPLEMENT**: Remove any default SVG imports or boilerplate from pages
- **VALIDATE**: `grep -c "vercel.svg" src/app/page.tsx || echo "Clean"`

---

## TESTING STRATEGY

### Build Validation

The primary test for this scaffold is successful build and lint.

### Manual Verification

1. Start dev server
2. Visit each route (/, /trending, /search, /upload)
3. Verify nav appears on all pages
4. View page source to confirm SSR (server timestamp in HTML)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions.

### Level 1: Syntax & Style

```bash
npm run lint
```

Expected: No errors

### Level 2: Type Checking

```bash
npx tsc --noEmit
```

Expected: No type errors

### Level 3: Build

```bash
npm run build
```

Expected: Build succeeds with no errors

### Level 4: Manual Validation

```bash
npm run dev
```

Then verify:
- [ ] http://localhost:3000 - Homepage with nav and timestamp
- [ ] http://localhost:3000/trending - Trending page with nav
- [ ] http://localhost:3000/search - Search page with nav
- [ ] http://localhost:3000/upload - Upload page with nav
- [ ] View page source on homepage - timestamp should be in HTML (proves SSR)

---

## ACCEPTANCE CRITERIA

- [x] Next.js 14+ with App Router initialized
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS configured and working
- [ ] ESLint configured
- [ ] `.env.example` with Supabase, R2, Redis placeholders
- [ ] NavShell component with Home, Trending, Search, Upload links
- [ ] All 4 pages render with navigation
- [ ] Homepage shows server-rendered timestamp
- [ ] Search page has `noindex` robots meta
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` passes with no errors
- [ ] Dev server runs and all pages accessible
- [ ] SSR confirmed via page source inspection
- [ ] Navigation works on all pages

---

## NOTES

**Design Decisions:**
- Using `src/` directory for cleaner organization per steering docs
- Server components by default (no 'use client') for SSR
- Minimal styling - just enough to verify Tailwind works
- Inter font for clean, modern typography

**Future Considerations:**
- Add loading.tsx and error.tsx for each route group
- Add not-found.tsx for 404 handling
- Consider adding a footer component
- Will need to add Supabase client setup in next feature
