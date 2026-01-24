# Performance Requirements

## CDN Caching
- Cache all anonymous GET responses for public pages/endpoints
- Typical TTL: 60–300s
- Bypass cache for authenticated/personalized views

## Pagination
- Use cursor pagination everywhere (no offset)

## Trending
- Precompute trending via worker job
- Never compute per request

## Media Delivery
- All media served via CDN (R2+CDN URLs)
- API never streams media directly

## Targets
- Fast TTFB
- Minimal CLS
- Strong mobile Lighthouse score
