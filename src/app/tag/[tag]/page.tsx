import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTagBySlug, getBicksByTag } from '@/lib/supabase/queries';
import { BickCard } from '@/components/bick/BickCard';

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const tag = await getTagBySlug(tagSlug);
  
  if (!tag) return { title: 'Not Found' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bickqr.com';
  const canonical = `${baseUrl}/tag/${tag.slug}`;

  return {
    title: `${tag.name} Sounds`,
    description: `Discover ${tag.bick_count} ${tag.name} sounds on Bickqr. Listen and share short audio clips.`,
    alternates: { canonical },
    openGraph: {
      title: `${tag.name} Sounds | Bickqr`,
      description: `Discover ${tag.bick_count} ${tag.name} sounds on Bickqr.`,
      url: canonical,
      type: 'website',
      siteName: 'Bickqr',
    },
    twitter: {
      card: 'summary',
      title: `${tag.name} Sounds | Bickqr`,
      description: `Discover ${tag.bick_count} ${tag.name} sounds on Bickqr.`,
    },
    robots: 'index,follow',
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag: tagSlug } = await params;
  const { cursor } = await searchParams;
  
  const tag = await getTagBySlug(tagSlug);
  if (!tag) notFound();

  const { bicks, nextCursor } = await getBicksByTag(tagSlug, cursor);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-bold mb-2">
        <span className="text-[#FCD34D]">{tag.name}</span> Sounds
      </h1>
      <p className="text-[#a0a0a0] mb-8">{tag.bick_count} sounds</p>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bicks.map((bick) => (
          <BickCard key={bick.id} bick={bick} />
        ))}
      </div>
      
      {bicks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#a0a0a0] text-lg">No sounds found for this tag.</p>
        </div>
      )}
      
      {nextCursor && (
        <div className="mt-8 text-center">
          <a
            href={`/tag/${tagSlug}?cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-block px-6 py-3 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#f5f5f5] rounded-full border border-[#2a2a2a] transition-colors"
          >
            Load more
          </a>
        </div>
      )}
    </div>
  );
}
