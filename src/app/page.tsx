import Link from 'next/link';
import { getTopTrendingBicks, getLatestBicks } from '@/lib/supabase/queries';
import { BickCard } from '@/components/bick/BickCard';
import { SearchInput } from '@/components/search';
import { PopularTags } from '@/components/tags/PopularTags';

export default async function HomePage() {
  const trendingBicks = await getTopTrendingBicks(12);
  const latestBicks = await getLatestBicks(12);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Explore </span>
            <span className="text-[#FCD34D]">Bicks</span>
          </h1>
          
          <div className="max-w-2xl mx-auto mt-8">
            <SearchInput placeholder="Search for sounds..." />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-[#EF4444] text-white text-sm font-medium"
          >
            Latest
          </Link>
          <Link
            href="/trending"
            className="px-4 py-2 rounded-full bg-[#1a1a1a] text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Trending
          </Link>
        </div>
        
        {/* Bicks Grid */}
        {latestBicks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latestBicks.map((bick) => (
              <BickCard key={bick.id} bick={bick} />
            ))}
          </div>
        ) : trendingBicks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trendingBicks.map((bick) => (
              <BickCard key={bick.id} bick={bick} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              No sounds yet. Be the first to upload!
            </p>
            <Link
              href="/upload"
              className="inline-block mt-4 px-6 py-3 rounded-full bg-[#EF4444] text-white font-medium hover:bg-[#DC2626] transition-colors"
            >
              Upload a Bick
            </Link>
          </div>
        )}
        
        {/* Popular Tags Section */}
        <div className="mt-12">
          <PopularTags limit={12} title="Popular Tags" />
        </div>
      </div>
    </div>
  );
}
