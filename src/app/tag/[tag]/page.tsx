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
    <div>
      <h1 className="text-3xl font-bold mb-2">{tag.name}</h1>
      <p className="text-gray-600 mb-6">{tag.bick_count} sounds</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bicks.map((bick) => (
          <BickCard key={bick.id} bick={bick} />
        ))}
      </div>
      
      {bicks.length === 0 && (
        <p className="text-gray-500">No sounds found for this tag.</p>
      )}
      
      {nextCursor && (
        <div className="mt-8 text-center">
          <a
            href={`/tag/${tagSlug}?cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-block px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Load more
          </a>
        </div>
      )}
    </div>
  );
}
