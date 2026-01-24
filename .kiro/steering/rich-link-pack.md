# Rich Link Pack

## Overview
Generate shareable assets for each bick: waveform OG image, teaser MP4, and embed route.

## 1. Waveform OG Image

### Spec
- Size: 1200x630px (OG standard)
- Format: PNG or WebP
- Content: Waveform visualization + bick title + branding

### Generation Pipeline
1. Extract audio waveform data (FFmpeg or audiowaveform)
2. Render waveform to canvas/SVG
3. Composite with title text and branding
4. Export as PNG
5. Upload to R2, store URL in `bicks.og_image_url`

### Worker Job
```
Job: generate-og-image
Input: { bickId, audioUrl }
Output: { ogImageUrl }
```

## 2. Teaser MP4

### Spec
- Duration: First 3-5 seconds of audio
- Size: 1280x720 or 720x720 (square for social)
- Format: MP4 (H.264 + AAC)
- Content: Waveform animation synced to audio

### Generation Pipeline
1. Extract audio segment (FFmpeg)
2. Generate animated waveform frames
3. Encode video with audio (FFmpeg)
4. Upload to R2, store URL in `bicks.teaser_url`

### Worker Job
```
Job: generate-teaser
Input: { bickId, audioUrl }
Output: { teaserUrl }
```

### FFmpeg Command (Example)
```bash
ffmpeg -i audio.mp3 -t 5 \
  -filter_complex "[0:a]showwaves=s=1280x720:mode=cline:colors=white[v]" \
  -map "[v]" -map 0:a -c:v libx264 -c:a aac \
  -shortest teaser.mp4
```

## 3. Embed Route

### Route: `/embed/bick/[id]`

### Requirements
- Minimal HTML page (fast load)
- Audio/video player only
- No navigation or chrome
- Responsive sizing
- Autoplay support (muted for video)

### Meta Tags for Embed
```html
<meta name="twitter:card" content="player">
<meta name="twitter:player" content="https://bickqr.com/embed/bick/123">
<meta name="twitter:player:width" content="480">
<meta name="twitter:player:height" content="270">
```

### Page Structure
```tsx
// src/app/embed/bick/[id]/page.tsx
export default function EmbedPage({ params }) {
  // Fetch bick data
  // Render minimal player
  // Include og/twitter meta for the embed
}
```

## 4. Meta Tags Implementation

### Bick Page Metadata
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const bick = await getBick(params.id)
  
  return {
    title: `${bick.title} | Bickqr`,
    description: bick.description,
    openGraph: {
      title: bick.title,
      description: bick.description,
      images: [bick.ogImageUrl],
      type: 'music.song',
      url: `https://bickqr.com/bick/${bick.id}`,
    },
    twitter: {
      card: bick.teaserUrl ? 'player' : 'summary_large_image',
      title: bick.title,
      description: bick.description,
      images: [bick.ogImageUrl],
    },
  }
}
```

## Processing Order
1. Upload audio → store in R2
2. Queue `generate-og-image` job
3. Queue `generate-teaser` job
4. Update bick record with asset URLs
5. Set status to `live` when all assets ready
