import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBickBySlugAndId } from '@/lib/supabase/queries';
import { parseSlugId } from '@/lib/utils/url';
import { BickPlayer } from '@/components/bick/BickPlayer';
import { BickJsonLd } from '@/components/bick/BickJsonLd';
import { SharePanel } from '@/components/share/SharePanel';
import { DownloadButton } from '@/components/share/DownloadButton';
import { UniversalShareButton } from '@/components/share/UniversalShareButton';
import { TagDisplay } from '@/components/tags/TagDisplay';

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

  const audioAsset = bick.assets?.find(a => a.asset_type === 'audio' || a.asset_type === 'original');
  const ogImage = bick.assets?.find(a => a.asset_type === 'og_image');
  const teaser = bick.assets?.find(a => a.asset_type === 'teaser_mp4');
  
  const ownerName = bick.owner?.display_name || bick.owner?.username;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  const canonicalUrl = `${baseUrl}/bick/${bick.slug}-${bick.id}`;

  return (
    <div className="max-w-2xl mx-auto">
      <BickJsonLd bick={bick} audioUrl={audioAsset?.cdn_url} ogImageUrl={ogImage?.cdn_url} />
      
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-2">{bick.title}</h1>
      
      {ownerName && (
        <p className="text-sm text-[#a0a0a0] mb-4">
          by <span className="font-medium text-[#FCD34D]">{ownerName}</span>
        </p>
      )}
      
      {bick.description && (
        <p className="text-[#a0a0a0] mb-6">{bick.description}</p>
      )}
      
      {/* Tags display */}
      {bick.tags && bick.tags.length > 0 && (
        <div className="mb-6">
          <TagDisplay tags={bick.tags} size="md" showAll />
        </div>
      )}
      
      {/* Player Card */}
      <div className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] p-6">
        <BickPlayer 
          audioUrl={audioAsset?.cdn_url}
          title={bick.title}
          durationMs={bick.duration_ms}
          bickId={bick.id}
        />
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-[#2a2a2a]">
          <DownloadButton
            audioUrl={audioAsset?.cdn_url ?? undefined}
            videoUrl={teaser?.cdn_url ?? undefined}
            title={bick.title}
          />
          <UniversalShareButton
            url={canonicalUrl}
            title={bick.title}
            text={bick.description || undefined}
            videoUrl={teaser?.cdn_url ?? undefined}
          />
        </div>
      </div>
      
      {/* Additional Share Options */}
      <SharePanel
        bickId={bick.id}
        bickUrl={canonicalUrl}
        bickTitle={bick.title}
        className="mt-4"
      />
      
      {/* Stats */}
      <div className="mt-6 flex items-center gap-6 text-sm text-[#a0a0a0]">
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          {bick.play_count.toLocaleString()} plays
        </span>
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
          </svg>
          {bick.share_count.toLocaleString()} shares
        </span>
      </div>
    </div>
  );
}
