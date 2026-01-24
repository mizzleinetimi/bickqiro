# SEO Requirements

## SSR/SSG Pages
All public pages must be SSR/SSG (no client-only metadata):
- `/` - Homepage
- `/trending` - Trending sounds
- `/tag/*` - Tag pages
- `/category/*` - Category pages
- `/bick/*` - Individual bick pages
- `/creator/*` - Creator profiles (if added)

## Bick Page Requirements
Each bick page must include:
- Canonical URL
- Open Graph tags
- Twitter Card tags
- JSON-LD (AudioObject schema)
- Fast first render

## Indexing Rules
- Search results pages: `noindex,follow`
- Non-live bicks (processing/failed/removed/blocked): `noindex`

## Sitemap & Robots
- Maintain `robots.txt` and `sitemap.xml`
- Sitemap includes only live bicks, tags, categories
- Include `lastmod` for all sitemap entries
