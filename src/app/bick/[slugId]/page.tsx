import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getBickBySlugAndId } from '@/lib/supabase/queries';
import { parseSlugId } from '@/lib/utils/url';
import { BickPlayer } from '@/components/bick/BickPlayer';
import { BickJsonLd } from '@/components/bick/BickJsonLd';
import { ProcessingState } from '@/components/bick/ProcessingState';
import { DownloadButton } from '@/components/share/DownloadButton';
import { UniversalShareButton } from '@/components/share/UniversalShareButton';
import { CopyLinkButton } from '@/components/share/CopyLinkButton';
import { TagDisplay } from '@/components/tags/TagDisplay';
import { detectPlatform } from '@/lib/audio/platform';

const DEFAULT_THUMBNAIL = '/brand-thumb.jpg';

interface BickPageProps {
  params: Promise<{ slugId: string }>;
}

export async function generateMetadata({ params }: BickPageProps): Promise<Metadata> {
  const { slugId } = await params;
  const parsed = parseSlugId(slugId);
  if (!parsed) return { title: 'Not Found' };

  const bick = await getBickBySlugAndId(parsed.slug, parsed.id);
  if (!bick) return { title: 'Not Found' };

  const ogImage = bick.assets?.find(a => a.asset_type === 'og_image')?.cdn_url;
  const teaser = bick.assets?.find(a => a.asset_type === 'teaser_mp4')?.cdn_url;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  const canonical = `${baseUrl}/bick/${bick.slug}-${bick.id}`;

  return {
    title: bick.title,
    description: bick.description || `Listen to ${bick.title} on Bickqr`,
    alternates: { canonical },
    openGraph: {
      title: bick.title,
      description: bick.description || `Listen to ${bick.title} on Bickqr`,
      url: canonical,
      type: 'music.song',
      images: ogImage ? [{ url: ogImage }] : [],
      siteName: 'Bickqr',
    },
    twitter: {
      card: teaser ? 'player' : 'summary_large_image',
      title: bick.title,
      description: bick.description || `Listen to ${bick.title} on Bickqr`,
      images: ogImage ? [ogImage] : [],
    },
    robots: bick.status === 'live' ? 'index,follow' : 'noindex,follow',
  };
}

export default async function BickPage({ params }: BickPageProps) {
  const { slugId } = await params;
  const parsed = parseSlugId(slugId);
  if (!parsed) notFound();

  const bick = await getBickBySlugAndId(parsed.slug, parsed.id);
  if (!bick) notFound();

  // Show processing state for non-live bicks
  if (bick.status === 'processing') {
    return <ProcessingState title={bick.title} />;
  }

  // Show failed state
  if (bick.status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-surface rounded-2xl border border-red-500/30 p-8 shadow-2xl shadow-black/50 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Processing Failed</h1>
          <p className="text-gray-400 mb-6">Sorry, we couldn&apos;t process this bick.</p>
          <a href="/upload" className="inline-block px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-red-600 transition-colors">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  const audioAsset = bick.assets?.find(a => a.asset_type === 'audio' || a.asset_type === 'original');
  const ogImage = bick.assets?.find(a => a.asset_type === 'og_image');
  const teaser = bick.assets?.find(a => a.asset_type === 'teaser_mp4');
  const thumbnailAsset = bick.assets?.find(a => a.asset_type === 'thumbnail');
  const thumbnailUrl = thumbnailAsset?.cdn_url || ogImage?.cdn_url || DEFAULT_THUMBNAIL;
  const isDefaultThumbnail = thumbnailUrl === DEFAULT_THUMBNAIL;

  const ownerName = bick.owner?.display_name || bick.owner?.username;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  const canonicalUrl = `${baseUrl}/bick/${bick.slug}-${bick.id}`;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <BickJsonLd bick={bick} audioUrl={audioAsset?.cdn_url} ogImageUrl={ogImage?.cdn_url} />

      {/* Thumbnail */}
      <div className={`relative w-24 h-24 rounded-lg overflow-hidden mb-4 ${isDefaultThumbnail ? 'bg-[#1a1a1a]' : 'bg-gray-800'}`}>
        <Image
          src={thumbnailUrl}
          alt={bick.title}
          fill
          className={isDefaultThumbnail ? "object-contain p-2" : "object-cover"}
          sizes="96px"
          priority
        />
      </div>

      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{bick.title}</h1>

      {ownerName && (
        <p className="text-sm text-gray-400 mb-6">
          by <span className="font-bold text-brand-primary">{ownerName}</span>
        </p>
      )}

      {bick.description && (
        <p className="text-gray-300 mb-8 text-lg leading-relaxed">{bick.description}</p>
      )}

      {/* Tags display */}
      {bick.tags && bick.tags.length > 0 && (
        <div className="mb-8">
          <TagDisplay tags={bick.tags} size="md" showAll />
        </div>
      )}

      {/* Source attribution */}
      {bick.source_url && (
        <div className="mb-8">
          <span className="text-sm text-gray-400">
            gotten from{' '}
            <a
              href={bick.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              {detectPlatform(bick.source_url) || 'source'}
            </a>
          </span>
        </div>
      )}

      {/* Player Card */}
      <div className="bg-surface rounded-2xl border border-surface-border p-8 shadow-2xl shadow-black/50">
        <BickPlayer
          audioUrl={audioAsset?.cdn_url}
          title={bick.title}
          durationMs={bick.duration_ms}
          bickId={bick.id}
        />

        {/* Action Buttons - All 3 with distinct colors */}
        <div className="flex flex-wrap items-center gap-4 mt-8 pt-8 border-t border-surface-border">
          <CopyLinkButton
            url={canonicalUrl}
            className="bg-blue-600 text-white hover:bg-blue-700"
          />
          <DownloadButton
            audioUrl={audioAsset?.cdn_url ?? undefined}
            videoUrl={teaser?.cdn_url ?? undefined}
            title={bick.title}
            className="bg-green-600 text-white hover:bg-green-700"
          />
          <UniversalShareButton
            url={canonicalUrl}
            title={bick.title}
            text={bick.description || undefined}
            videoUrl={teaser?.cdn_url ?? undefined}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 flex items-center gap-8 text-sm text-gray-500 font-medium">
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
          {bick.play_count.toLocaleString()} plays
        </span>
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
          </svg>
          {bick.share_count.toLocaleString()} shares
        </span>
      </div>

      {/* Made with Bickqr */}
      <div className="mt-12 pt-8 border-t border-surface-border flex items-center justify-center gap-2 text-sm text-gray-500">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#EF4444" d="M6 17h3l2-4V7H5v6h3z" />
          <path fill="#FCD34D" d="M14 17h3l2-4V7h-6v6h3z" />
        </svg>
        <span>made with</span>
        <a href="/" className="font-medium hover:underline">
          <span className="text-brand-primary">bick</span><span className="text-brand-accent">qr</span>
        </a>
      </div>

    </div>
  );
}
