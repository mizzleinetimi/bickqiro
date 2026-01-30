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
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-yellow-to">Bicks</span>
          </h1>
          <p className="text-gray-400 text-lg">Discover trending audio clips and find your next favorite sound.</p>
        </div>

        {/* Filter Bar (Centered like reference) */}
        <div className="flex justify-center mb-12">
          <div className="bg-surface border border-surface-border p-1.5 rounded-2xl flex items-center gap-2">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Latest
            </Link>
            <Link
              href="/trending"
              className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-lg shadow-brand-primary/20"
            >
              🔥 Trending
            </Link>
          </div>
        </div>

        {/* Popular Tags Section */}
        <PopularTags limit={12} title="Browse by Tag" />

        <TrendingResults initialBicks={bicks} initialCursor={nextCursor} />
      </div>
    </div>
  );
}
