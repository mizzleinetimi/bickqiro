# Performance Budget

## Core Web Vitals Targets

| Metric | Target | Max |
|--------|--------|-----|
| LCP (Largest Contentful Paint) | <1.5s | <2.5s |
| FID (First Input Delay) | <50ms | <100ms |
| CLS (Cumulative Layout Shift) | <0.05 | <0.1 |
| TTFB (Time to First Byte) | <200ms | <400ms |

## Page Load Budgets

### Homepage / Trending
- HTML: <50KB
- JS: <150KB (gzipped)
- CSS: <30KB (gzipped)
- Total: <500KB

### Bick Page
- HTML: <30KB
- JS: <100KB (gzipped)
- CSS: <20KB (gzipped)
- Images: <200KB (OG image lazy-loaded)
- Total: <400KB

## Caching Strategy

### CDN Cache (Cloudflare/Vercel Edge)

| Resource | TTL | Revalidation |
|----------|-----|--------------|
| Static assets (JS/CSS/fonts) | 1 year | Immutable (hashed filenames) |
| OG images | 1 week | On regeneration |
| Audio files | 1 year | Immutable |
| Teaser MP4s | 1 week | On regeneration |
| HTML pages (public) | 60s | stale-while-revalidate: 300s |
| API responses (public) | 60s | stale-while-revalidate: 300s |

### Browser Cache

| Resource | TTL |
|----------|-----|
| Static assets | 1 year |
| Media files | 1 year |
| HTML | No cache (rely on CDN) |

### Cache Bypass
- Authenticated requests
- POST/PUT/DELETE requests
- Requests with `?preview=true`

## What to Measure

### Synthetic Monitoring
- [ ] Lighthouse CI on every deploy
- [ ] WebPageTest weekly baseline
- [ ] Target pages: `/`, `/trending`, `/bick/[sample-id]`

### Real User Monitoring (RUM)
- [ ] Core Web Vitals (via Vercel Analytics or web-vitals)
- [ ] TTFB by region
- [ ] JS errors

### API Performance
- [ ] p50/p95/p99 response times
- [ ] Cache hit ratio
- [ ] Queue processing time (upload → live)

## Lighthouse Targets

| Category | Target |
|----------|--------|
| Performance | >90 |
| Accessibility | >95 |
| Best Practices | >95 |
| SEO | >95 |

## Bundle Analysis
- Run `next build` with `ANALYZE=true`
- Review bundle size on each PR
- Alert if JS bundle grows >10%

## Audio Playback
- Target: <100ms from click to audio start
- Preload: `metadata` by default, `auto` on hover
- Format: MP3 (broad compatibility) or AAC
