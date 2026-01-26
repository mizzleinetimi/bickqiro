import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBickBySlugAndId } from '@/lib/supabase/queries';
import { parseSlugId } from '@/lib/utils/url';
import { BickPlayer } from '@/components/bick/BickPlayer';
import { BickJsonLd } from '@/components/bick/BickJsonLd';

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
  const waveform = bick.assets?.find(a => a.asset_type === 'waveform_json');
  
  // Get owner display name
  const ownerName = bick.owner?.display_name || bick.owner?.username;

  return (
    <div className="max-w-2xl mx-auto">
      <BickJsonLd bick={bick} audioUrl={audioAsset?.cdn_url} ogImageUrl={ogImage?.cdn_url} />
      
      <h1 className="text-3xl font-bold mb-2">{bick.title}</h1>
      
      {ownerName && (
        <p className="text-sm text-gray-500 mb-4">
          by <span className="font-medium text-gray-700">{ownerName}</span>
        </p>
      )}
      
      {bick.description && (
        <p className="text-gray-600 mb-6">{bick.description}</p>
      )}
      
      <BickPlayer 
        audioUrl={audioAsset?.cdn_url}
        title={bick.title}
        durationMs={bick.duration_ms}
      />
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Plays: {bick.play_count.toLocaleString()}</p>
        <p>Shares: {bick.share_count.toLocaleString()}</p>
      </div>

      {/* Asset URLs for testing/debugging */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs font-mono space-y-2">
        <p className="font-bold text-gray-700 mb-2">Generated Assets:</p>
        {teaser?.cdn_url && (
          <div>
            <span className="text-gray-500">Teaser MP4:</span>
            <a href={teaser.cdn_url} target="_blank" rel="noopener" className="ml-2 text-blue-600 hover:underline break-all">
              {teaser.cdn_url}
            </a>
          </div>
        )}
        {ogImage?.cdn_url && (
          <div>
            <span className="text-gray-500">OG Image:</span>
            <a href={ogImage.cdn_url} target="_blank" rel="noopener" className="ml-2 text-blue-600 hover:underline break-all">
              {ogImage.cdn_url}
            </a>
          </div>
        )}
        {waveform?.cdn_url && (
          <div>
            <span className="text-gray-500">Waveform:</span>
            <a href={waveform.cdn_url} target="_blank" rel="noopener" className="ml-2 text-blue-600 hover:underline break-all">
              {waveform.cdn_url}
            </a>
          </div>
        )}
        {audioAsset?.cdn_url && (
          <div>
            <span className="text-gray-500">Audio:</span>
            <a href={audioAsset.cdn_url} target="_blank" rel="noopener" className="ml-2 text-blue-600 hover:underline break-all">
              {audioAsset.cdn_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
