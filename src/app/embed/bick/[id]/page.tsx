import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBickById } from '@/lib/supabase/queries';
import { BickPlayer } from '@/components/bick/BickPlayer';

interface EmbedPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { id } = await params;
  const bick = await getBickById(id);
  
  if (!bick) return { title: 'Not Found' };

  const ogImage = bick.assets?.find(a => a.asset_type === 'og_image')?.cdn_url;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  const embedUrl = `${baseUrl}/embed/bick/${bick.id}`;

  return {
    title: bick.title,
    description: bick.description || `Listen to ${bick.title}`,
    twitter: {
      card: 'player',
      title: bick.title,
      description: bick.description || `Listen to ${bick.title}`,
      images: ogImage ? [ogImage] : [],
    },
    robots: 'noindex,follow',
  };
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { id } = await params;
  const bick = await getBickById(id);
  
  if (!bick) notFound();

  const audioAsset = bick.assets?.find(a => a.asset_type === 'audio' || a.asset_type === 'original');

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <BickPlayer
          audioUrl={audioAsset?.cdn_url}
          title={bick.title}
          durationMs={bick.duration_ms}
          minimal
        />
      </div>
    </div>
  );
}
