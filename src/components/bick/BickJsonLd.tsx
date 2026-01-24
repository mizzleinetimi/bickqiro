import type { Bick } from '@/types/database.types';

interface BickJsonLdProps {
  bick: Bick;
  audioUrl?: string | null;
  ogImageUrl?: string | null;
}

function formatIsoDuration(ms: number | null): string {
  if (!ms) return 'PT0S';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `PT${mins}M${secs}S`;
  }
  return `PT${secs}S`;
}

export function BickJsonLd({ bick, audioUrl, ogImageUrl }: BickJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AudioObject',
    name: bick.title,
    description: bick.description || `Listen to ${bick.title} on Bickqr`,
    contentUrl: audioUrl || undefined,
    encodingFormat: 'audio/mpeg',
    duration: formatIsoDuration(bick.duration_ms),
    uploadDate: bick.published_at?.split('T')[0] || bick.created_at.split('T')[0],
    thumbnailUrl: ogImageUrl || undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
