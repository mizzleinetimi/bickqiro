import type { Metadata } from 'next';
import { getTrendingBicksPaginated } from '@/lib/supabase/queries';
import { TrendingResults } from './TrendingResults';

export const metadata: Metadata = {
  title: 'Trending | Bickqr',
  description: 'Discover trending audio clips on Bickqr.',
};

export default async function TrendingPage() {
  const { bicks, nextCursor } = await getTrendingBicksPaginated({ limit: 20 });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Trending</h1>
      <p className="text-gray-600 mb-6">The most popular sounds right now.</p>
      
      <TrendingResults initialBicks={bicks} initialCursor={nextCursor} />
    </div>
  );
}
