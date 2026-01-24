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
  const embedUrl = `${baseUrl}/embed/bick/${bick.id}`;

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

  return (
    <div className="max-w-2xl mx-auto">
      <BickJsonLd bick={bick} audioUrl={audioAsset?.cdn_url} ogImageUrl={ogImage?.cdn_url} />
      
      <h1 className="text-3xl font-bold mb-4">{bick.title}</h1>
      
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
    </div>
  );
}
