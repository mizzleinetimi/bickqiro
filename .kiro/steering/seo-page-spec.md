# SEO Page Spec

## SSR Metadata Checklist

### Required for All Public Pages
- [ ] `<title>` - Unique, descriptive, <60 chars
- [ ] `<meta name="description">` - Unique, <160 chars
- [ ] `<link rel="canonical" href="...">` - Absolute URL

### Open Graph Tags
- [ ] `og:title`
- [ ] `og:description`
- [ ] `og:image` - Waveform cover for bicks
- [ ] `og:url` - Canonical URL
- [ ] `og:type` - `website` or `music.song` for bicks
- [ ] `og:site_name` - "Bickqr"

### Twitter Card Tags
- [ ] `twitter:card` - `summary_large_image` or `player` for embeds
- [ ] `twitter:title`
- [ ] `twitter:description`
- [ ] `twitter:image`
- [ ] `twitter:player` - For video teaser embeds (if available)

### JSON-LD (Bick Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "AudioObject",
  "name": "Bick title",
  "description": "Bick description",
  "contentUrl": "https://cdn.bickqr.com/audio/...",
  "encodingFormat": "audio/mpeg",
  "duration": "PT0M5S",
  "uploadDate": "2026-01-24",
  "thumbnailUrl": "https://cdn.bickqr.com/og/..."
}
```

## Indexing Rules

### Pages to Index (`index,follow`)
- `/` - Homepage
- `/trending` - Trending page
- `/tag/*` - Tag pages
- `/category/*` - Category pages
- `/bick/*` - Live bick pages only
- `/creator/*` - Creator profiles

### Pages to Noindex (`noindex,follow`)
- `/search*` - Search results
- `/bick/*` where status != `live` (processing/failed/removed/blocked)

### Implementation
```tsx
// In page metadata
export const metadata = {
  robots: isLive ? 'index,follow' : 'noindex,follow'
}
```

## Cache Headers

### Public Pages (Anonymous)
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

### Authenticated/Personalized
```
Cache-Control: private, no-store
```

### Static Assets
```
Cache-Control: public, max-age=31536000, immutable
```

## Sitemap Requirements
- Include only `status=live` bicks
- Include all tags and categories
- Include `<lastmod>` for all entries
- Regenerate on bick publish/unpublish
- Location: `/sitemap.xml`

## robots.txt
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /search

Sitemap: https://bickqr.com/sitemap.xml
```
