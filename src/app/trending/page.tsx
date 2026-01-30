import type { Metadata } from 'next';
import Link from 'next/link';
import { getTrendingBicksPaginated } from '@/lib/supabase/queries';
import { TrendingResults } from './TrendingResults';
import { PopularTags } from '@/components/tags/PopularTags';

export const metadata: Metadata = {
  title: 'Trending | Bickqr',
  description: 'Discover trending audio clips on Bickqr.',
};

export default async function TrendingPage() {
  const { bicks, nextCursor } = await getTrendingBicksPaginated({ limit: 20 });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-[#FCD34D]">Trending</span> Sounds
          </h1>
          <p className="text-gray-400">The most popular sounds right now.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-[#1a1a1a] text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Latest
          </Link>
          <Link
            href="/trending"
            className="px-4 py-2 rounded-full bg-[#EF4444] text-white text-sm font-medium"
          >
            Trending
          </Link>
        </div>
        
        {/* Popular Tags Section */}
        <PopularTags limit={12} title="Browse by Tag" />
        
        <TrendingResults initialBicks={bicks} initialCursor={nextCursor} />
      </div>
    </div>
  );
}
