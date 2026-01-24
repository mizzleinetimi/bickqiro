# Rich Links Requirements

## OG Images
- Every bick must have an OG image (waveform cover)

## Video Teasers
- Generate short teaser MP4 for embeds when feasible
- Prefer video teaser for better inline playback across platforms

## Embed Endpoint
- Provide `/embed/bick/:id` for player embeds
- Minimal page with audio/video player

## Metadata Rendering
- Metadata must render on first request
- Do not depend on JS to set meta tags

## Crawler Access
- Do not block crawlers (e.g., Twitterbot) in robots.txt
